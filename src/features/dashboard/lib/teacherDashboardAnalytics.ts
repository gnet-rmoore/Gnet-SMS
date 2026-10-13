import { attendanceApi } from "../../attendance/api";
import { examsApi } from "../../exams/api";
import { workspaceApi } from "../../classroom-workspace/api";
import type { ChartDatum } from "./chartAggregates";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type TeacherDashboardAnalytics = {
  attendance: ChartDatum[];
  assignments: ChartDatum[];
  quizzes: ChartDatum[];
  exams: ChartDatum[];
};

function statusColor(status: string, index: number): string {
  const map: Record<string, string> = {
    SCHEDULED: "#6366f1",
    IN_PROGRESS: "#f59e0b",
    ENDED: "#94a3b8",
    COMPLETED: "#10b981",
    NOT_STARTED: "#cbd5e1",
    DRAFT: "#94a3b8",
    SUBMITTED: "#3b82f6",
  };
  const palette = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#3b82f6", "#8b5cf6"];
  return map[status.toUpperCase()] || palette[index % palette.length];
}

export function aggregateTeacherAttendance(
  sessions: unknown[],
  classroomIds: Set<string>
): ChartDatum[] {
  const since = Date.now() - TWO_WEEKS_MS;
  let present = 0;
  let absent = 0;
  let late = 0;

  for (const session of sessions) {
    const classroomId = String((session as { classroomId?: string })?.classroomId || "");
    if (!classroomId || !classroomIds.has(classroomId)) continue;
    const dateRaw = (session as { date?: string })?.date;
    if (!dateRaw || new Date(dateRaw).getTime() < since) continue;
    for (const rec of (session as { records?: unknown[] })?.records || []) {
      const status = String((rec as { status?: string })?.status || "").toUpperCase();
      if (status === "PRESENT") present += 1;
      else if (status === "ABSENT") absent += 1;
      else if (status === "LATE") late += 1;
    }
  }

  return [
    { name: "present", value: present, fill: "#10b981" },
    { name: "absent", value: absent, fill: "#f43f5e" },
    { name: "late", value: late, fill: "#f59e0b" },
  ].filter((d) => d.value > 0);
}

export function aggregateTeacherAssignments(posts: unknown[]): ChartDatum[] {
  const now = Date.now();
  let posted = 0;
  let dueSoon = 0;
  let overdue = 0;
  let submissions = 0;

  for (const raw of posts) {
    const post = raw as {
      type?: string;
      dueAt?: string | null;
      _count?: { submissions?: number };
    };
    if (post.type !== "ASSIGNMENT") continue;
    posted += 1;
    submissions += Number(post._count?.submissions ?? 0);
    if (post.dueAt) {
      const due = new Date(post.dueAt).getTime();
      if (due < now) overdue += 1;
      else if (due - now <= WEEK_MS) dueSoon += 1;
    }
  }

  return [
    { name: "posted", value: posted, fill: "#6366f1" },
    { name: "dueSoon", value: dueSoon, fill: "#f59e0b" },
    { name: "overdue", value: overdue, fill: "#f43f5e" },
    { name: "submissions", value: submissions, fill: "#10b981" },
  ].filter((d) => d.value > 0);
}

export function aggregateAssessmentsByStatus(
  exams: unknown[],
  kind: "quiz" | "exam"
): ChartDatum[] {
  const counts = new Map<string, number>();

  for (const raw of exams) {
    const exam = raw as {
      status?: string;
      displayStatus?: string;
      examComponent?: { componentType?: string | null } | null;
    };
    const componentType = String(exam.examComponent?.componentType || "EXAM").toUpperCase();
    const isQuiz = componentType === "QUIZ";
    if (kind === "quiz" ? !isQuiz : isQuiz) continue;
    const status = String(exam.displayStatus || exam.status || "UNKNOWN").toUpperCase();
    counts.set(status, (counts.get(status) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, value], index) => ({
    name: name.toLowerCase().replace(/_/g, " "),
    value,
    fill: statusColor(name, index),
  }));
}

export async function fetchTeacherDashboardAnalytics(
  schoolId: string,
  classroomIds: string[]
): Promise<TeacherDashboardAnalytics> {
  const idSet = new Set(classroomIds);

  const [attendanceRaw, examsRaw, ...postBatches] = await Promise.all([
    attendanceApi.fetchAttendance(schoolId).catch(() => []),
    examsApi.list(schoolId).catch(() => []),
    ...classroomIds.map((id) => workspaceApi.fetchPosts(id).catch(() => [])),
  ]);

  const sessions = Array.isArray(attendanceRaw)
    ? attendanceRaw
    : (attendanceRaw as { sessions?: unknown[] })?.sessions || [];
  const exams = Array.isArray(examsRaw) ? examsRaw : [];
  const allPosts = postBatches.flatMap((batch) => (Array.isArray(batch) ? batch : []));

  return {
    attendance: aggregateTeacherAttendance(sessions, idSet),
    assignments: aggregateTeacherAssignments(allPosts),
    quizzes: aggregateAssessmentsByStatus(exams, "quiz"),
    exams: aggregateAssessmentsByStatus(exams, "exam"),
  };
}
