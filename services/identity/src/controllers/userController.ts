import { userService } from "../services/userService";
import { bulkImportService } from "../services/bulkImportService";
import { fetchStudentGrades } from "../lib/academicClient";
import { logSystemEvent } from "../utils/logger";

/** Ported from src/server/controllers/userController.ts */
export const userController = {
  async getStudents(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user?.schoolId !== schoolId && req.user?.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const hasPaging = req.query.page != null || req.query.pageSize != null;
      const result = await userService.getStudents(schoolId, {
        gradeLevelId: req.query.gradeLevelId ? String(req.query.gradeLevelId) : undefined,
        feeCohort: req.query.feeCohort ? String(req.query.feeCohort) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
        unpaged: !hasPaging,
      });
      res.json(hasPaging ? result : result.items);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch students" });
    }
  },

  async getStudentsInternal(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      const hasPaging = req.query.page != null || req.query.pageSize != null;
      const result = await userService.getStudents(schoolId, {
        gradeLevelId: req.query.gradeLevelId ? String(req.query.gradeLevelId) : undefined,
        feeCohort: req.query.feeCohort ? String(req.query.feeCohort) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
        unpaged: hasPaging ? undefined : true,
      });
      if (hasPaging) {
        return res.json(result);
      }
      res.json(result.items);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch students" });
    }
  },

  async createStudent(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const student = await userService.createStudent(schoolId, req.body);
      await logSystemEvent(
        "user_created",
        "USERS",
        `Student created: ${student.email || student.id}`,
        "INFO",
        req,
        {
          category: "USER_MGMT",
          entityType: "User",
          entityId: student.id,
          schoolId,
          after: { id: student.id, email: student.email, role: "STUDENT", name: student.name },
          tags: ["user", "student", "create"],
        }
      );
      res.json(student);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to enroll student" });
    }
  },

  async getStaff(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const hasPaging = req.query.page != null || req.query.pageSize != null;
      const result = await userService.getStaff(schoolId, {
        q: req.query.q ? String(req.query.q) : undefined,
        role: req.query.role ? String(req.query.role) : undefined,
        isActive:
          req.query.isActive !== undefined ? String(req.query.isActive) : undefined,
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
        unpaged: !hasPaging,
      });
      res.json(hasPaging ? result : result.items);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch staff" });
    }
  },

  async getUsersByRolesInternal(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      const rolesRaw = String(req.query.roles || "");
      const roles = rolesRaw
        .split(",")
        .map((r: string) => r.trim())
        .filter(Boolean);
      const users = await userService.getUsersByRoles(schoolId, roles);
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch users" });
    }
  },

  async lookupUserByEmailInternal(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      const email = String(req.query.email || "");
      const user = await userService.lookupByEmailInSchool(schoolId, email);
      if (!user) return res.status(404).json({ error: "Not found" });
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Lookup failed" });
    }
  },

  async createStaff(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const staff = await userService.createStaff(schoolId, req.body);
      await logSystemEvent(
        "user_created",
        "USERS",
        `Staff created: ${staff.email || staff.id} (${staff.role})`,
        "INFO",
        req,
        {
          category: "USER_MGMT",
          entityType: "User",
          entityId: staff.id,
          schoolId,
          after: { id: staff.id, email: staff.email, role: staff.role, name: staff.name },
          tags: ["user", "staff", "create"],
        }
      );
      res.json(staff);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create staff" });
    }
  },

  /** Proxies to Academic — GradeEntry is owned there now. */
  async getStudentGrades(req: any, res: any) {
    const { studentId } = req.params;
    try {
      if (req.user.role === "STUDENT" && req.user.id !== studentId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const grades = await fetchStudentGrades(studentId, req.headers.authorization);
      res.json(grades);
    } catch (err: any) {
      res.status(502).json({ error: err.message || "Failed to fetch student grades" });
    }
  },

  async getParentsChildren(req: any, res: any) {
    const { parentId } = req.params;
    try {
      if (req.user.id !== parentId && !["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const linkedStudents = await userService.getParentsChildren(parentId);
      res.json(linkedStudents);
    } catch (err: any) {
      console.error("Failed to fetch parent's children:", err);
      res.status(500).json({ error: err.message || "Failed to fetch children" });
    }
  },

  async getUserById(req: any, res: any) {
    const { userId } = req.params;
    try {
      const user = await userService.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },

  async getMyGuide(req: any, res: any) {
    try {
      const result = await userService.getGuideProgress(req.user.id);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load guide" });
    }
  },

  async patchMyGuide(req: any, res: any) {
    try {
      const result = await userService.updateGuideProgress(req.user.id, req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || "Failed to update guide" });
    }
  },

  async getSchoolGuideStats(req: any, res: any) {
    try {
      const schoolId = String(req.params.schoolId || "");
      if (req.user?.role !== "SUPER_ADMIN" && req.user?.schoolId !== schoolId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const result = await userService.getSchoolGuideStats(schoolId);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load guide stats" });
    }
  },

  async updateUser(req: any, res: any) {
    const { userId } = req.params;
    try {
      const actor = req.user
        ? { id: req.user.id, role: req.user.role, schoolId: req.user.schoolId ?? null }
        : undefined;
      const before = await userService.getUserById(userId);
      const user = await userService.updateUser(userId, req.body, actor);
      const bodyKeys = Object.keys(req.body || {}).filter((k) => req.body[k] !== undefined);
      const action = bodyKeys.includes("password")
        ? "password_change"
        : bodyKeys.includes("photoUrl")
          ? "profile_picture_updated"
          : bodyKeys.includes("isActive")
            ? req.body.isActive
              ? "user_activated"
              : "user_deactivated"
            : "user_updated";
      await logSystemEvent(
        action,
        "USERS",
        `User ${action.replace(/_/g, " ")}: ${user.email || userId}`,
        bodyKeys.includes("password") ? "WARNING" : "INFO",
        req,
        {
          category: bodyKeys.includes("password") ? "AUTH" : "USER_MGMT",
          entityType: "User",
          entityId: userId,
          schoolId: user.schoolId ?? before?.schoolId ?? null,
          before: before
            ? {
                name: before.name,
                email: before.email,
                role: before.role,
                phone: before.phone,
                isActive: before.isActive,
                photoUrl: before.photoUrl,
              }
            : null,
          after: {
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            isActive: user.isActive,
            photoUrl: user.photoUrl,
            changedFields: bodyKeys.filter((k) => k !== "password" && k !== "currentPassword"),
          },
          tags: ["user", "update", action],
        }
      );
      res.json(user);
    } catch (err: any) {
      res.status(err.status || 400).json({
        error: err.message || "Failed to update user",
        ...(err.code ? { code: err.code } : {}),
      });
    }
  },

  async listSchoolUsers(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const result = await userService.listSchoolUsers(schoolId, {
        q: req.query.q ? String(req.query.q) : undefined,
        role: req.query.role ? String(req.query.role) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list users" });
    }
  },

  async changeUserRole(req: any, res: any) {
    const { userId } = req.params;
    try {
      const nextRole = req.body?.role;
      if (!nextRole || typeof nextRole !== "string") {
        return res.status(400).json({ error: "role is required" });
      }
      const actor = {
        id: req.user.id,
        role: req.user.role,
        schoolId: req.user.schoolId ?? null,
      };
      const before = await userService.getUserById(userId);
      const updated = await userService.changeUserRole(userId, nextRole, actor);
      await logSystemEvent(
        "role_assigned",
        "ROLES",
        `Role changed for ${updated.email || userId}: ${before?.role || "?"} → ${nextRole}`,
        "WARNING",
        req,
        {
          category: "ROLE",
          entityType: "User",
          entityId: userId,
          schoolId: updated.schoolId ?? before?.schoolId ?? null,
          before: { role: before?.role },
          after: { role: nextRole },
          tags: ["role", "assign"],
        }
      );
      res.json(updated);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || "Failed to change role" });
    }
  },

  async listRoleChangeAudit(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const rows = await userService.listRoleChangeAudit(
        schoolId,
        req.query.limit ? Number(req.query.limit) : 50
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load role audit" });
    }
  },

  async deleteUser(req: any, res: any) {
    const { userId } = req.params;
    try {
      const before = await userService.getUserById(userId);
      await userService.deleteUser(userId);
      await logSystemEvent(
        "user_deleted",
        "USERS",
        `User deleted: ${before?.email || userId}`,
        "WARNING",
        req,
        {
          category: "USER_MGMT",
          entityType: "User",
          entityId: userId,
          schoolId: before?.schoolId ?? null,
          before: before
            ? { name: before.name, email: before.email, role: before.role, isActive: before.isActive }
            : null,
          tags: ["user", "delete"],
        }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to delete user" });
    }
  },

  // --- Internal (service-to-service) ---
  async findOrCreateUserInternal(req: any, res: any) {
    try {
      const user = await userService.findOrCreateUser(req.body);
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to find or create user" });
    }
  },

  async getUserByIdInternal(req: any, res: any) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch user" });
    }
  },

  /** Placement-only patch for Year Transition commit (Academic → Identity). */
  async patchUserInternal(req: any, res: any) {
    try {
      const { gradeLevelId, feeCohort } = req.body || {};
      const patch: Record<string, unknown> = {};
      if (gradeLevelId !== undefined) patch.gradeLevelId = gradeLevelId;
      if (feeCohort !== undefined) patch.feeCohort = feeCohort;
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: "No placement fields to update" });
      }
      const user = await userService.updateUser(req.params.id, patch);
      res.json(user);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || "Failed to patch user" });
    }
  },

  async createParentLinkInternal(req: any, res: any) {
    try {
      const { parentId, studentId } = req.body;
      const link = await userService.createParentLink(parentId, studentId);
      res.json(link);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to link parent/student" });
    }
  },

  async getParentsChildrenInternal(req: any, res: any) {
    try {
      const linkedStudents = await userService.getParentsChildren(req.params.parentId);
      res.json(linkedStudents);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch children" });
    }
  },

  async getStudentParentsInternal(req: any, res: any) {
    try {
      const parentIds = await userService.getStudentParentIds(req.params.studentId);
      res.json(parentIds);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch student parents" });
    }
  },

  async assertParentLinkedInternal(req: any, res: any) {
    try {
      await userService.assertParentLinked(req.params.parentId, req.params.studentId);
      res.status(204).end();
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to verify parent link" });
    }
  },

  async verifyReturningStudentInternal(req: any, res: any) {
    try {
      const schoolId = String(req.params.schoolId || req.body?.schoolId || "");
      const idNumber = req.body?.idNumber != null ? String(req.body.idNumber) : null;
      const email = req.body?.email != null ? String(req.body.email) : null;
      const dob = req.body?.dob != null ? String(req.body.dob) : null;
      const student = await userService.verifyReturningStudent(
        schoolId,
        { idNumber, email },
        dob
      );
      res.json(student);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async studentImportTemplate(req: any, res: any) {
    const { schoolId } = req.params;
    if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const csv = bulkImportService.studentTemplateCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="student-import-template.csv"');
    res.send(csv);
  },

  async previewStudentImport(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const preview = await bulkImportService.previewStudents(schoolId, req.body);
      res.json(preview);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Preview failed" });
    }
  },

  async importStudents(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const result = await bulkImportService.importStudents(schoolId, req.body);
      res.json(result);
    } catch (err: any) {
      if (err.preview) {
        return res.status(400).json(err.preview);
      }
      res.status(err.status || 400).json({ error: err.message || "Import failed" });
    }
  },

  async staffImportTemplate(req: any, res: any) {
    const { schoolId } = req.params;
    if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const csv = bulkImportService.staffTemplateCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="staff-import-template.csv"');
    res.send(csv);
  },

  async previewStaffImport(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const preview = await bulkImportService.previewStaff(schoolId, req.body);
      res.json(preview);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Preview failed" });
    }
  },

  async importStaff(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const result = await bulkImportService.importStaff(schoolId, req.body);
      res.json(result);
    } catch (err: any) {
      if (err.preview) {
        return res.status(400).json(err.preview);
      }
      res.status(err.status || 400).json({ error: err.message || "Import failed" });
    }
  },
};
