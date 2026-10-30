import classroomRoutes from "../services/classroom/src/routes/classroomRoutes.ts";
import { classroomController } from "../services/classroom/src/controllers/classroomController.ts";
import { classroomService } from "../services/classroom/src/services/classroomService.ts";
import prisma from "../services/classroom/src/lib/prisma.ts";

let failed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

function responseCapture() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

async function main() {
  const route = (classroomRoutes as any).stack.find(
    (layer: any) => layer.route?.path === "/api/classrooms/:id/members/bulk"
  );
  assert(Boolean(route?.route?.methods?.post), "registers the authenticated bulk-members POST route");

  const originalFindById = classroomService.findById;
  const originalAddMember = classroomService.addMember;
  const originalMemberFindMany = (prisma.classroomMember as any).findMany;
  const originalFetch = globalThis.fetch;

  try {
    classroomService.findById = async () =>
      ({ id: "room-1", schoolId: "school-1" }) as any;
    classroomService.addMember = async () => ({ id: "new-member" }) as any;
    (prisma.classroomMember as any).findMany = async () => [{ userId: "already-member" }];
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const userId = String(input).split("/").pop() || "";
      const users: Record<string, any> = {
        "already-member": { id: userId, name: "Existing", email: "existing@example.test", role: "STUDENT", schoolId: "school-1" },
        "new-student": { id: userId, name: "New", email: "new@example.test", role: "STUDENT", schoolId: "school-1" },
        teacher: { id: userId, name: "Teacher", email: "teacher@example.test", role: "TEACHER", schoolId: "school-1" },
        "other-school": { id: userId, name: "Other", email: "other@example.test", role: "STUDENT", schoolId: "school-2" },
      };
      const user = users[userId];
      return new Response(user ? JSON.stringify(user) : "", {
        status: user ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    };

    const successResponse = responseCapture();
    await classroomController.addMembersBulk(
      {
        params: { id: "room-1" },
        body: {
          role: "STUDENT",
          userIds: [
            "already-member",
            "new-student",
            "teacher",
            "other-school",
            "missing-user",
            "new-student",
          ],
        },
        user: { id: "admin-1", schoolId: "school-1", role: "REGISTRAR" },
      },
      successResponse as any
    );
    assert(successResponse.statusCode === 200, "accepts a same-school registrar assignment");
    assert(successResponse.body.succeeded === 2 && successResponse.body.failed === 4, "returns aggregate per-user counts including idempotent successes");
    assert(
      successResponse.body.results[0].alreadyMember === true,
      "marks existing membership as an idempotent success"
    );
    assert(
      successResponse.body.results.map((result: any) => result.reason || "success").join(",") ===
        "success,success,not_a_student,wrong_school,user_not_found,duplicate",
      "reports existing, invalid-role, cross-school, missing, and duplicate users individually"
    );

    const unauthorizedResponse = responseCapture();
    await classroomController.addMembersBulk(
      {
        params: { id: "room-1" },
        body: { role: "STUDENT", userIds: ["new-student"] },
        user: { id: "admin-2", schoolId: "another-school", role: "REGISTRAR" },
      },
      unauthorizedResponse as any
    );
    assert(unauthorizedResponse.statusCode === 403, "blocks staff from another school");

    const teacherResponse = responseCapture();
    await classroomController.addMembersBulk(
      {
        params: { id: "room-1" },
        body: { role: "STUDENT", userIds: ["new-student"] },
        user: { id: "teacher-1", schoolId: "school-1", role: "TEACHER" },
      },
      teacherResponse as any
    );
    assert(teacherResponse.statusCode === 403, "blocks teacher role from bulk membership management");

    const invalidResponse = responseCapture();
    await classroomController.addMembersBulk(
      {
        params: { id: "room-1" },
        body: { role: "TEACHER", userIds: ["new-student"] },
        user: { id: "admin-1", schoolId: "school-1", role: "REGISTRAR" },
      },
      invalidResponse as any
    );
    assert(invalidResponse.statusCode === 400, "rejects a non-STUDENT bulk role");
  } finally {
    classroomService.findById = originalFindById;
    classroomService.addMember = originalAddMember;
    (prisma.classroomMember as any).findMany = originalMemberFindMany;
    globalThis.fetch = originalFetch;
  }

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
