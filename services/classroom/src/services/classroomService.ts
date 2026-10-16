import prisma from "../lib/prisma";
import { getIdentityUser, getIdentityUsersByIds, toAuthorRef } from "../lib/identityClient";
import {
  SUBMISSION_STATUS,
  canStudentEditSubmission,
  normalizePostType,
} from "../lib/submissionStatus";
import { emitClassroomEvent } from "../lib/socketEvents";
import { createClassroomUploadUrl, storageEnabled } from "../lib/storage";
import {
  CLASSROOM_STAFF_ROLES,
  normalizeOrganizationType,
  type OrganizationType,
} from "../lib/organizationTypes";
import {
  buildSectionSubjectCode,
  buildSubjectRoomName,
} from "../lib/sectionSubjectCode";
import { fetchSubjectOfferings } from "../lib/academicClient";

/**
 * Ported from src/server/services/classroomService.ts.
 * - Dropped `subject` / `gradeLevel` includes (Academic-owned) — callers get
 *   plain subjectId/gradeLevelId.
 * - Dropped `ownerTeacher` / `user` / `author` / `student` includes
 *   (Identity-owned) — callers get plain IDs; enrich via the Identity UserRef
 *   pattern (roadmap §4 Phase B) once it lands.
 * - `prisma.user.findUnique` role checks (TEACHER-only assignment) now call
 *   Identity's internal API via identityClient.
 */
export const classroomService = {
  async getClassroomsBySchool(schoolId: string) {
    return prisma.classroom.findMany({
      where: { schoolId },
      include: {
        members: {
          where: { role: { in: [...CLASSROOM_STAFF_ROLES] } },
        },
        _count: { select: { members: true, posts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async createClassroom(data: any) {
    const {
      name,
      bannerColor,
      subjectId,
      gradeLevelId,
      ownerTeacherId,
      schoolId,
      teacherIds,
      assistantIds,
      sourceClassroomId,
      parentClassroomId,
      organizationType: rawOrganizationType,
      propagateSupportStaff,
      sectionSubjectCode,
    } = data;
    const primaryTeacherId = ownerTeacherId;
    const isClassGroup = !subjectId;

    if (!name) throw new Error("Class name is required");
    if (!schoolId) throw new Error("School ID is required");
    if (!primaryTeacherId) throw new Error("Owner teacher ID is required");

    const organizationType = isClassGroup
      ? normalizeOrganizationType(rawOrganizationType, "SELF_CONTAINED")
      : null;

    // Enforce that only users with role "TEACHER" can be assigned as a primary teacher of a classroom
    const primaryTeacher = await getIdentityUser(primaryTeacherId);
    if (!primaryTeacher || primaryTeacher.role !== "TEACHER") {
      throw new Error("Only users with role TEACHER can be primary teachers of a classroom");
    }

    const classroom = await prisma.$transaction(async (tx) => {
      try {
        const classroom = await tx.classroom.create({
          data: {
            name,
            bannerColor: bannerColor || "bg-indigo-600",
            subjectId: subjectId || null,
            gradeLevelId: gradeLevelId || null,
            parentClassroomId: parentClassroomId || (subjectId ? sourceClassroomId || null : null),
            schoolId,
            ownerTeacherId: primaryTeacherId,
            organizationType,
            propagateSupportStaff:
              propagateSupportStaff === undefined || propagateSupportStaff === null
                ? true
                : Boolean(propagateSupportStaff),
            classCode: Math.random().toString(36).substring(2, 9).toUpperCase(),
            sectionSubjectCode: sectionSubjectCode || null,
          },
        });

        await tx.classroomMember.create({
          data: {
            classroomId: classroom.id,
            userId: primaryTeacherId,
            role: "TEACHER",
          },
        });

        const addStaffMembers = async (ids: unknown, role: "CO_TEACHER" | "ASSISTANT") => {
          if (!Array.isArray(ids)) return;
          const unique = [...new Set(ids.filter((id) => id && id !== primaryTeacherId))] as string[];
          for (const staffId of unique) {
            const tUser = await getIdentityUser(staffId);
            if (!tUser || tUser.role !== "TEACHER") {
              throw new Error(
                `Only users with role TEACHER can be assigned to a class. User ${tUser?.name || staffId} is not a teacher.`
              );
            }
          }
          await Promise.all(
            unique.map((id) =>
              tx.classroomMember
                .upsert({
                  where: { classroomId_userId: { classroomId: classroom.id, userId: id } },
                  update: { role },
                  create: { classroomId: classroom.id, userId: id, role },
                })
                .catch((e) => console.error(`Error adding ${role} ${id}:`, e))
            )
          );
        };

        await addStaffMembers(teacherIds, "CO_TEACHER");
        await addStaffMembers(assistantIds, "ASSISTANT");

        if (sourceClassroomId) {
          const sourceMembers = await tx.classroomMember.findMany({
            where: { classroomId: sourceClassroomId, role: "STUDENT" },
          });

          if (sourceMembers.length > 0) {
            await Promise.all(
              sourceMembers.map((m) =>
                tx.classroomMember
                  .create({ data: { classroomId: classroom.id, userId: m.userId, role: "STUDENT" } })
                  .catch((e) => console.error(`Error copying member ${m.userId}:`, e))
              )
            );
          }

          const sourceRoom = await tx.classroom.findUnique({ where: { id: sourceClassroomId } });
          const shouldPropagateStaff =
            sourceRoom?.propagateSupportStaff !== false && Boolean(subjectId);
          if (shouldPropagateStaff) {
            const support = await tx.classroomMember.findMany({
              where: {
                classroomId: sourceClassroomId,
                role: { in: ["CO_TEACHER", "ASSISTANT"] },
              },
            });
            for (const m of support) {
              if (m.userId === primaryTeacherId) continue;
              await tx.classroomMember
                .upsert({
                  where: { classroomId_userId: { classroomId: classroom.id, userId: m.userId } },
                  update: { role: m.role },
                  create: { classroomId: classroom.id, userId: m.userId, role: m.role },
                })
                .catch((e) => console.error(`Error copying support staff ${m.userId}:`, e));
            }
          }
        }

        return classroom;
      } catch (err: any) {
        console.error("Prisma Transaction Error in createClassroom:", err);
        throw err;
      }
    });

    if (isClassGroup && classroom.gradeLevelId) {
      try {
        await this.provisionOfferingsForClassGroup(schoolId, classroom.id);
      } catch (err) {
        console.error("provisionOfferingsForClassGroup failed:", err);
      }
    }

    return classroom;
  },

  async deleteClassroom(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.classroomMember.deleteMany({ where: { classroomId: id } });
      await tx.classroomPost.deleteMany({ where: { classroomId: id } });
      await tx.classroomTopic.deleteMany({ where: { classroomId: id } });
      await tx.classroomMeeting.deleteMany({ where: { classroomId: id } });
      return tx.classroom.delete({ where: { id } });
    });
  },

  async updateClassroom(id: string, data: any) {
    const {
      name,
      bannerColor,
      bannerImageUrl,
      subjectId,
      gradeLevelId,
      ownerTeacherId,
      status,
      parentClassroomId,
      organizationType: rawOrganizationType,
      propagateSupportStaff,
      sectionSubjectCode,
    } = data;

    if (ownerTeacherId) {
      const teacherUser = await getIdentityUser(ownerTeacherId);
      if (!teacherUser || teacherUser.role !== "TEACHER") {
        throw new Error("Only users with role TEACHER can be assigned as a teacher in a class");
      }
    }

    const existing = await prisma.classroom.findUnique({ where: { id } });
    if (!existing) throw new Error("Classroom not found");

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (bannerColor !== undefined) patch.bannerColor = bannerColor;
    if (bannerImageUrl !== undefined) patch.bannerImageUrl = bannerImageUrl;
    if (subjectId !== undefined) patch.subjectId = subjectId;
    if (gradeLevelId !== undefined) patch.gradeLevelId = gradeLevelId;
    if (parentClassroomId !== undefined) patch.parentClassroomId = parentClassroomId;
    if (ownerTeacherId !== undefined) patch.ownerTeacherId = ownerTeacherId;
    if (status !== undefined) patch.status = status;
    if (propagateSupportStaff !== undefined) {
      patch.propagateSupportStaff = Boolean(propagateSupportStaff);
    }
    if (sectionSubjectCode !== undefined) {
      patch.sectionSubjectCode = sectionSubjectCode || null;
    }
    if (rawOrganizationType !== undefined) {
      if (existing.subjectId) {
        throw new Error("organizationType can only be set on class groups");
      }
      const next = normalizeOrganizationType(rawOrganizationType, null);
      if (rawOrganizationType !== null && rawOrganizationType !== "" && !next) {
        throw new Error("organizationType must be SELF_CONTAINED, DEPARTMENTALIZED, or MIXED");
      }
      patch.organizationType = next;
    }

    const updatedClassroom = await prisma.classroom.update({
      where: { id },
      data: patch,
    });

    if (ownerTeacherId) {
      await prisma.classroomMember.upsert({
        where: { classroomId_userId: { classroomId: id, userId: ownerTeacherId } },
        update: { role: "TEACHER" },
        create: { classroomId: id, userId: ownerTeacherId, role: "TEACHER" },
      });
    }

    return updatedClassroom;
  },

  /**
   * Provision or update subject classrooms from grade-level curriculum assignments.
   * Self-contained class groups may omit teacherId (defaults to homeroom teacher).
   * Departmentalized class groups require a specialist teacherId per assignment.
   */
  async syncSubjectRooms(
    schoolId: string,
    assignments: Array<{
      classGroupId: string;
      subjectId: string;
      subjectName?: string;
      subjectCode?: string;
      teacherId?: string;
      gradeLevelId?: string;
    }>
  ) {
    if (!schoolId) throw new Error("School ID is required");
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new Error("assignments array is required");
    }

    const created: any[] = [];
    const updated: any[] = [];
    const skipped: Array<{ classGroupId: string; subjectId: string; reason: string }> = [];

    for (const row of assignments) {
      const classGroupId = String(row.classGroupId || "").trim();
      const subjectId = String(row.subjectId || "").trim();
      let teacherId = String(row.teacherId || "").trim();
      const subjectName = String(row.subjectName || "").trim() || "Subject";

      if (!classGroupId || !subjectId) {
        skipped.push({
          classGroupId,
          subjectId,
          reason: "classGroupId and subjectId are required",
        });
        continue;
      }

      const classGroup = await prisma.classroom.findFirst({
        where: { id: classGroupId, schoolId, subjectId: null },
      });
      if (!classGroup) {
        skipped.push({ classGroupId, subjectId, reason: "Class group not found" });
        continue;
      }

      const orgType = (classGroup.organizationType || "MIXED") as OrganizationType | "MIXED";
      if (!teacherId) {
        if (orgType === "SELF_CONTAINED") {
          teacherId = classGroup.ownerTeacherId;
        } else if (orgType === "DEPARTMENTALIZED") {
          skipped.push({
            classGroupId,
            subjectId,
            reason: "Departmentalized class groups require a specialist teacher per subject",
          });
          continue;
        } else {
          skipped.push({
            classGroupId,
            subjectId,
            reason: "teacherId is required",
          });
          continue;
        }
      }

      const gradeLevelId = row.gradeLevelId || classGroup.gradeLevelId || null;
      const roomName = buildSubjectRoomName(classGroup.name, subjectName);
      const baseSubjectCode = String(row.subjectCode || "").trim();
      let sectionSubjectCode: string | null = null;
      if (baseSubjectCode) {
        try {
          sectionSubjectCode = buildSectionSubjectCode(baseSubjectCode, classGroup.name);
        } catch {
          sectionSubjectCode = null;
        }
      }

      const existing =
        (await prisma.classroom.findFirst({
          where: {
            schoolId,
            parentClassroomId: classGroupId,
            subjectId,
          },
        })) ||
        (await prisma.classroom.findFirst({
          where: {
            schoolId,
            subjectId,
            gradeLevelId: gradeLevelId || undefined,
            name: roomName,
          },
        }));

      if (existing) {
        const patched = await this.updateClassroom(existing.id, {
          ownerTeacherId: teacherId,
          parentClassroomId: classGroupId,
          gradeLevelId,
          name: roomName,
          sectionSubjectCode,
        });
        updated.push(patched);
        continue;
      }

      const room = await this.createClassroom({
        name: roomName,
        subjectId,
        gradeLevelId,
        ownerTeacherId: teacherId,
        schoolId,
        sourceClassroomId: classGroupId,
        parentClassroomId: classGroupId,
        sectionSubjectCode,
      });
      created.push(room);
    }

    return { created, updated, skipped };
  },

  /**
   * When a subject is offered at a grade level, provision subject rooms for every class group.
   */
  async provisionSubjectRoomsForOffering(
    schoolId: string,
    data: {
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      gradeLevelId: string;
    }
  ) {
    const classGroups = await prisma.classroom.findMany({
      where: { schoolId, gradeLevelId: data.gradeLevelId, subjectId: null },
      select: { id: true, name: true, ownerTeacherId: true, organizationType: true },
    });
    if (!classGroups.length) return { created: [], updated: [], skipped: [] };

    const assignments = classGroups.map((cg) => ({
      classGroupId: cg.id,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectCode: data.subjectCode,
      teacherId: cg.ownerTeacherId,
      gradeLevelId: data.gradeLevelId,
    }));
    return this.syncSubjectRooms(schoolId, assignments);
  },

  /**
   * When a class group is created, inherit all grade-level subject offerings as subject rooms.
   */
  async provisionOfferingsForClassGroup(schoolId: string, classGroupId: string) {
    const classGroup = await prisma.classroom.findFirst({
      where: { id: classGroupId, schoolId, subjectId: null },
    });
    if (!classGroup?.gradeLevelId) return { created: [], updated: [], skipped: [] };

    const offerings = await fetchSubjectOfferings(schoolId, classGroup.gradeLevelId);
    const assignments = offerings
      .filter((o) => o.subject?.name)
      .map((o) => ({
        classGroupId,
        subjectId: o.subjectId,
        subjectName: o.subject!.name,
        subjectCode: o.subject!.code || "",
        teacherId: classGroup.ownerTeacherId,
        gradeLevelId: classGroup.gradeLevelId!,
      }));
    if (!assignments.length) return { created: [], updated: [], skipped: [] };
    return this.syncSubjectRooms(schoolId, assignments);
  },

  async backfillParentClassroomIds(schoolId: string) {
    const classGroups = await prisma.classroom.findMany({
      where: { schoolId, subjectId: null },
      select: { id: true, name: true, gradeLevelId: true },
    });
    const subjectRooms = await prisma.classroom.findMany({
      where: { schoolId, subjectId: { not: null }, parentClassroomId: null },
    });

    let linked = 0;
    let unmatched = 0;
    for (const room of subjectRooms) {
      const parent = classGroups.find(
        (g) =>
          room.gradeLevelId &&
          g.gradeLevelId === room.gradeLevelId &&
          room.name.startsWith(`${g.name} - `)
      );
      if (!parent) {
        unmatched += 1;
        continue;
      }
      await prisma.classroom.update({
        where: { id: room.id },
        data: { parentClassroomId: parent.id },
      });
      linked += 1;
    }
    return { linked, unmatched, scanned: subjectRooms.length };
  },

  async offeringSubjectPairs(schoolId: string) {
    const rooms = await prisma.classroom.findMany({
      where: { schoolId, subjectId: { not: null }, gradeLevelId: { not: null } },
      select: { subjectId: true, gradeLevelId: true },
    });
    const seen = new Set<string>();
    const pairs: Array<{ subjectId: string; gradeLevelId: string }> = [];
    for (const r of rooms) {
      if (!r.subjectId || !r.gradeLevelId) continue;
      const key = `${r.subjectId}:${r.gradeLevelId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ subjectId: r.subjectId, gradeLevelId: r.gradeLevelId });
    }
    return pairs;
  },

  async addMember(classroomId: string, userId: string, role: string = "STUDENT") {
    const targetUser = await getIdentityUser(userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if ([...CLASSROOM_STAFF_ROLES].includes(role as any) && targetUser.role !== "TEACHER") {
      throw new Error(`Only users with role TEACHER can be assigned with role ${role} in a classroom.`);
    }

    const member = await prisma.classroomMember.create({
      data: { classroomId, userId, role },
    });

    if (role === "STUDENT") {
      await this.propagateStudentToSubjectRooms(classroomId, userId, "add");
    }

    return member;
  },

  async removeMember(classroomId: string, userId: string) {
    const existing = await prisma.classroomMember.findUnique({
      where: { classroomId_userId: { classroomId, userId } },
    });

    const deleted = await prisma.classroomMember.delete({
      where: { classroomId_userId: { classroomId, userId } },
    });

    if (existing?.role === "STUDENT") {
      await this.propagateStudentToSubjectRooms(classroomId, userId, "remove");
    }

    return deleted;
  },

  /**
   * When a student is added/removed on a class group, mirror that on child subject rooms.
   * No-op for subject classrooms.
   */
  async propagateStudentToSubjectRooms(
    classroomId: string,
    userId: string,
    action: "add" | "remove"
  ) {
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom || classroom.subjectId) return { touched: 0 };

    const children = await prisma.classroom.findMany({
      where: {
        parentClassroomId: classroomId,
        subjectId: { not: null },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    let touched = 0;
    for (const child of children) {
      if (action === "add") {
        await prisma.classroomMember
          .upsert({
            where: { classroomId_userId: { classroomId: child.id, userId } },
            update: { role: "STUDENT" },
            create: { classroomId: child.id, userId, role: "STUDENT" },
          })
          .then(() => {
            touched += 1;
          })
          .catch((e) => console.error(`Error propagating student to ${child.id}:`, e));
      } else {
        const result = await prisma.classroomMember
          .deleteMany({ where: { classroomId: child.id, userId, role: "STUDENT" } })
          .catch((e) => {
            console.error(`Error removing student from ${child.id}:`, e);
            return { count: 0 };
          });
        touched += result.count;
      }
    }
    return { touched };
  },

  /** Idempotent repair: copy all class-group students into linked subject rooms. */
  async propagateRosterToSubjectRooms(classGroupId: string) {
    const classGroup = await prisma.classroom.findUnique({ where: { id: classGroupId } });
    if (!classGroup) throw new Error("Classroom not found");
    if (classGroup.subjectId) {
      throw new Error("Roster propagation only applies to class groups");
    }

    const students = await prisma.classroomMember.findMany({
      where: { classroomId: classGroupId, role: "STUDENT" },
      select: { userId: true },
    });
    const children = await prisma.classroom.findMany({
      where: { parentClassroomId: classGroupId, subjectId: { not: null } },
      select: { id: true },
    });

    let added = 0;
    for (const child of children) {
      for (const s of students) {
        const before = await prisma.classroomMember.findUnique({
          where: { classroomId_userId: { classroomId: child.id, userId: s.userId } },
        });
        await prisma.classroomMember.upsert({
          where: { classroomId_userId: { classroomId: child.id, userId: s.userId } },
          update: { role: "STUDENT" },
          create: { classroomId: child.id, userId: s.userId, role: "STUDENT" },
        });
        if (!before) added += 1;
      }
    }

    return {
      classGroupId,
      subjectRooms: children.length,
      students: students.length,
      membershipsAdded: added,
    };
  },

  async getMembers(classroomId: string, role?: string) {
    const members = await prisma.classroomMember.findMany({
      where: { classroomId, ...(role && { role }) },
      orderBy: { role: "asc" },
    });

    const users = await Promise.all(
      members.map(async (m) => {
        const user = await getIdentityUser(m.userId).catch(() => null);
        return {
          ...m,
          user: user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                photoUrl: user.photoUrl ?? null,
              }
            : { id: m.userId, name: "Unknown", email: "", role: m.role, photoUrl: null },
        };
      })
    );
    return users;
  },

  /** Internal — classrooms where userId holds one of `roles`, used by Academic's examService. */
  async getClassroomsByMember(userId: string, roles: string[], schoolId?: string) {
    return prisma.classroom.findMany({
      where: {
        ...(schoolId && { schoolId }),
        members: { some: { userId, role: { in: roles } } },
      },
      include: {
        _count: { select: { members: true } },
      },
    });
  },

  async getClassroomsOwnedByTeacher(schoolId: string, ownerTeacherId: string) {
    return prisma.classroom.findMany({
      where: { schoolId, ownerTeacherId },
      include: {
        members: {
          where: { role: { in: [...CLASSROOM_STAFF_ROLES] } },
        },
        _count: { select: { members: true, posts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async enrichPosts<T extends { authorId: string }>(posts: T[]) {
    const users = await getIdentityUsersByIds(posts.map((p) => p.authorId));
    return posts.map((p) => ({
      ...p,
      author: toAuthorRef(users.get(p.authorId), p.authorId),
    }));
  },

  async getPosts(classroomId: string) {
    const posts = await prisma.classroomPost.findMany({
      where: { classroomId },
      include: {
        topic: true,
        attachments: true,
        _count: { select: { comments: true, submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return this.enrichPosts(posts);
  },

  async createPost(classroomId: string, authorId: string, data: any) {
    const { type, title, body, topicId, maxPoints, dueAt } = data;
    const post = await prisma.classroomPost.create({
      data: {
        classroomId,
        authorId,
        type: normalizePostType(type),
        title,
        body,
        topicId: topicId || null,
        maxPoints: maxPoints != null && maxPoints !== "" ? parseFloat(maxPoints) : null,
        dueAt: dueAt ? new Date(dueAt) : null,
      },
      include: {
        topic: true,
        attachments: true,
        _count: { select: { comments: true, submissions: true } },
      },
    });
    const [enriched] = await this.enrichPosts([post]);
    emitClassroomEvent(classroomId, "post.created", { post: { id: enriched.id, type: enriched.type } });
    return enriched;
  },

  async findPostById(postId: string) {
    return prisma.classroomPost.findUnique({
      where: { id: postId },
      include: {
        classroom: { select: { id: true, schoolId: true, ownerTeacherId: true } },
        topic: true,
        attachments: true,
        _count: { select: { comments: true, submissions: true } },
      },
    });
  },

  async getPostDetail(
    postId: string,
    viewer: { id: string; role: string; isStaff: boolean; asStudentId?: string | null }
  ) {
    const post = await this.findPostById(postId);
    if (!post) return null;

    const [enriched] = await this.enrichPosts([post]);
    const membership = await prisma.classroomMember.findUnique({
      where: { classroomId_userId: { classroomId: post.classroomId, userId: viewer.id } },
    });

    const comments = await this.getComments(postId);

    if (viewer.isStaff) {
      const submissions = await prisma.submission.findMany({
        where: { postId },
        include: { attachments: true },
        orderBy: { updatedAt: "desc" },
      });
      const users = await getIdentityUsersByIds(submissions.map((s) => s.studentId));
      return {
        ...enriched,
        comments,
        mySubmission: null,
        submissions: submissions.map((s) => ({
          ...s,
          student: toAuthorRef(users.get(s.studentId), s.studentId),
        })),
        membershipRole: membership?.role ?? null,
      };
    }

    const studentId = viewer.asStudentId || viewer.id;
    const mySubmission = await prisma.submission.findFirst({
      where: { postId, studentId },
      include: { attachments: true },
      orderBy: { updatedAt: "desc" },
    });

    return {
      ...enriched,
      comments,
      mySubmission,
      submissions: [],
      membershipRole: membership?.role ?? null,
      viewingAsStudentId: viewer.asStudentId || null,
    };
  },

  async updatePost(postId: string, data: { title?: string; body?: string; maxPoints?: number | null; dueAt?: string | null; topicId?: string | null }) {
    const updated = await prisma.classroomPost.update({
      where: { id: postId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.maxPoints !== undefined && {
          maxPoints: data.maxPoints == null ? null : parseFloat(String(data.maxPoints)),
        }),
        ...(data.dueAt !== undefined && { dueAt: data.dueAt ? new Date(data.dueAt) : null }),
        ...(data.topicId !== undefined && { topicId: data.topicId }),
      },
      include: {
        _count: { select: { comments: true, submissions: true } },
      },
    });
    const [enriched] = await this.enrichPosts([updated]);
    return enriched;
  },

  async deletePost(postId: string) {
    await prisma.$transaction(async (tx) => {
      const submissions = await tx.submission.findMany({ where: { postId }, select: { id: true } });
      const submissionIds = submissions.map((s) => s.id);
      if (submissionIds.length) {
        await tx.submissionAttachment.deleteMany({ where: { submissionId: { in: submissionIds } } });
        await tx.submission.deleteMany({ where: { postId } });
      }
      await tx.postComment.deleteMany({ where: { postId } });
      await tx.postAttachment.deleteMany({ where: { postId } });
      await tx.classroomPost.delete({ where: { id: postId } });
    });
    return { success: true };
  },

  async submitWork(postId: string, studentId: string, textResponse: string | null | undefined) {
    const post = await this.findPostById(postId);
    if (!post) throw new Error("Post not found");
    if (post.type !== "ASSIGNMENT") throw new Error("Only assignments accept submissions");

    const member = await prisma.classroomMember.findUnique({
      where: { classroomId_userId: { classroomId: post.classroomId, userId: studentId } },
    });
    if (!member || member.role !== "STUDENT") {
      throw new Error("Only student members can submit work");
    }

    const existing = await prisma.submission.findFirst({
      where: { postId, studentId },
      orderBy: { updatedAt: "desc" },
    });

    if (existing && !canStudentEditSubmission(existing.status)) {
      throw new Error("This submission was returned. Ask your teacher to reopen it.");
    }

    if (existing) {
      const updated = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          textResponse: textResponse ?? existing.textResponse,
          status: SUBMISSION_STATUS.SUBMITTED,
          submittedAt: new Date(),
          grade: null,
          feedback: null,
          returnedAt: null,
        },
      });
      emitClassroomEvent(post.classroomId, "submission.updated", {
        postId,
        submissionId: updated.id,
        status: updated.status,
      });
      return updated;
    }

    const created = await prisma.submission.create({
      data: {
        postId,
        studentId,
        textResponse: textResponse ?? null,
        status: SUBMISSION_STATUS.SUBMITTED,
        submittedAt: new Date(),
      },
    });
    emitClassroomEvent(post.classroomId, "submission.updated", {
      postId,
      submissionId: created.id,
      status: created.status,
    });
    return created;
  },

  async findSubmissionById(submissionId: string) {
    return prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        post: {
          include: {
            classroom: { select: { id: true, schoolId: true, ownerTeacherId: true } },
          },
        },
      },
    });
  },

  async updateSubmissionAsStudent(
    submissionId: string,
    studentId: string,
    textResponse: string | null | undefined
  ) {
    const submission = await this.findSubmissionById(submissionId);
    if (!submission) throw new Error("Submission not found");
    if (submission.studentId !== studentId) throw new Error("Unauthorized");
    if (!canStudentEditSubmission(submission.status)) {
      throw new Error("This submission was returned. Ask your teacher to reopen it.");
    }

    return prisma.submission.update({
      where: { id: submissionId },
      data: {
        textResponse: textResponse ?? submission.textResponse,
        status: SUBMISSION_STATUS.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  },

  async returnSubmission(
    submissionId: string,
    data: { grade?: number | null; feedback?: string | null }
  ) {
    const submission = await this.findSubmissionById(submissionId);
    if (!submission) throw new Error("Submission not found");

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade: data.grade == null || data.grade === ("" as any) ? null : parseFloat(String(data.grade)),
        feedback: data.feedback ?? submission.feedback,
        status: SUBMISSION_STATUS.RETURNED,
        returnedAt: new Date(),
      },
    });
    emitClassroomEvent(submission.post.classroomId, "submission.updated", {
      postId: submission.postId,
      submissionId: updated.id,
      status: updated.status,
    });
    return updated;
  },

  async reopenSubmission(submissionId: string) {
    const submission = await this.findSubmissionById(submissionId);
    if (!submission) throw new Error("Submission not found");

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SUBMISSION_STATUS.REOPENED,
        returnedAt: null,
      },
    });
    emitClassroomEvent(submission.post.classroomId, "submission.updated", {
      postId: submission.postId,
      submissionId: updated.id,
      status: updated.status,
    });
    return updated;
  },

  async getGrades(classroomId: string, viewer?: { id: string; studentOnly: boolean }) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        members: { where: { role: "STUDENT" } },
        posts: {
          where: { type: "ASSIGNMENT" },
          include: {
            submissions: {
              select: {
                id: true,
                studentId: true,
                grade: true,
                status: true,
                feedback: true,
                submittedAt: true,
                returnedAt: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!classroom) return null;

    let studentIds = classroom.members.map((m) => m.userId);
    if (viewer?.studentOnly) {
      studentIds = studentIds.filter((id) => id === viewer.id);
    }

    const users = await getIdentityUsersByIds(studentIds);
    const students = studentIds.map((id) => ({
      id,
      name: users.get(id)?.name || "Unknown",
      email: users.get(id)?.email || "",
      photoUrl: users.get(id)?.photoUrl ?? null,
    }));

    const assignments = classroom.posts.map((p) => ({
      id: p.id,
      title: p.title,
      maxPoints: p.maxPoints,
      dueAt: p.dueAt,
      submissions: viewer?.studentOnly
        ? p.submissions.filter((s) => s.studentId === viewer.id)
        : p.submissions,
    }));

    return { students, assignments };
  },

  async joinClassroom(_userId: string, _classCode: string) {
    throw new Error(
      "Students are placed in classes by your school during admission or enrollment. Class codes are not used."
    );
  },

  async getUserClassrooms(userId: string, schoolId: string, asStudentId?: string) {
    const memberId = asStudentId || userId;
    return prisma.classroom.findMany({
      where: {
        schoolId,
        members: { some: { userId: memberId } },
      },
      include: {
        members: { where: { role: { in: [...CLASSROOM_STAFF_ROLES] } } },
        _count: { select: { members: true, posts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getClassroomById(id: string) {
    return prisma.classroom.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, posts: true } },
      },
    });
  },

  async findById(id: string) {
    return prisma.classroom.findUnique({ where: { id } });
  },

  async findByIdWithUserMembership(id: string, userId: string) {
    return prisma.classroom.findUnique({
      where: { id },
      include: { members: { where: { userId } } },
    });
  },

  async memberExists(classroomId: string, userId: string) {
    return prisma.classroomMember.findUnique({
      where: { classroomId_userId: { classroomId, userId } },
    });
  },

  // --- Topics ---
  async listTopics(classroomId: string) {
    return prisma.classroomTopic.findMany({
      where: { classroomId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  },

  async createTopic(classroomId: string, title: string, order?: number) {
    const max = await prisma.classroomTopic.aggregate({
      where: { classroomId },
      _max: { order: true },
    });
    return prisma.classroomTopic.create({
      data: {
        classroomId,
        title: title.trim() || "Untitled topic",
        order: order ?? (max._max.order ?? 0) + 1,
      },
    });
  },

  async updateTopic(topicId: string, data: { title?: string; order?: number }) {
    return prisma.classroomTopic.update({
      where: { id: topicId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() || "Untitled topic" }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  },

  async deleteTopic(topicId: string) {
    await prisma.classroomPost.updateMany({ where: { topicId }, data: { topicId: null } });
    await prisma.classroomTopic.delete({ where: { id: topicId } });
    return { success: true };
  },

  async findTopicById(topicId: string) {
    return prisma.classroomTopic.findUnique({
      where: { id: topicId },
      include: { classroom: { select: { id: true, schoolId: true, ownerTeacherId: true } } },
    });
  },

  // --- Comments ---
  async getComments(postId: string) {
    const comments = await prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
    });
    const users = await getIdentityUsersByIds(comments.map((c) => c.authorId));
    return comments.map((c) => ({
      ...c,
      author: toAuthorRef(users.get(c.authorId), c.authorId),
    }));
  },

  async createComment(
    postId: string,
    authorId: string,
    body: string,
    parentCommentId?: string | null
  ) {
    const post = await this.findPostById(postId);
    if (!post) throw new Error("Post not found");
    if (!body?.trim()) throw new Error("Comment body is required");

    const comment = await prisma.postComment.create({
      data: {
        postId,
        authorId,
        body: body.trim(),
        parentCommentId: parentCommentId || null,
      },
    });
    const user = await getIdentityUser(authorId);
    const enriched = { ...comment, author: toAuthorRef(user, authorId) };
    emitClassroomEvent(post.classroomId, "comment.created", {
      postId,
      comment: { id: comment.id, authorId },
    });
    return enriched;
  },

  async deleteComment(commentId: string) {
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      include: { post: { select: { classroomId: true } } },
    });
    if (!comment) throw new Error("Comment not found");
    await prisma.postComment.deleteMany({ where: { parentCommentId: commentId } });
    await prisma.postComment.delete({ where: { id: commentId } });
    emitClassroomEvent(comment.post.classroomId, "comment.deleted", {
      postId: comment.postId,
      commentId,
    });
    return { success: true };
  },

  async findCommentById(commentId: string) {
    return prisma.postComment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: { classroom: { select: { id: true, schoolId: true, ownerTeacherId: true } } },
        },
      },
    });
  },

  // --- Attachments ---
  async addPostAttachment(postId: string, fileUrl: string, fileType: string) {
    if (!fileUrl?.trim()) throw new Error("fileUrl is required");
    const post = await this.findPostById(postId);
    if (!post) throw new Error("Post not found");
    return prisma.postAttachment.create({
      data: {
        postId,
        fileUrl: fileUrl.trim(),
        fileType: fileType || "application/octet-stream",
      },
    });
  },

  async addSubmissionAttachment(submissionId: string, fileUrl: string) {
    if (!fileUrl?.trim()) throw new Error("fileUrl is required");
    return prisma.submissionAttachment.create({
      data: { submissionId, fileUrl: fileUrl.trim() },
    });
  },

  async presignClassroomUpload(opts: {
    schoolId: string;
    classroomId: string;
    fileName: string;
    mimeType: string;
  }) {
    return {
      ...(await createClassroomUploadUrl(opts)),
      storageEnabled: storageEnabled(),
    };
  },

  /** Internal — usage counts for Academic delete guards. */
  async countBySubjectId(subjectId: string) {
    return prisma.classroom.count({ where: { subjectId } });
  },

  async countByGradeLevelId(gradeLevelId: string) {
    return prisma.classroom.count({ where: { gradeLevelId } });
  },

  async countBySchoolId(schoolId: string) {
    return prisma.classroom.count({ where: { schoolId } });
  },
};
