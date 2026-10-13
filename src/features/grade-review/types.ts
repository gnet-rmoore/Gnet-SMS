export type GradePerson = {
  id: string;
  name: string;
  email?: string;
};

export type ReviewGrade = {
  id: string;
  score?: number | null;
  status: string;
  feedback?: string | null;
  enteredAt: string;
  updatedAt?: string;
  studentId: string;
  classId: string;
  subjectId?: string;
  examId?: string | null;
  examComponentId?: string | null;
  structureColumnId?: string | null;
  enteredBy?: string;
  assessmentTitle?: string;
  classroom?: { id: string; name: string };
  student?: GradePerson;
  teacher?: GradePerson;
  exam?: { id?: string; title?: string } | null;
  examComponent?: {
    id?: string;
    label?: string;
    shortCode?: string;
    periodId?: string;
  } | null;
  subject?: { id?: string; name?: string; code?: string } | null;
};

export type SubmissionBundle = {
  key: string;
  assessmentTitle: string;
  classroomName: string;
  teacherName: string;
  teacherId: string;
  classId: string;
  examId: string | null;
  examComponentId: string | null;
  periodId: string | null;
  subjectName: string;
  updatedAt: string;
  grades: ReviewGrade[];
};

export function displayScore(g: ReviewGrade) {
  if (g.score != null && g.score !== undefined) {
    const suffix = g.structureColumnId ? ` · ${g.structureColumnId}` : "";
    return `${g.score}%${suffix}`;
  }
  return "—";
}

export function bundleKey(g: ReviewGrade) {
  return [
    g.examId || g.examComponentId || "none",
    g.classId,
    g.enteredBy || g.teacher?.id || "unknown",
  ].join("|");
}

export function groupIntoBundles(grades: ReviewGrade[]): SubmissionBundle[] {
  const map = new Map<string, SubmissionBundle>();
  for (const g of grades) {
    const key = bundleKey(g);
    let b = map.get(key);
    if (!b) {
      b = {
        key,
        assessmentTitle:
          g.assessmentTitle || g.exam?.title || g.examComponent?.label || "Assessment",
        classroomName: g.classroom?.name || "Classroom",
        teacherName: g.teacher?.name || "Teacher",
        teacherId: g.enteredBy || g.teacher?.id || "",
        classId: g.classId,
        examId: g.examId || null,
        examComponentId: g.examComponentId || null,
        periodId: g.examComponent?.periodId || null,
        subjectName: g.subject?.name || "",
        updatedAt: g.updatedAt || g.enteredAt,
        grades: [],
      };
      map.set(key, b);
    }
    b.grades.push(g);
    const ts = g.updatedAt || g.enteredAt;
    if (ts && new Date(ts) > new Date(b.updatedAt)) b.updatedAt = ts;
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function gradebookHref(slug: string, g: ReviewGrade | SubmissionBundle) {
  const params = new URLSearchParams();
  const examId = g.examId || null;
  const classId = g.classId || null;
  const examComponentId = g.examComponentId || null;
  const periodId =
    ("periodId" in g && g.periodId) ||
    ("examComponent" in g && g.examComponent?.periodId) ||
    null;

  if (classId) params.set("classId", classId);
  if (examId) {
    params.set("examId", examId);
    params.set("mode", "exam");
  } else if (examComponentId) {
    params.set("mode", "assessment");
    params.set("assessmentId", examComponentId);
    if (periodId) params.set("periodId", String(periodId));
  }
  const qs = params.toString();
  return `/${slug}/gradebook${qs ? `?${qs}` : ""}`;
}
