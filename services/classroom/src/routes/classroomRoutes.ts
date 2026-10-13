import express from "express";
import { authenticate, requireTenant, requireRoles, requireSchoolMembership, requireResourceTenant, authenticateInternal } from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { classroomController } from "../controllers/classroomController";

/** Same paths as monolith src/server/routes/classroomRoutes.ts. */
const router = express.Router();

const CLASSROOM_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"];
const CLASSROOM_ADMIN = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];
/** Roster add/remove — school staff only (not TEACHER). */
const CLASSROOM_MEMBERSHIP_MANAGERS = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
];

router.get(
  "/api/schools/:schoolId/classrooms",
  authenticate,
  requireTenant,
  requireRoles(CLASSROOM_ROLES),
  classroomController.getClassroomsBySchool
);

router.post(
  "/api/schools/:schoolId/classrooms",
  authenticate,
  requireTenant,
  requireRoles(CLASSROOM_ADMIN),
  classroomController.createClassroom
);

router.post(
  "/api/schools/:schoolId/classrooms/sync-subject-rooms",
  authenticate,
  requireTenant,
  requireRoles(CLASSROOM_ADMIN),
  classroomController.syncSubjectRooms
);

router.post(
  "/api/schools/:schoolId/classrooms/backfill-parent-links",
  authenticate,
  requireTenant,
  requireRoles(CLASSROOM_ADMIN),
  classroomController.backfillParentLinks
);

router.get(
  "/api/schools/:schoolId/classrooms/offering-pairs",
  authenticate,
  requireTenant,
  requireRoles(CLASSROOM_ADMIN),
  classroomController.offeringPairs
);

router.patch(
  "/api/classrooms/:id",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.updateClassroom
);

router.post(
  "/api/classrooms/:id/members",
  authenticate,
  requireRoles(CLASSROOM_MEMBERSHIP_MANAGERS),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.addMember
);

router.delete(
  "/api/classrooms/:id/members/:userId",
  authenticate,
  requireRoles(CLASSROOM_MEMBERSHIP_MANAGERS),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.removeMember
);

router.post(
  "/api/classrooms/:id/propagate-roster",
  authenticate,
  requireRoles(CLASSROOM_MEMBERSHIP_MANAGERS),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.propagateRoster
);

router.get(
  "/api/classrooms/:id/members",
  authenticate,
  requireRoles(CLASSROOM_ROLES),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.getMembers
);

router.get(
  "/api/classrooms/:id/posts",
  authenticate,
  requireRoles(CLASSROOM_ROLES),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.getPosts
);

router.post(
  "/api/classrooms/:id/posts",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT"]),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.createPost
);

router.get(
  "/api/classrooms/:id/grades",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.getGrades
);

router.post(
  "/api/classrooms/join",
  authenticate,
  requireSchoolMembership,
  requireRoles(["STUDENT", "TEACHER", "SCHOOL_ADMIN", "PRINCIPAL", "VPI"]),
  classroomController.joinClassroom
);

router.get(
  "/api/posts/:id",
  authenticate,
  requireRoles(CLASSROOM_ROLES),
  requireResourceTenant(resourceLoaders.post),
  classroomController.getPostById
);

router.patch(
  "/api/posts/:id",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT"]),
  requireResourceTenant(resourceLoaders.post),
  classroomController.updatePost
);

router.delete(
  "/api/posts/:id",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER"]),
  requireResourceTenant(resourceLoaders.post),
  classroomController.deletePost
);

router.post(
  "/api/posts/:id/submissions",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.post),
  classroomController.createSubmission
);

router.patch(
  "/api/submissions/:id",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT"]),
  requireResourceTenant(resourceLoaders.submission),
  classroomController.updateSubmission
);

router.post(
  "/api/submissions/:id/return",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.submission),
  classroomController.returnSubmission
);

router.post(
  "/api/submissions/:id/reopen",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.submission),
  classroomController.reopenSubmission
);

router.get(
  "/api/classrooms/:id/topics",
  authenticate,
  requireRoles(CLASSROOM_ROLES),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.listTopics
);

router.post(
  "/api/classrooms/:id/topics",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER"]),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.createTopic
);

router.patch(
  "/api/topics/:id",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER"]),
  requireResourceTenant(resourceLoaders.topic),
  classroomController.updateTopic
);

router.delete(
  "/api/topics/:id",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER"]),
  requireResourceTenant(resourceLoaders.topic),
  classroomController.deleteTopic
);

router.get(
  "/api/posts/:id/comments",
  authenticate,
  requireRoles(CLASSROOM_ROLES),
  requireResourceTenant(resourceLoaders.post),
  classroomController.listComments
);

router.post(
  "/api/posts/:id/comments",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.post),
  classroomController.createComment
);

router.delete(
  "/api/comments/:id",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.comment),
  classroomController.deleteComment
);

router.post(
  "/api/classrooms/:id/attachments/presign",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.presignAttachment
);

router.post(
  "/api/posts/:id/attachments",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER"]),
  requireResourceTenant(resourceLoaders.post),
  classroomController.addPostAttachment
);

router.post(
  "/api/submissions/:id/attachments",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.submission),
  classroomController.addSubmissionAttachment
);

router.get(
  "/api/classrooms",
  authenticate,
  requireSchoolMembership,
  requireRoles(CLASSROOM_ROLES),
  classroomController.getUserClassrooms
);

router.get(
  "/api/classrooms/:id",
  authenticate,
  requireRoles(CLASSROOM_ROLES),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.getClassroomById
);

router.delete(
  "/api/classrooms/:id",
  authenticate,
  requireRoles(CLASSROOM_ADMIN),
  requireResourceTenant(resourceLoaders.classroom),
  classroomController.deleteClassroom
);

// --- Internal service-to-service API (no user JWT) — Academic's examService uses these. ---
router.get("/api/internal/classrooms/count", authenticateInternal, classroomController.countClassroomsInternal);
router.get(
  "/api/internal/schools/:schoolId/classrooms",
  authenticateInternal,
  classroomController.listClassroomsBySchoolInternal
);
router.get(
  "/api/internal/schools/:schoolId/classrooms/owned",
  authenticateInternal,
  classroomController.getClassroomsOwnedInternal
);
router.get("/api/internal/classrooms", authenticateInternal, classroomController.getClassroomsByMemberInternal);
router.get("/api/internal/classrooms/:id", authenticateInternal, classroomController.getClassroomByIdInternal);
router.get("/api/internal/classrooms/:id/members", authenticateInternal, classroomController.getClassroomMembersInternal);
router.post(
  "/api/internal/classrooms/:id/members",
  authenticateInternal,
  classroomController.addMemberInternal
);
router.delete(
  "/api/internal/classrooms/:id/members/:userId",
  authenticateInternal,
  classroomController.removeMemberInternal
);
router.post(
  "/api/internal/schools/:schoolId/classrooms/provision-offering",
  authenticateInternal,
  classroomController.provisionOfferingInternal
);
router.post(
  "/api/internal/schools/:schoolId/classrooms/sync-subject-rooms",
  authenticateInternal,
  classroomController.syncSubjectRoomsInternal
);
router.post(
  "/api/internal/classrooms/:id/posts",
  authenticateInternal,
  classroomController.createPostInternal
);

export default router;
