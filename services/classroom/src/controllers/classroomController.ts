import type { Response } from "express";
import { classroomService } from "../services/classroomService";
import { assertParentOfStudent } from "../lib/identityClient";
import {
  canManageClassroomMembership,
  isClassroomStaffMemberRole,
} from "../lib/membershipPermissions";

function isStaffRole(role: string) {
  return ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"].includes(role);
}

async function resolveClassroomStaff(classroomId: string, user: { id: string; role: string }) {
  const membership = await classroomService.findByIdWithUserMembership(classroomId, user.id);
  const isStaff =
    membership?.members.some((m) => isClassroomStaffMemberRole(m.role)) ||
    membership?.ownerTeacherId === user.id ||
    isStaffRole(user.role);
  return { membership, isStaff: !!isStaff };
}

async function canViewClassroom(
  classroomId: string,
  user: { id: string; role: string },
  studentId?: string | null
) {
  const { membership, isStaff } = await resolveClassroomStaff(classroomId, user);
  if (isStaff || membership?.members.length) return { ok: true, isStaff, asStudentId: null as string | null };

  if (user.role === "PARENT" && studentId) {
    const linked = await assertParentOfStudent(user.id, studentId);
    if (!linked) return { ok: false, isStaff: false, asStudentId: null };
    const childMember = await classroomService.memberExists(classroomId, studentId);
    if (!childMember) return { ok: false, isStaff: false, asStudentId: null };
    return { ok: true, isStaff: false, asStudentId: studentId };
  }
  return { ok: false, isStaff: false, asStudentId: null };
}

const FULL_CLASSROOM_LIST_ROLES = new Set([
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
]);

/** Ported verbatim from src/server/controllers/classroomController.ts */
export const classroomController = {
  async getClassroomsBySchool(req: any, res: Response) {
    const { schoolId } = req.params;
    const studentId = (req.query.studentId as string) || null;
    try {
      if (FULL_CLASSROOM_LIST_ROLES.has(req.user.role)) {
        const classrooms = await classroomService.getClassroomsBySchool(schoolId);
        return res.json(classrooms);
      }

      if (req.user.role === "PARENT") {
        if (!studentId) {
          return res.status(400).json({ error: "studentId is required for parent classroom list" });
        }
        const linked = await assertParentOfStudent(req.user.id, studentId);
        if (!linked) return res.status(403).json({ error: "Unauthorized" });
        const classrooms = await classroomService.getClassroomsByMember(
          studentId,
          ["STUDENT"],
          schoolId
        );
        return res.json(classrooms);
      }

      if (req.user.role === "STUDENT") {
        const classrooms = await classroomService.getClassroomsByMember(
          req.user.id,
          ["STUDENT"],
          schoolId
        );
        return res.json(classrooms);
      }

      // Teachers only see rooms where they are assigned as a teacher or co-teacher.
      const [asMember, owned] = await Promise.all([
        classroomService.getClassroomsByMember(
          req.user.id,
          ["TEACHER", "CO_TEACHER"],
          schoolId
        ),
        classroomService.getClassroomsOwnedByTeacher(schoolId, req.user.id),
      ]);
      const byId = new Map<string, any>();
      for (const c of [...asMember, ...owned]) byId.set(c.id, c);
      res.json([...byId.values()]);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch classrooms" });
    }
  },

  async createClassroom(req: any, res: Response) {
    const { schoolId } = req.params;
    const {
      name,
      bannerColor,
      subjectId,
      gradeLevelId,
      ownerTeacherId,
      teacherIds,
      assistantIds,
      sourceClassroomId,
      parentClassroomId,
      organizationType,
      propagateSupportStaff,
    } = req.body;

    if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const primaryTeacherId = ownerTeacherId || req.user.id;
      const classroom = await classroomService.createClassroom({
        name,
        bannerColor,
        subjectId,
        gradeLevelId,
        ownerTeacherId: primaryTeacherId,
        schoolId,
        teacherIds,
        assistantIds,
        sourceClassroomId,
        parentClassroomId,
        organizationType,
        propagateSupportStaff,
      });
      res.json(classroom);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create classroom" });
    }
  },

  async syncSubjectRooms(req: any, res: Response) {
    const { schoolId } = req.params;
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const result = await classroomService.syncSubjectRooms(schoolId, req.body?.assignments || []);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to sync subject rooms" });
    }
  },

  async syncSubjectRoomsInternal(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const result = await classroomService.syncSubjectRooms(schoolId, req.body?.assignments || []);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to sync subject rooms" });
    }
  },

  async provisionOfferingInternal(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const { subjectId, subjectName, subjectCode, gradeLevelId } = req.body || {};
      const result = await classroomService.provisionSubjectRoomsForOffering(schoolId, {
        subjectId,
        subjectName,
        subjectCode,
        gradeLevelId,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to provision subject rooms" });
    }
  },

  async backfillParentLinks(req: any, res: Response) {
    const { schoolId } = req.params;
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const result = await classroomService.backfillParentClassroomIds(schoolId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Backfill failed" });
    }
  },

  async offeringPairs(req: any, res: Response) {
    const { schoolId } = req.params;
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const pairs = await classroomService.offeringSubjectPairs(schoolId);
      res.json({ pairs });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to infer offering pairs" });
    }
  },

  async updateClassroom(req: any, res: Response) {
    const { id } = req.params;
    const {
      name,
      bannerColor,
      bannerImageUrl,
      subjectId,
      gradeLevelId,
      ownerTeacherId,
      status,
      parentClassroomId,
      organizationType,
      propagateSupportStaff,
    } = req.body;

    try {
      const classroom = await classroomService.findById(id);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      if (req.user.schoolId !== classroom.schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const isAdmin = [
        "SUPER_ADMIN",
        "SCHOOL_ADMIN",
        "PRINCIPAL",
        "REGISTRAR",
        "VPI",
        "VPA",
      ].includes(req.user.role);
      const isOwner = req.user.id === classroom.ownerTeacherId;

      let isTeacherMember = false;
      if (!isAdmin && !isOwner) {
        const membership = await classroomService.findByIdWithUserMembership(id, req.user.id);
        isTeacherMember = Boolean(
          membership?.members.some((m) => isClassroomStaffMemberRole(m.role))
        );
        if (!isTeacherMember) {
          return res.status(403).json({ error: "Unauthorized" });
        }
      }

      // Co-teachers / assistants may only change banner appearance.
      const payload =
        !isAdmin && !isOwner && isTeacherMember
          ? { bannerColor, bannerImageUrl }
          : {
              name,
              bannerColor,
              bannerImageUrl,
              subjectId,
              gradeLevelId,
              ownerTeacherId,
              status,
              parentClassroomId,
              organizationType,
              propagateSupportStaff,
            };

      const updatedClassroom = await classroomService.updateClassroom(id, payload);
      res.json(updatedClassroom);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update classroom" });
    }
  },

  async propagateRoster(req: any, res: Response) {
    const { id: classroomId } = req.params;
    try {
      const classroom = await classroomService.findById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      if (req.user.schoolId !== classroom.schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!canManageClassroomMembership(req.user.role)) {
        return res.status(403).json({
          error: "Only school staff can sync class group rosters to subject rooms",
        });
      }

      const result = await classroomService.propagateRosterToSubjectRooms(classroomId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to propagate roster" });
    }
  },

  async addMember(req: any, res: Response) {
    const { id: classroomId } = req.params;
    const { userId, role } = req.body;

    try {
      const classroom = await classroomService.findById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      if (req.user.schoolId !== classroom.schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Teachers (owner / co-teacher) may view the roster only — staff place members.
      if (!canManageClassroomMembership(req.user.role)) {
        return res.status(403).json({
          error: "Only school staff can add students or co-teachers to a class",
        });
      }

      const member = await classroomService.addMember(classroomId, userId, role);
      res.json(member);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to add member" });
    }
  },

  async addMembersBulk(req: any, res: Response) {
    const { id: classroomId } = req.params;
    const { userIds, role } = req.body || {};
    if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > 200) {
      return res.status(400).json({ error: "userIds must contain between 1 and 200 IDs" });
    }
    if (userIds.some((id: unknown) => typeof id !== "string" || !id.trim())) {
      return res.status(400).json({ error: "userIds must contain non-empty strings" });
    }
    if (role !== "STUDENT") {
      return res.status(400).json({ error: "Only STUDENT members can be bulk assigned" });
    }

    try {
      const classroom = await classroomService.findById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      if (req.user.schoolId !== classroom.schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      if (!canManageClassroomMembership(req.user.role)) {
        return res.status(403).json({ error: "Only school staff can add students to a class" });
      }

      const results = await classroomService.addMembersBulk(
        classroomId,
        classroom.schoolId,
        userIds
      );
      return res.json({
        results,
        succeeded: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to add members" });
    }
  },

  async removeMember(req: any, res: Response) {
    const { id: classroomId, userId } = req.params;
    try {
      const classroom = await classroomService.findById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      if (req.user.schoolId !== classroom.schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!canManageClassroomMembership(req.user.role)) {
        return res.status(403).json({
          error: "Only school staff can remove members from a class",
        });
      }

      await classroomService.removeMember(classroomId, userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove member" });
    }
  },

  async getMembers(req: any, res: Response) {
    const { id: classroomId } = req.params;
    const studentId = (req.query.studentId as string) || null;
    try {
      const access = await canViewClassroom(classroomId, req.user, studentId);
      if (!access.ok) return res.status(403).json({ error: "Unauthorized" });
      const members = await classroomService.getMembers(classroomId);
      res.json(members);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  },

  async getPosts(req: any, res: Response) {
    const { id: classroomId } = req.params;
    const studentId = (req.query.studentId as string) || null;
    try {
      const access = await canViewClassroom(classroomId, req.user, studentId);
      if (!access.ok) return res.status(403).json({ error: "Unauthorized" });
      const posts = await classroomService.getPosts(classroomId);
      res.json(posts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  },

  async createPost(req: any, res: Response) {
    const { id: classroomId } = req.params;
    const { type, title, body, topicId, maxPoints, dueAt } = req.body;

    try {
      const classroom = await classroomService.findByIdWithUserMembership(classroomId, req.user.id);

      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      const isTeacher =
        classroom.members.some((m) => isClassroomStaffMemberRole(m.role)) ||
        ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role);

      if (!isTeacher && type !== "ANNOUNCEMENT") {
        return res.status(403).json({ error: "Only teachers can create assignments/materials" });
      }

      if (!isTeacher && type === "ANNOUNCEMENT" && req.user.role === "STUDENT") {
        // Students may post announcements only if they are members (already checked via membership empty?)
        if (!classroom.members.length) {
          return res.status(403).json({ error: "You are not a member of this classroom" });
        }
      }

      const post = await classroomService.createPost(classroomId, req.user.id, {
        type, title, body, topicId, maxPoints, dueAt,
      });
      res.json(post);
    } catch (err) {
      res.status(500).json({ error: "Failed to create post" });
    }
  },

  async getPostById(req: any, res: Response) {
    const { id: postId } = req.params;
    const studentId = (req.query.studentId as string) || null;
    try {
      const post = await classroomService.findPostById(postId);
      if (!post) return res.status(404).json({ error: "Post not found" });

      const access = await canViewClassroom(post.classroomId, req.user, studentId);
      if (!access.ok) return res.status(403).json({ error: "Unauthorized" });

      const detail = await classroomService.getPostDetail(postId, {
        id: req.user.id,
        role: req.user.role,
        isStaff: access.isStaff,
        asStudentId: access.asStudentId,
      });
      res.json(detail);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  },

  async updatePost(req: any, res: Response) {
    const { id: postId } = req.params;
    try {
      const post = await classroomService.findPostById(postId);
      if (!post) return res.status(404).json({ error: "Post not found" });

      const membership = await classroomService.findByIdWithUserMembership(post.classroomId, req.user.id);
      const isStaff =
        membership?.members.some((m) => isClassroomStaffMemberRole(m.role)) ||
        membership?.ownerTeacherId === req.user.id ||
        ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role);

      if (!isStaff && post.authorId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updated = await classroomService.updatePost(postId, req.body || {});
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update post" });
    }
  },

  async deletePost(req: any, res: Response) {
    const { id: postId } = req.params;
    try {
      const post = await classroomService.findPostById(postId);
      if (!post) return res.status(404).json({ error: "Post not found" });

      const membership = await classroomService.findByIdWithUserMembership(post.classroomId, req.user.id);
      const isStaff =
        membership?.members.some((m) => isClassroomStaffMemberRole(m.role)) ||
        membership?.ownerTeacherId === req.user.id ||
        ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role);

      if (!isStaff && post.authorId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await classroomService.deletePost(postId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  },

  async createSubmission(req: any, res: Response) {
    const { id: postId } = req.params;
    const { textResponse } = req.body || {};
    try {
      if (req.user.role !== "STUDENT") {
        return res.status(403).json({ error: "Only students can turn in work" });
      }
      const submission = await classroomService.submitWork(postId, req.user.id, textResponse);
      res.status(201).json(submission);
    } catch (err: any) {
      const status = err.message?.includes("not found") ? 404 : 400;
      res.status(status).json({ error: err.message || "Failed to submit" });
    }
  },

  async updateSubmission(req: any, res: Response) {
    const { id: submissionId } = req.params;
    const { textResponse, grade, feedback } = req.body || {};
    try {
      const submission = await classroomService.findSubmissionById(submissionId);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const classroom = submission.post.classroom;
      const membership = await classroomService.findByIdWithUserMembership(classroom.id, req.user.id);
      const isStaff =
        membership?.members.some((m) => isClassroomStaffMemberRole(m.role)) ||
        classroom.ownerTeacherId === req.user.id ||
        ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role);

      if (isStaff && (grade !== undefined || feedback !== undefined)) {
        const updated = await classroomService.returnSubmission(submissionId, { grade, feedback });
        return res.json(updated);
      }

      if (req.user.role !== "STUDENT" || submission.studentId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updated = await classroomService.updateSubmissionAsStudent(
        submissionId,
        req.user.id,
        textResponse
      );
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update submission" });
    }
  },

  async returnSubmission(req: any, res: Response) {
    const { id: submissionId } = req.params;
    const { grade, feedback } = req.body || {};
    try {
      const submission = await classroomService.findSubmissionById(submissionId);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const classroom = submission.post.classroom;
      const membership = await classroomService.findByIdWithUserMembership(classroom.id, req.user.id);
      const isStaff =
        membership?.members.some((m) => isClassroomStaffMemberRole(m.role)) ||
        classroom.ownerTeacherId === req.user.id ||
        ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role);

      if (!isStaff) return res.status(403).json({ error: "Unauthorized" });

      const updated = await classroomService.returnSubmission(submissionId, { grade, feedback });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to return submission" });
    }
  },

  async reopenSubmission(req: any, res: Response) {
    const { id: submissionId } = req.params;
    try {
      const submission = await classroomService.findSubmissionById(submissionId);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const classroom = submission.post.classroom;
      const membership = await classroomService.findByIdWithUserMembership(classroom.id, req.user.id);
      const isStaff =
        membership?.members.some((m) => isClassroomStaffMemberRole(m.role)) ||
        classroom.ownerTeacherId === req.user.id ||
        ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role);

      if (!isStaff) return res.status(403).json({ error: "Unauthorized" });

      const updated = await classroomService.reopenSubmission(submissionId);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to reopen submission" });
    }
  },

  async getGrades(req: any, res: Response) {
    const { id: classroomId } = req.params;
    const studentId = (req.query.studentId as string) || null;
    try {
      if (req.user.role === "PARENT") {
        if (!studentId) {
          return res.status(400).json({ error: "studentId is required for parent marks" });
        }
        const access = await canViewClassroom(classroomId, req.user, studentId);
        if (!access.ok) return res.status(403).json({ error: "Unauthorized" });
        const grades = await classroomService.getGrades(classroomId, {
          id: studentId,
          studentOnly: true,
        });
        if (!grades) return res.status(404).json({ error: "Classroom not found" });
        return res.json(grades);
      }

      const studentOnly = req.user.role === "STUDENT";
      const grades = await classroomService.getGrades(
        classroomId,
        studentOnly ? { id: req.user.id, studentOnly: true } : undefined
      );
      if (!grades) return res.status(404).json({ error: "Classroom not found" });
      res.json(grades);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch grades" });
    }
  },

  async joinClassroom(req: any, res: Response) {
    try {
      await classroomService.joinClassroom(req.user.id, req.body?.classCode);
      res.status(403).json({ error: "Class code join is disabled" });
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },

  async getUserClassrooms(req: any, res: Response) {
    try {
      const studentId = (req.query.studentId as string) || null;
      if (req.user.role === "PARENT") {
        if (!studentId) {
          return res.status(400).json({ error: "studentId is required for parent class list" });
        }
        const linked = await assertParentOfStudent(req.user.id, studentId);
        if (!linked) return res.status(403).json({ error: "Not linked to this student" });
        const classrooms = await classroomService.getUserClassrooms(
          req.user.id,
          req.user.schoolId,
          studentId,
          ["STUDENT"]
        );
        return res.json(classrooms);
      }
      const teacher = req.user.role === "TEACHER";
      const student = req.user.role === "STUDENT";
      const classrooms = await classroomService.getUserClassrooms(
        req.user.id,
        req.user.schoolId,
        undefined,
        teacher ? ["TEACHER", "CO_TEACHER"] : student ? ["STUDENT"] : undefined,
        teacher
      );
      res.json(classrooms);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch classrooms" });
    }
  },

  async getClassroomById(req: any, res: Response) {
    const { id } = req.params;
    const studentId = (req.query.studentId as string) || null;
    try {
      const classroom = await classroomService.getClassroomById(id);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      const access = await canViewClassroom(id, req.user, studentId);
      if (!access.ok && req.user.role === "PARENT") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      res.json(classroom);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch classroom" });
    }
  },

  // --- Topics ---
  async listTopics(req: any, res: Response) {
    try {
      const studentId = (req.query.studentId as string) || null;
      if (req.user.role === "PARENT") {
        const access = await canViewClassroom(req.params.id, req.user, studentId);
        if (!access.ok) return res.status(403).json({ error: "Unauthorized" });
      }
      const topics = await classroomService.listTopics(req.params.id);
      res.json(topics);
    } catch (err) {
      res.status(500).json({ error: "Failed to list topics" });
    }
  },

  async createTopic(req: any, res: Response) {
    try {
      const { isStaff } = await resolveClassroomStaff(req.params.id, req.user);
      if (!isStaff) return res.status(403).json({ error: "Unauthorized" });
      const topic = await classroomService.createTopic(req.params.id, req.body?.title, req.body?.order);
      res.status(201).json(topic);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create topic" });
    }
  },

  async updateTopic(req: any, res: Response) {
    try {
      const topic = await classroomService.findTopicById(req.params.id);
      if (!topic) return res.status(404).json({ error: "Topic not found" });
      const { isStaff } = await resolveClassroomStaff(topic.classroomId, req.user);
      if (!isStaff) return res.status(403).json({ error: "Unauthorized" });
      const updated = await classroomService.updateTopic(req.params.id, req.body || {});
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update topic" });
    }
  },

  async deleteTopic(req: any, res: Response) {
    try {
      const topic = await classroomService.findTopicById(req.params.id);
      if (!topic) return res.status(404).json({ error: "Topic not found" });
      const { isStaff } = await resolveClassroomStaff(topic.classroomId, req.user);
      if (!isStaff) return res.status(403).json({ error: "Unauthorized" });
      await classroomService.deleteTopic(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to delete topic" });
    }
  },

  // --- Comments ---
  async listComments(req: any, res: Response) {
    try {
      const post = await classroomService.findPostById(req.params.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      const studentId = (req.query.studentId as string) || null;
      const access = await canViewClassroom(post.classroomId, req.user, studentId);
      if (!access.ok) return res.status(403).json({ error: "Unauthorized" });
      const comments = await classroomService.getComments(req.params.id);
      res.json(comments);
    } catch (err) {
      res.status(500).json({ error: "Failed to list comments" });
    }
  },

  async createComment(req: any, res: Response) {
    try {
      const post = await classroomService.findPostById(req.params.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      if (req.user.role === "PARENT") {
        return res.status(403).json({ error: "Parents have read-only access" });
      }
      const access = await canViewClassroom(post.classroomId, req.user, null);
      if (!access.ok) return res.status(403).json({ error: "Unauthorized" });
      const comment = await classroomService.createComment(
        req.params.id,
        req.user.id,
        req.body?.body,
        req.body?.parentCommentId
      );
      res.status(201).json(comment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create comment" });
    }
  },

  async deleteComment(req: any, res: Response) {
    try {
      const comment = await classroomService.findCommentById(req.params.id);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
      const { isStaff } = await resolveClassroomStaff(comment.post.classroomId, req.user);
      if (!isStaff && comment.authorId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      await classroomService.deleteComment(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to delete comment" });
    }
  },

  // --- Attachments ---
  async presignAttachment(req: any, res: Response) {
    try {
      const classroom = await classroomService.findById(req.params.id);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      if (req.user.role === "PARENT") {
        return res.status(403).json({ error: "Parents have read-only access" });
      }
      const access = await canViewClassroom(req.params.id, req.user, null);
      if (!access.ok) return res.status(403).json({ error: "Unauthorized" });
      const { fileName, mimeType } = req.body || {};
      if (!fileName) return res.status(400).json({ error: "fileName required" });
      const result = await classroomService.presignClassroomUpload({
        schoolId: classroom.schoolId,
        classroomId: classroom.id,
        fileName,
        mimeType: mimeType || "application/octet-stream",
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || "Presign failed" });
    }
  },

  async addPostAttachment(req: any, res: Response) {
    try {
      const post = await classroomService.findPostById(req.params.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      const { isStaff } = await resolveClassroomStaff(post.classroomId, req.user);
      if (!isStaff && post.authorId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const { fileUrl, fileType } = req.body || {};
      const attachment = await classroomService.addPostAttachment(
        req.params.id,
        fileUrl,
        fileType || "application/octet-stream"
      );
      res.status(201).json(attachment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to add attachment" });
    }
  },

  async addSubmissionAttachment(req: any, res: Response) {
    try {
      const submission = await classroomService.findSubmissionById(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });
      if (req.user.role !== "STUDENT" || submission.studentId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const attachment = await classroomService.addSubmissionAttachment(
        req.params.id,
        req.body?.fileUrl
      );
      res.status(201).json(attachment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to add attachment" });
    }
  },

  async deleteClassroom(req: any, res: Response) {
    const { id } = req.params;
    try {
      const classroom = await classroomService.findById(id);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      if (req.user.schoolId !== classroom.schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"].includes(req.user.role) && req.user.id !== classroom.ownerTeacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await classroomService.deleteClassroom(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete classroom" });
    }
  },

  // --- Internal (service-to-service) ---
  // Academic's examService used to reach across schemas into Classroom/
  // ClassroomMember directly (getTeacherClassrooms, getExamGrades). Those now
  // call these internal endpoints instead.
  async getClassroomByIdInternal(req: any, res: Response) {
    try {
      const classroom = await classroomService.findById(req.params.id);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      res.json(classroom);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch classroom" });
    }
  },

  async getClassroomsByMemberInternal(req: any, res: Response) {
    try {
      const { userId, schoolId, roles } = req.query as { userId: string; schoolId?: string; roles?: string };
      const roleList = roles ? roles.split(",") : ["TEACHER", "CO_TEACHER", "ASSISTANT"];
      const classrooms = await classroomService.getClassroomsByMember(userId, roleList, schoolId);
      res.json(classrooms);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch classrooms" });
    }
  },

  async listClassroomsBySchoolInternal(req: any, res: Response) {
    try {
      const schoolYearId =
        typeof req.query.schoolYearId === "string" ? req.query.schoolYearId : undefined;
      const classrooms = await classroomService.getClassroomsBySchool(
        req.params.schoolId,
        schoolYearId
      );
      res.json(classrooms);
    } catch (err) {
      res.status(500).json({ error: "Failed to list classrooms" });
    }
  },

  async ensureYearGroupsInternal(req: any, res: Response) {
    try {
      const { schoolYearId, groups } = req.body || {};
      if (!schoolYearId) return res.status(400).json({ error: "schoolYearId required" });
      if (!Array.isArray(groups)) return res.status(400).json({ error: "groups[] required" });
      const result = await classroomService.ensureYearGroups(
        req.params.schoolId,
        schoolYearId,
        groups
      );
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to ensure year groups" });
    }
  },

  async bulkAssignStudentsInternal(req: any, res: Response) {
    try {
      const { assignments } = req.body || {};
      if (!Array.isArray(assignments)) {
        return res.status(400).json({ error: "assignments[] required" });
      }
      const result = await classroomService.bulkAssignStudents(req.params.schoolId, assignments);
      res.json({ results: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to assign students" });
    }
  },

  async getClassroomsOwnedInternal(req: any, res: Response) {
    try {
      const { schoolId } = req.params;
      const { ownerTeacherId } = req.query as { ownerTeacherId?: string };
      if (!ownerTeacherId) {
        return res.status(400).json({ error: "ownerTeacherId required" });
      }
      const classrooms = await classroomService.getClassroomsOwnedByTeacher(
        schoolId,
        ownerTeacherId
      );
      res.json(classrooms);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch owned classrooms" });
    }
  },

  async removeMemberInternal(req: any, res: Response) {
    try {
      const { id: classroomId, userId } = req.params;
      await classroomService.removeMember(classroomId, userId);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to remove member" });
    }
  },

  async getClassroomMembersInternal(req: any, res: Response) {
    try {
      const { id: classroomId } = req.params;
      const { role } = req.query as { role?: string };
      const members = await classroomService.getMembers(classroomId, role);
      res.json(members);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  },

  async addMemberInternal(req: any, res: Response) {
    try {
      const { id: classroomId } = req.params;
      const { userId, role } = req.body || {};
      if (!userId) return res.status(400).json({ error: "userId required" });
      const member = await classroomService.addMember(classroomId, userId, role || "STUDENT");
      res.status(201).json(member);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to add member" });
    }
  },

  async createPostInternal(req: any, res: Response) {
    try {
      const { id: classroomId } = req.params;
      const { authorId, type, title, body, topicId, maxPoints, dueAt } = req.body || {};
      if (!authorId || !title) {
        return res.status(400).json({ error: "authorId and title are required" });
      }
      const classroom = await classroomService.findById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      const post = await classroomService.createPost(classroomId, authorId, {
        type: type || "MATERIAL",
        title,
        body: body || "",
        topicId,
        maxPoints,
        dueAt,
      });
      res.status(201).json(post);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create post" });
    }
  },

  async countClassroomsInternal(req: any, res: Response) {
    try {
      const { subjectId, gradeLevelId, schoolId } = req.query as {
        subjectId?: string;
        gradeLevelId?: string;
        schoolId?: string;
      };
      if (subjectId) {
        const count = await classroomService.countBySubjectId(subjectId);
        return res.json({ count });
      }
      if (gradeLevelId) {
        const count = await classroomService.countByGradeLevelId(gradeLevelId);
        return res.json({ count });
      }
      if (schoolId) {
        const count = await classroomService.countBySchoolId(schoolId);
        return res.json({ count });
      }
      return res
        .status(400)
        .json({ error: "subjectId, gradeLevelId or schoolId required" });
    } catch (err) {
      res.status(500).json({ error: "Failed to count classrooms" });
    }
  },
};
