import {
  createClassroomMaterialPost,
} from "../lib/classroomClient";

export type SyllabusUnit = {
  week?: string;
  topic?: string;
  activities?: string;
  assessment?: string;
};

export function parseSyllabusUnits(raw: string | null | undefined): SyllabusUnit[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) {
      return v.map((u) => ({
        week: String(u?.week || "").trim(),
        topic: String(u?.topic || "").trim(),
        activities: String(u?.activities || "").trim(),
        assessment: String(u?.assessment || "").trim(),
      }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Build a classroom MATERIAL body from a lesson plan row. */
export function buildLessonMaterialBody(plan: {
  title: string;
  lessonDate: string;
  durationMinutes: number;
  periodLabel?: string | null;
  objectives: string;
  warmUp?: string | null;
  activities: string;
  materials?: string | null;
  assessment?: string | null;
  homework?: string | null;
  differentiation?: string | null;
}): string {
  const objectives = (() => {
    try {
      const v = JSON.parse(plan.objectives);
      if (Array.isArray(v)) return v.map(String);
    } catch {
      /* */
    }
    return String(plan.objectives || "")
      .split("\n")
      .filter(Boolean);
  })();
  const activities = (() => {
    try {
      const v = JSON.parse(plan.activities);
      if (Array.isArray(v)) return v;
    } catch {
      /* */
    }
    return [];
  })();
  const materials = (() => {
    try {
      const v = JSON.parse(plan.materials || "[]");
      if (Array.isArray(v)) return v.map(String);
    } catch {
      /* */
    }
    return plan.materials ? [String(plan.materials)] : [];
  })();

  const lines: string[] = [
    `Lesson date: ${plan.lessonDate}`,
    `Duration: ${plan.durationMinutes} minutes${plan.periodLabel ? ` (${plan.periodLabel})` : ""}`,
    "",
    "Objectives:",
    ...objectives.map((o, i) => `${i + 1}. ${o}`),
  ];
  if (plan.warmUp) {
    lines.push("", "Warm-up:", plan.warmUp);
  }
  if (activities.length) {
    lines.push("", "Activities:");
    for (const a of activities) {
      const mins = a.minutes != null ? ` (${a.minutes} min)` : "";
      lines.push(`• ${a.title || "Step"}${mins}`);
      if (a.description) lines.push(`  ${a.description}`);
    }
  }
  if (materials.length) {
    lines.push("", "Materials:", ...materials.map((m) => `• ${m}`));
  }
  if (plan.assessment) lines.push("", "Assessment:", plan.assessment);
  if (plan.differentiation) lines.push("", "Differentiation:", plan.differentiation);
  if (plan.homework) lines.push("", "Homework:", plan.homework);
  return lines.join("\n");
}

export async function shareLessonPlanToClassroom(
  plan: {
    id: string;
    classroomId: string | null;
    classroomPostId: string | null;
    title: string;
    teacherId: string;
    status: string;
    lessonDate: string;
    durationMinutes: number;
    periodLabel?: string | null;
    objectives: string;
    warmUp?: string | null;
    activities: string;
    materials?: string | null;
    assessment?: string | null;
    homework?: string | null;
    differentiation?: string | null;
  },
  actor: { id: string; role: string }
) {
  if (plan.status !== "APPROVED") {
    throw Object.assign(new Error("Only approved lesson plans can be shared to Classroom"), {
      status: 409,
      code: "NOT_APPROVED",
    });
  }
  if (!plan.classroomId) {
    throw Object.assign(
      new Error("Assign a classroom on the lesson plan before sharing"),
      { status: 400, code: "NO_CLASSROOM" }
    );
  }
  if (plan.classroomPostId) {
    throw Object.assign(new Error("This lesson plan was already shared to Classroom"), {
      status: 409,
      code: "ALREADY_SHARED",
    });
  }
  if (actor.role === "TEACHER" && plan.teacherId !== actor.id) {
    throw Object.assign(new Error("You can only share your own lesson plans"), { status: 403 });
  }

  const post = await createClassroomMaterialPost({
    classroomId: plan.classroomId,
    authorId: plan.teacherId,
    title: plan.title,
    body: buildLessonMaterialBody(plan),
  });

  return post;
}
