import {
  getClassroomsByMember,
  getClassroomMembers,
} from "./classroomClient";

const COMMS_URL = process.env.COMMS_URL || "http://localhost:3017";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export async function assertTeacherClassAccess(
  teacherId: string,
  classId: string,
  role: string
) {
  if (["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(role)) return;
  const rooms = await getClassroomsByMember(teacherId, ["TEACHER", "CO_TEACHER"]);
  if (!rooms.some((r) => r.id === classId)) {
    throw Object.assign(
      new Error("You are not assigned to this classroom"),
      { status: 403, code: "NOT_CLASS_MEMBER" }
    );
  }
}

export async function assertStudentInClass(classId: string, studentId: string) {
  const members = await getClassroomMembers(classId, "STUDENT");
  if (!members.some((m) => m.userId === studentId)) {
    throw Object.assign(
      new Error("Student is not on this classroom roster"),
      { status: 400, code: "STUDENT_NOT_IN_CLASS" }
    );
  }
}

export async function assertWithinSubmissionDeadline(opts: {
  examId?: string | null;
  examComponentId?: string | null;
  prisma: any;
}) {
  const now = new Date();
  if (opts.examId) {
    const exam = await opts.prisma.exam.findUnique({
      where: { id: opts.examId },
      select: { gradeSubmissionDeadline: true, title: true },
    });
    if (
      exam?.gradeSubmissionDeadline &&
      now > new Date(exam.gradeSubmissionDeadline)
    ) {
      throw Object.assign(
        new Error(
          `Grade submission deadline has passed for ${exam.title || "this exam"}`
        ),
        { status: 409, code: "DEADLINE_PASSED" }
      );
    }
  }
  if (opts.examComponentId) {
    const comp = await opts.prisma.examComponent.findUnique({
      where: { id: opts.examComponentId },
      select: { gradeSubmissionDeadline: true, label: true },
    });
    if (
      comp?.gradeSubmissionDeadline &&
      now > new Date(comp.gradeSubmissionDeadline)
    ) {
      throw Object.assign(
        new Error(
          `Grade submission deadline has passed for ${comp.label || "this component"}`
        ),
        { status: 409, code: "DEADLINE_PASSED" }
      );
    }
  }
}

export async function notifyTeacherGradeDecision(opts: {
  schoolId: string;
  teacherId: string;
  eventKey: "GRADE_RETURNED" | "GRADE_APPROVED";
  title: string;
  body: string;
  href?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const res = await fetch(`${COMMS_URL}/api/internal/notifications`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        schoolId: opts.schoolId,
        userId: opts.teacherId,
        eventKey: opts.eventKey,
        title: opts.title,
        body: opts.body,
        href: opts.href || "/gradebook",
        meta: opts.meta || null,
      }),
    });
    if (!res.ok) {
      console.warn(
        "[academic] notifyTeacherGradeDecision failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err: any) {
    console.warn(
      "[academic] notifyTeacherGradeDecision error:",
      err?.message || err
    );
  }
}
