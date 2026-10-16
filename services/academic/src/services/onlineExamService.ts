import prisma from "../lib/prisma";
import {
  computeEndsAt,
  summarizeAttemptScore,
  type ScoreableAnswer,
  type ScoreableQuestion,
} from "../lib/onlineExamScoring";
import {
  MAX_QUESTIONS,
  normalizeQuestion,
  serializeImportRows,
  validateImportRows,
  type NormalizedQuestion,
} from "../lib/questionImport";
import {
  getStudentParentIds,
  getIdentityUsersByRoles,
  getIdentityUsersByIds,
  getSchoolGradebookConfig,
} from "../lib/identityClient";
import { mapLimit } from "../lib/concurrency";
import {
  computeScorePercent,
  resolveExamGradeColumn,
  resolvePublishScore,
  scaleScoreToColumn,
  shouldSkipManualEntry,
} from "../lib/onlineExamGradebook";
import {
  evaluateViolation,
  isCountedViolation,
  isKnownViolationType,
  parseKioskConfig,
} from "../lib/onlineExamKiosk";
import {
  capturesScreen,
  computeFrameExpiry,
  isFrameExpired,
  resolveFrameIntervalMs,
  resolveRetentionDays,
  shouldCaptureScreen,
} from "../lib/onlineExamScreen";
import {
  createProctorFrameDownloadUrl,
  createProctorFrameUploadUrl,
  deleteProctorFrameObject,
  proctorScreenStorageEnabled,
} from "../lib/liveScreenStorage";
import { notifyInAppMany } from "../lib/notifyInApp";
import { sendTransactionalEmail } from "../lib/mailClient";
import {
  SAMPLE_PREVIEW_EXAM_ID,
  sampleExamMeta,
  sampleQuestions,
} from "../lib/onlineExamPreviewSample";
import { getClassroomsByMember } from "../lib/classroomClient";
import { resolveStudentWindow } from "../lib/examSchedule";
import { emitLiveExamEvent } from "../lib/liveExamEvents";
import {
  assertCanConfigureExamSettings,
  assertTeacherCanAuthorExam,
  isQuizComponentType,
} from "../lib/examAuthorScope";
import { resolveExamComponentType } from "../lib/examComponentType";

export type ExamAuthorActor = { id: string; role: string };

function httpError(message: string, status: number, code?: string) {
  return Object.assign(new Error(message), { status, code });
}

function stripCorrectFromQuestion(q: any, includeKeys: boolean) {
  return {
    id: q.id,
    examId: q.examId,
    schoolId: q.schoolId,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    orderIndex: q.orderIndex,
    caseSensitive: q.caseSensitive,
    ...(includeKeys
      ? { correctAnswer: q.correctAnswer }
      : {}),
    choices: (q.choices || []).map((c: any) => ({
      id: c.id,
      label: c.label,
      text: c.text,
      orderIndex: c.orderIndex,
      ...(includeKeys ? { isCorrect: c.isCorrect } : {}),
    })),
  };
}

function toScoreable(questions: any[]): ScoreableQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    type: q.type,
    points: q.points,
    correctAnswer: q.correctAnswer,
    caseSensitive: q.caseSensitive,
    choices: (q.choices || []).map((c: any) => ({
      id: c.id,
      isCorrect: c.isCorrect,
    })),
  }));
}

type PreviewExamMeta = {
  source: "exam" | "sample";
  id: string;
  title: string;
  instructions?: string | null;
  duration?: number | null;
  maxViolations?: number | null;
  showResultsImmediately?: boolean | null;
};

/** Score a set of answers against questions without persists or notifications. */
function buildPreviewResult(
  questions: any[],
  answersInput: any[],
  exam: PreviewExamMeta
) {
  const qById = new Map(questions.map((q) => [q.id, q]));
  const clean: ScoreableAnswer[] = [];

  for (const row of Array.isArray(answersInput) ? answersInput : []) {
    const q = qById.get(String(row?.questionId ?? ""));
    if (!q) continue;
    let selectedChoiceId: string | null = null;
    let textAnswer: string | null = null;
    if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
      const cid = row?.selectedChoiceId ? String(row.selectedChoiceId) : null;
      if (cid && (q.choices || []).some((c: any) => c.id === cid)) {
        selectedChoiceId = cid;
      }
    } else {
      textAnswer =
        row?.textAnswer === undefined || row?.textAnswer === null
          ? null
          : String(row.textAnswer).slice(0, 10000);
    }
    clean.push({ questionId: q.id, selectedChoiceId, textAnswer });
  }

  const summary = summarizeAttemptScore(toScoreable(questions), clean);
  const answerByQ = new Map(clean.map((a) => [a.questionId, a]));
  const scoreByQ = new Map(summary.perQuestion.map((r) => [r.questionId, r]));

  return {
    preview: true,
    source: exam.source,
    exam: {
      id: exam.id,
      title: exam.title,
      instructions: exam.instructions ?? null,
      duration: exam.duration ?? null,
      maxViolations: exam.maxViolations ?? null,
      showResultsImmediately: exam.showResultsImmediately ?? null,
    },
    attempt: {
      id: exam.source === "sample" ? SAMPLE_PREVIEW_EXAM_ID : exam.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      submitReason: "PREVIEW",
      violationCount: 0,
      score: summary.score,
      maxScore: summary.maxScore,
      passedCount: summary.passedCount,
      missedCount: summary.missedCount,
      pendingCount: summary.pendingCount,
    },
    questions: questions.map((q) => {
      const a = answerByQ.get(q.id);
      const row = scoreByQ.get(q.id);
      return {
        ...stripCorrectFromQuestion(q, true),
        answer: {
          selectedChoiceId: a?.selectedChoiceId ?? null,
          textAnswer: a?.textAnswer ?? null,
          isCorrect: row?.isCorrect ?? null,
          pointsAwarded: row?.pointsAwarded ?? null,
          pending: Boolean(row?.pending),
          answered: Boolean(a),
        },
      };
    }),
  };
}

async function loadExamOrThrow(examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw httpError("Exam not found", 404);
  return exam;
}

async function loadAttemptOrThrow(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      answers: true,
      violations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!attempt) throw httpError("Attempt not found", 404);
  return attempt;
}

async function finalizeAttempt(
  attemptId: string,
  reason: string,
  status: "SUBMITTED" | "AUTO_SUBMITTED" | "EXPIRED"
) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      answers: true,
    },
  });
  if (!attempt) throw httpError("Attempt not found", 404);
  if (attempt.status !== "IN_PROGRESS") {
    return attempt;
  }

  const questions = await prisma.examQuestion.findMany({
    where: { examId: attempt.examId, schoolId: attempt.schoolId },
    include: { choices: true },
    orderBy: { orderIndex: "asc" },
  });

  const summary = summarizeAttemptScore(
    toScoreable(questions),
    attempt.answers.map(
      (a): ScoreableAnswer => ({
        questionId: a.questionId,
        selectedChoiceId: a.selectedChoiceId,
        textAnswer: a.textAnswer,
      })
    )
  );

  await prisma.$transaction(async (tx) => {
    for (const row of summary.perQuestion) {
      await tx.examAnswer.updateMany({
        where: {
          attemptId,
          questionId: row.questionId,
          schoolId: attempt.schoolId,
        },
        data: {
          isCorrect: row.isCorrect,
          pointsAwarded: row.pointsAwarded,
        },
      });
    }

await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status,
          submittedAt: new Date(),
          submitReason: reason,
          score: summary.score,
          maxScore: summary.maxScore,
          passedCount: summary.passedCount,
          missedCount: summary.missedCount,
          pendingCount: summary.pendingCount,
        },
      });
    });

    emitLiveExamEvent({
      type: "attempt.submitted",
      payload: {
        examId: attempt.examId,
        attemptId,
        studentId: attempt.studentId,
        submittedAt: new Date(),
        autoSubmitted: status === "AUTO_SUBMITTED" || status === "EXPIRED",
      },
    });

    // A submitted/expired attempt with no pending (essay) answers is final;
    // mixed exams become final only after essays are marked (see markEssayAnswer).
    if (summary.pendingCount === 0) {
      emitLiveExamEvent({
        type: "attempt.final",
        payload: {
          examId: attempt.examId,
          attemptId,
          studentId: attempt.studentId,
          finalAt: new Date(),
          autoSubmitted: status === "AUTO_SUBMITTED" || status === "EXPIRED",
        },
      });
      // Phase 4: auto-post the final grade (respects Exam.autoPostGrades).
      await autoPostGradeForAttempt(attemptId);
    }

    const parents = await getStudentParentIds(attempt.studentId);
  if (parents.length) {
    const title =
      status === "AUTO_SUBMITTED"
        ? "Exam auto-submitted"
        : status === "EXPIRED"
          ? "Exam time expired"
          : "Exam submitted";
    await notifyInAppMany(
      parents.map((parentId) => ({
        schoolId: attempt.schoolId,
        userId: parentId,
        eventKey: "ONLINE_EXAM_SUBMITTED",
        title,
        body: `${attempt.exam.title}: ${summary.score}/${summary.maxScore} (passed ${summary.passedCount}, missed ${summary.missedCount})`,
        href: `/exams/${attempt.examId}`,
        meta: {
          examId: attempt.examId,
          attemptId: attempt.id,
          studentId: attempt.studentId,
          status,
        },
      }))
    );
  }

  if (
    process.env.ONLINE_EXAM_PROCTOR_EMAIL === "1" &&
    status === "AUTO_SUBMITTED" &&
    String(reason).includes("MAX_VIOLATIONS")
  ) {
    void notifyProctorViolationEmail(attempt, reason);
  }

  return prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true, answers: true, violations: true },
  });
}

async function notifyProctorViolationEmail(
  attempt: { schoolId: string; examId: string; studentId: string; id: string; violationCount: number },
  reason: string
) {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: attempt.examId } });
    if (!exam) return;

    const recipients = new Set<string>();
    const admins = await getIdentityUsersByRoles(attempt.schoolId, [
      "SCHOOL_ADMIN",
      "PRINCIPAL",
      "VPI",
    ]);
    for (const u of admins) {
      if (u.email) recipients.add(u.email);
    }

    const paper = await prisma.examPaperPackage.findFirst({
      where: { examId: attempt.examId, schoolId: attempt.schoolId },
      orderBy: { revision: "desc" },
    });
    if (paper?.authorId) {
      const author = admins.find((u) => u.id === paper.authorId);
      if (author?.email) recipients.add(author.email);
    }

    if (!recipients.size) return;

    const subject = `Online exam integrity alert: ${exam.title}`;
    const text = [
      `An online exam attempt was auto-submitted after exceeding the violation limit.`,
      ``,
      `Exam: ${exam.title}`,
      `Student ID: ${attempt.studentId}`,
      `Violations: ${attempt.violationCount}`,
      `Reason: ${reason}`,
    ].join("\n");

    await Promise.all(
      [...recipients].map((to) => sendTransactionalEmail({ to, subject, text }))
    );
  } catch (err: any) {
    console.warn("[online-exam] proctor email failed:", err?.message || err);
  }
}

async function resolveStudentClassIds(
  schoolId: string,
  studentId: string
): Promise<Set<string> | null> {
  try {
    const rooms = await getClassroomsByMember(studentId, ["STUDENT"], schoolId);
    return new Set(rooms.map((r) => r.id));
  } catch (err: any) {
    console.warn(
      "[online-exam] student class scope lookup failed:",
      err?.message || err
    );
    return null;
  }
}

/**
 * Idempotently upsert exactly one GradeEntry for an online-exam attempt and
 * link it back on the attempt. Shared by single and bulk push so the logic
 * lives in one place.
 */
/** Actor recorded on auto-posted grade entries (no human teacher involved). */
const AUTO_POST_ACTOR = "system:online-exam";

type GradebookPushOptions = {
  /** Marks the history entry as auto-posted (vs a teacher-initiated push). */
  auto?: boolean;
  /** Skip rows that already hold a human-entered grade. */
  skipManualEntry?: boolean;
  /** Overwrite even a human-entered grade (explicit teacher action). */
  force?: boolean;
};

type GradebookPushResult = {
  skipped: boolean;
  reason?: string;
  gradeEntryId?: string;
  gradeEntry?: any;
};

async function pushAttemptToGradebook(
  db: any,
  exam: any,
  attempt: { id: string; studentId: string; score: number | null; maxScore: number | null },
  teacherId: string,
  schoolGradebookConfigRaw: string | null,
  opts: GradebookPushOptions = {}
): Promise<GradebookPushResult> {
  if (!exam.subjectId || !exam.classId) {
    throw httpError("Exam must have subjectId and classId to push to gradebook", 400);
  }

  const allAttempts = await db.examAttempt.findMany({
    where: {
      examId: exam.id,
      studentId: attempt.studentId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"] },
    },
    select: { score: true, maxScore: true },
  });
  const { score: rawScore, maxScore: rawMax } = resolvePublishScore(
    exam,
    attempt,
    allAttempts
  );

  const component = exam.examComponentId
    ? await db.examComponent.findUnique({
        where: { id: exam.examComponentId },
        select: {
          gradebookStructure: true,
          gradebookStructureCustom: true,
          componentType: true,
        },
      })
    : null;
  const column = resolveExamGradeColumn(component, schoolGradebookConfigRaw);
  const structureColumnId = column?.id ?? null;

  // Gradebook columns store points earned out of the column's max score.
  // Scale the raw points onto that denominator so the weighted rollup is
  // correct when the exam total differs from the column max.
  const finalScore = scaleScoreToColumn(rawScore, rawMax, column);
  const scorePercent = computeScorePercent(rawScore, rawMax);

  const schoolYear = await db.academicYear.findFirst({
    where: { schoolId: exam.schoolId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!schoolYear) {
    throw httpError("No active academic year found for this school", 400, "NO_ACTIVE_YEAR");
  }

  const existing = await db.gradeEntry.findFirst({
    where: {
      examId: exam.id,
      studentId: attempt.studentId,
      subjectId: exam.subjectId,
      classId: exam.classId,
      examComponentId: exam.examComponentId ?? null,
      structureColumnId: structureColumnId,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Never silently overwrite a human-entered grade.
  if (shouldSkipManualEntry(existing, opts)) {
    return { skipped: true, reason: "MANUAL_ENTRY_EXISTS", gradeEntryId: existing!.id };
  }

  const provenance = {
    source: "ONLINE_EXAM",
    sourceRef: attempt.id,
    rawScore,
    maxScore: rawMax,
    scorePercent,
  };

  const gradeEntry = existing
    ? await db.gradeEntry.update({
        where: { id: existing.id },
        data: {
          score: finalScore,
          status: "SUBMITTED",
          enteredBy: teacherId,
          examComponentId: exam.examComponentId ?? null,
          structureColumnId,
          isIncomplete: false,
          updatedAt: new Date(),
          ...provenance,
        },
      })
    : await db.gradeEntry.create({
        data: {
          examId: exam.id,
          studentId: attempt.studentId,
          subjectId: exam.subjectId,
          classId: exam.classId,
          schoolId: exam.schoolId,
          schoolYearId: schoolYear.id,
          score: finalScore,
          status: "SUBMITTED",
          enteredBy: teacherId,
          examComponentId: exam.examComponentId ?? null,
          structureColumnId,
          isIncomplete: false,
          ...provenance,
        },
      });

  await db.examAttempt.update({
    where: { id: attempt.id },
    data: { gradeEntryId: gradeEntry.id },
  });

  await db.gradeHistory.create({
    data: {
      gradeEntryId: gradeEntry.id,
      score: gradeEntry.score,
      status: gradeEntry.status,
      feedback: opts.auto
        ? `Auto-posted from online exam attempt ${attempt.id}`
        : `Pushed from online exam attempt ${attempt.id}`,
      changedBy: teacherId,
      changedAt: new Date(),
    },
  });

  return { skipped: false, gradeEntry };
}

/**
 * Auto-post a finalized, fully-scored attempt to the gradebook.
 * No-op unless the exam has `autoPostGrades` on, the attempt is final
 * (`pendingCount === 0`), and the exam maps to a gradebook column.
 */
async function autoPostGradeForAttempt(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) return null;
  if (!["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"].includes(attempt.status)) return null;
  if ((attempt.pendingCount ?? 0) > 0) return null;

  const exam = await prisma.exam.findUnique({ where: { id: attempt.examId } });
  if (!exam || !exam.autoPostGrades) return null;
  if (!exam.subjectId || !exam.classId) return null;

  const schoolGradebookConfigRaw = await getSchoolGradebookConfig(exam.schoolId);
  try {
    return await pushAttemptToGradebook(
      prisma,
      exam,
      {
        id: attempt.id,
        studentId: attempt.studentId,
        score: attempt.score,
        maxScore: attempt.maxScore,
      },
      AUTO_POST_ACTOR,
      schoolGradebookConfigRaw,
      { auto: true, skipManualEntry: true }
    );
  } catch (err: any) {
    console.error(`[onlineExam] auto-post grade failed for attempt ${attemptId}:`, err?.message || err);
    return null;
  }
}

/** Best-effort parse of an exam's stored kiosk config JSON (for extra fields). */
function readKioskRaw(raw: string | null | undefined): { screenFrameIntervalMs?: unknown } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Recompute an attempt's score totals from persisted per-answer points. */
async function recomputeAttemptTotals(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, examId: true, schoolId: true },
  });
  if (!attempt) throw httpError("Attempt not found", 404);

  const [questions, answers] = await Promise.all([
    prisma.examQuestion.findMany({
      where: { examId: attempt.examId, schoolId: attempt.schoolId },
      select: { id: true, points: true },
    }),
    prisma.examAnswer.findMany({
      where: { attemptId, schoolId: attempt.schoolId },
      select: { questionId: true, pointsAwarded: true, isCorrect: true },
    }),
  ]);
  const answerByQ = new Map(answers.map((a) => [a.questionId, a]));

  let score = 0;
  let maxScore = 0;
  let passedCount = 0;
  let missedCount = 0;
  let pendingCount = 0;

  for (const q of questions) {
    maxScore += Number(q.points) || 0;
    const a = answerByQ.get(q.id);
    if (!a || a.pointsAwarded === null || a.pointsAwarded === undefined) {
      pendingCount += 1;
      continue;
    }
    score += Number(a.pointsAwarded) || 0;
    if (a.isCorrect === true) passedCount += 1;
    else if (a.isCorrect === false) missedCount += 1;
  }

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { score, maxScore, passedCount, missedCount, pendingCount },
  });

  return { score, maxScore, passedCount, missedCount, pendingCount };
}

export const onlineExamService = {
  async updateOnlineConfig(
    examId: string,
    schoolId: string,
    data: any,
    actor?: ExamAuthorActor
  ) {
    const exam = await loadExamOrThrow(examId);
    if (exam.schoolId !== schoolId) throw httpError("Forbidden", 403);

    const componentType = await resolveExamComponentType(exam.examComponentId);
    const isQuiz = isQuizComponentType(componentType);

    if (actor?.role === "TEACHER") {
      await assertTeacherCanAuthorExam({
        userId: actor.id,
        schoolId,
        role: actor.role,
        exam,
      });
    }
    if (actor) {
      assertCanConfigureExamSettings(actor.role, isQuiz, data);
    }

    let duration = exam.duration;
    if (data.duration !== undefined) {
      const parsed = Math.round(Number(data.duration));
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 600) {
        throw httpError("duration must be between 1 and 600 minutes", 400);
      }
      duration = parsed;
    }

    const maxViolations =
      data.maxViolations === undefined || data.maxViolations === null
        ? exam.maxViolations
        : Math.max(0, Math.min(50, Number(data.maxViolations)));
    if (!Number.isFinite(maxViolations)) {
      throw httpError("maxViolations must be a number", 400);
    }

    let paperDueAt: Date | null = exam.paperDueAt ?? null;
    if (data.paperDueAt !== undefined) {
      if (data.paperDueAt === null || data.paperDueAt === "") {
        paperDueAt = null;
      } else {
        paperDueAt = new Date(data.paperDueAt);
        if (Number.isNaN(paperDueAt.getTime())) {
          throw httpError("Invalid paper deadline", 400);
        }
      }
    }
    if (paperDueAt && paperDueAt > exam.startDate) {
      throw httpError("Paper deadline must be on or before the exam start", 400);
    }

    let retakePolicy: string | null = exam.retakePolicy;
    if (data.retakePolicy !== undefined) {
      if (data.retakePolicy === null || data.retakePolicy === "") {
        retakePolicy = null;
      } else if (typeof data.retakePolicy === "string") {
        retakePolicy = data.retakePolicy;
      } else {
        retakePolicy = JSON.stringify(data.retakePolicy);
      }
    }

    let kioskConfig: string | null = exam.kioskConfig;
    if (data.kioskConfig !== undefined) {
      if (data.kioskConfig === null || data.kioskConfig === "") {
        kioskConfig = null;
      } else if (typeof data.kioskConfig === "string") {
        kioskConfig = data.kioskConfig;
      } else {
        kioskConfig = JSON.stringify(data.kioskConfig);
      }
    }

    const proctorLevel =
      data.proctorLevel === undefined
        ? exam.proctorLevel
        : ["OFF", "MONITOR", "SCREEN_VIEW"].includes(String(data.proctorLevel))
          ? String(data.proctorLevel)
          : "MONITOR";

    return prisma.exam.update({
      where: { id: examId },
      data: {
        isOnline: data.isOnline === undefined ? exam.isOnline : Boolean(data.isOnline),
        duration,
        maxViolations,
        paperDueAt,
        retakePolicy,
        kioskConfig,
        proctorLevel,
        autoPostGrades:
          data.autoPostGrades === undefined
            ? exam.autoPostGrades
            : Boolean(data.autoPostGrades),
        showResultsImmediately:
          data.showResultsImmediately === undefined
            ? exam.showResultsImmediately
            : Boolean(data.showResultsImmediately),
        instructions:
          data.instructions === undefined
            ? exam.instructions
            : data.instructions
              ? String(data.instructions).slice(0, 5000)
              : null,
        classId:
          data.classId === undefined
            ? exam.classId
            : data.classId
              ? String(data.classId)
              : null,
        subjectId:
          data.subjectId === undefined
            ? exam.subjectId
            : data.subjectId
              ? String(data.subjectId)
              : null,
      },
    });
  },

  async getQuestions(examId: string, includeKeys: boolean) {
    const exam = await loadExamOrThrow(examId);
    const componentType = await resolveExamComponentType(exam.examComponentId);
    const questions = await prisma.examQuestion.findMany({
      where: { examId, schoolId: exam.schoolId },
      include: { choices: { orderBy: { orderIndex: "asc" } } },
      orderBy: { orderIndex: "asc" },
    });
    return {
      exam: {
        id: exam.id,
        title: exam.title,
        isOnline: exam.isOnline,
        isQuiz: isQuizComponentType(componentType),
        componentType,
        maxViolations: exam.maxViolations,
        showResultsImmediately: exam.showResultsImmediately,
        instructions: exam.instructions,
        duration: exam.duration,
        startDate: exam.startDate,
        endDate: exam.endDate,
        classId: exam.classId,
        subjectId: exam.subjectId,
        paperDueAt: exam.paperDueAt,
        retakePolicy: exam.retakePolicy,
        proctorLevel: exam.proctorLevel,
        kioskConfig: parseKioskConfig(exam.kioskConfig, exam.maxViolations),
        autoPostGrades: exam.autoPostGrades,
      },
      questions: questions.map((q) => stripCorrectFromQuestion(q, includeKeys)),
    };
  },

  /** Staff-only dry run of a real exam: no answer keys until the score response. */
  async getExamPreview(examId: string, schoolId: string) {
    const exam = await loadExamOrThrow(examId);
    if (exam.schoolId !== schoolId) throw httpError("Forbidden", 403);
    const questions = await prisma.examQuestion.findMany({
      where: { examId, schoolId: exam.schoolId },
      include: { choices: { orderBy: { orderIndex: "asc" } } },
      orderBy: { orderIndex: "asc" },
    });
    return {
      preview: true,
      source: "exam",
      exam: {
        id: exam.id,
        title: exam.title,
        isOnline: exam.isOnline,
        maxViolations: exam.maxViolations,
        showResultsImmediately: exam.showResultsImmediately,
        instructions: exam.instructions,
        duration: exam.duration,
        startDate: exam.startDate,
        endDate: exam.endDate,
        classId: exam.classId,
        subjectId: exam.subjectId,
        paperDueAt: exam.paperDueAt,
      },
      questions: questions.map((q) => stripCorrectFromQuestion(q, false)),
    };
  },

  /** Staff-only scoring of a real exam dry run: no attempt rows, no notifications. */
  async scoreExamPreview(examId: string, schoolId: string, answersInput: any[]) {
    const exam = await loadExamOrThrow(examId);
    if (exam.schoolId !== schoolId) throw httpError("Forbidden", 403);
    const questions = await prisma.examQuestion.findMany({
      where: { examId, schoolId },
      include: { choices: { orderBy: { orderIndex: "asc" } } },
      orderBy: { orderIndex: "asc" },
    });
    return buildPreviewResult(questions, answersInput, {
      source: "exam",
      id: exam.id,
      title: exam.title,
      instructions: exam.instructions,
      duration: exam.duration,
      maxViolations: exam.maxViolations,
      showResultsImmediately: exam.showResultsImmediately,
    });
  },

  /** Built-in demo paper for the student-experience preview. */
  async getSamplePreview() {
    const exam = sampleExamMeta();
    return {
      preview: true,
      source: "sample",
      exam: {
        id: exam.id,
        title: exam.title,
        instructions: exam.instructions,
        duration: exam.duration,
        maxViolations: exam.maxViolations,
        showResultsImmediately: exam.showResultsImmediately,
      },
      questions: sampleQuestions().map((q) => stripCorrectFromQuestion(q, false)),
    };
  },

  /** Score the built-in demo paper without touching any attempt records. */
  async scoreSamplePreview(answersInput: any[]) {
    const exam = sampleExamMeta();
    return buildPreviewResult(sampleQuestions(), answersInput, {
      source: "sample",
      id: exam.id,
      title: exam.title,
      instructions: exam.instructions,
      duration: exam.duration,
      maxViolations: exam.maxViolations,
      showResultsImmediately: exam.showResultsImmediately,
    });
  },

  /**
   * Shared guard for question edits (manual save + spreadsheet import).
   * Returns the exam after checking tenant, legacy paper approval, the paper
   * approval lock, and in-progress attempts.
   */
  async assertQuestionsEditable(examId: string, schoolId: string) {
    const exam = await loadExamOrThrow(examId);
    if (exam.schoolId !== schoolId) throw httpError("Forbidden", 403);

    const { ensureLegacyPaperApproved } = await import("./examPaperService");
    await ensureLegacyPaperApproved(examId, schoolId);
    const head = await prisma.examPaperPackage.findFirst({
      where: { examId },
      orderBy: { revision: "desc" },
    });
    if (head && !["DRAFT", "RETURNED"].includes(head.status)) {
      throw httpError(
        "Questions can only be edited while the paper is Draft or Returned",
        409,
        "PAPER_LOCKED"
      );
    }

    const inProgress = await prisma.examAttempt.count({
      where: { examId, status: "IN_PROGRESS" },
    });
    if (inProgress > 0) {
      throw httpError(
        "Cannot edit questions while students have an in-progress attempt",
        409,
        "ATTEMPTS_IN_PROGRESS"
      );
    }

    return exam;
  },

  /** Destructive replace of an exam's question set inside one transaction. */
  async persistQuestions(
    examId: string,
    schoolId: string,
    normalized: NormalizedQuestion[],
    forceOnline: boolean
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.examQuestion.deleteMany({ where: { examId, schoolId } });
      for (const q of normalized) {
        await tx.examQuestion.create({
          data: {
            examId,
            schoolId,
            type: q.type,
            prompt: q.prompt,
            points: q.points,
            orderIndex: q.orderIndex,
            correctAnswer: q.correctAnswer,
            caseSensitive: q.caseSensitive,
            choices: q.choices.length
              ? {
                  create: q.choices.map((c, ci) => ({
                    schoolId,
                    label: c.label,
                    text: c.text,
                    isCorrect: c.isCorrect,
                    orderIndex: ci,
                  })),
                }
              : undefined,
          },
        });
      }
      if (forceOnline) {
        await tx.exam.update({
          where: { id: examId },
          data: { isOnline: true },
        });
      }
    });
  },

  /** Non-throwing edit blockers for the import preview (403 still propagates). */
  async collectQuestionEditBlockers(examId: string, schoolId: string) {
    try {
      await this.assertQuestionsEditable(examId, schoolId);
      return { blockers: [] as string[], code: null as string | null };
    } catch (err: any) {
      if (err?.status === 403) throw err;
      return { blockers: [err?.message || "This paper cannot be edited"], code: err?.code || null };
    }
  },

  async replaceQuestions(
    examId: string,
    schoolId: string,
    questionsInput: any[],
    actor?: ExamAuthorActor
  ) {
    const exam = await this.assertQuestionsEditable(examId, schoolId);

    if (actor?.role === "TEACHER") {
      await assertTeacherCanAuthorExam({
        userId: actor.id,
        schoolId,
        role: actor.role,
        exam,
      });
    }

    if (!Array.isArray(questionsInput)) {
      throw httpError("questions must be an array", 400);
    }
    if (questionsInput.length > MAX_QUESTIONS) {
      throw httpError(`Maximum ${MAX_QUESTIONS} questions per exam`, 400);
    }

    const normalized = questionsInput.map((raw, index) => {
      const result = normalizeQuestion(raw, index);
      if (!result.ok || !result.normalized) {
        throw httpError(`Question ${index + 1}: ${result.errors[0]}`, 400);
      }
      return result.normalized;
    });

    await this.persistQuestions(examId, schoolId, normalized, !exam.isOnline);

    return this.getQuestions(examId, true);
  },

  /**
   * Validate an uploaded spreadsheet without writing anything. Returns
   * per-row results plus human-readable blockers (paper locked, attempts in
   * progress, too many questions) so the UI can explain why import is blocked.
   */
  async previewQuestionImport(examId: string, schoolId: string, rows: Record<string, unknown>[]) {
    const { blockers, code } = await this.collectQuestionEditBlockers(examId, schoolId);
    const validation = validateImportRows(rows);

    let blockingCode = code;
    if (validation.validCount > MAX_QUESTIONS) {
      blockers.push(
        `This exam can hold at most ${MAX_QUESTIONS} questions, but the file has ${validation.validCount}.`
      );
      blockingCode = blockingCode || "TOO_MANY_QUESTIONS";
    }

    return {
      ok: blockers.length === 0 && validation.errorCount === 0,
      canImport: blockers.length === 0 && validation.errorCount === 0,
      rowCount: validation.rowCount,
      validCount: validation.validCount,
      errorCount: validation.errorCount,
      rows: serializeImportRows(validation.rows),
      blockers,
      code: blockingCode,
    };
  },

  /**
   * Authoritative import: re-validates the rows, enforces the same locks as the
   * manual editor, then atomically replaces the exam's questions.
   */
  async importQuestions(
    examId: string,
    schoolId: string,
    rows: Record<string, unknown>[],
    actor?: ExamAuthorActor
  ) {
    const exam = await this.assertQuestionsEditable(examId, schoolId);

    if (actor?.role === "TEACHER") {
      await assertTeacherCanAuthorExam({
        userId: actor.id,
        schoolId,
        role: actor.role,
        exam,
      });
    }

    const validation = validateImportRows(rows);

    if (validation.validCount > MAX_QUESTIONS) {
      throw httpError(
        `This exam can hold at most ${MAX_QUESTIONS} questions`,
        400,
        "TOO_MANY_QUESTIONS"
      );
    }
    if (validation.errorCount > 0) {
      const err: any = httpError(
        "Some rows could not be imported. Fix the highlighted rows and try again.",
        422,
        "IMPORT_VALIDATION"
      );
      err.rows = serializeImportRows(validation.rows);
      throw err;
    }
    if (validation.validCount === 0) {
      throw httpError("No questions were found in the file", 400, "EMPTY_IMPORT");
    }

    await this.persistQuestions(examId, schoolId, validation.validQuestions, !exam.isOnline);

    return this.getQuestions(examId, true);
  },

  async listOnlineExamsForStudent(schoolId: string, studentId: string) {
    const { examPaperService, ensureLegacyPaperApproved } = await import(
      "./examPaperService"
    );
    const now = new Date();
    const exams = await prisma.exam.findMany({
      where: {
        schoolId,
        deliveryMode: { in: ["ONLINE", "HYBRID"] },
        endDate: { gte: now },
      },
      include: {
        _count: { select: { questions: true } },
        schedules: { select: { classId: true, startAt: true, endAt: true } },
        attempts: {
          where: { studentId },
          orderBy: { attemptNumber: "desc" },
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            score: true,
            maxScore: true,
            passedCount: true,
            missedCount: true,
            pendingCount: true,
            submittedAt: true,
            endsAt: true,
            violationCount: true,
          },
        },
      },
      orderBy: { endDate: "asc" },
    });

    const out: any[] = [];
    let studentClassIds: Set<string> | null | undefined;
    for (const e of exams) {
      // Audience scoping: an exam targets one or more classes via Exam.classId
      // and/or its per-sitting ExamSchedule rows. Exams with no class target are
      // treated as school-wide. Targeted exams require membership in at least one.
      const audienceClassIds = new Set<string>();
      if (e.classId) audienceClassIds.add(e.classId);
      for (const s of e.schedules) if (s.classId) audienceClassIds.add(s.classId);
      if (audienceClassIds.size) {
        if (studentClassIds === undefined) {
          studentClassIds = await resolveStudentClassIds(schoolId, studentId);
        }
        if (!studentClassIds) continue;
        let member = false;
        for (const cid of audienceClassIds) {
          if (studentClassIds.has(cid)) {
            member = true;
            break;
          }
        }
        if (!member) continue;
      }
      await ensureLegacyPaperApproved(e.id, schoolId);
      const fresh = await prisma.exam.findUnique({ where: { id: e.id } });
      if (!fresh || fresh.paperStatus !== "APPROVED") continue;
      if (fresh.deliveryMode === "OFFLINE") continue;
      if (e._count.questions < 1) continue;

      const leg = await examPaperService.getStudentLeg(e.id, schoolId, studentId);

      // Per-student sitting window: honor class-scoped ExamSchedule rows so a
      // student only has access while their own sitting is open. The card stays
      // visible (UPCOMING/LOCKED) before the window opens.
      const win = resolveStudentWindow(
        e.schedules,
        { startDate: fresh.startDate, endDate: fresh.endDate },
        studentClassIds
      );
      const availability: "OPEN" | "UPCOMING" | "ENDED" =
        now < win.startAt ? "UPCOMING" : now > win.endAt ? "ENDED" : "OPEN";
      if (availability === "ENDED") continue;

      const canBeginOnline = leg === "ONLINE" && availability === "OPEN";

      // Get latest attempt and retake eligibility
      const latestAttempt = e.attempts[0] || null;
      const eligibility = latestAttempt && latestAttempt.status !== "IN_PROGRESS"
        ? await this.getRetakeEligibility(e.id, studentId)
        : { eligible: false, reason: "NO_ATTEMPT" };

      out.push({
        id: e.id,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        duration: e.duration,
        maxViolations: e.maxViolations,
        showResultsImmediately: e.showResultsImmediately,
        instructions: e.instructions,
        questionCount: e._count.questions,
        deliveryMode: fresh.deliveryMode,
        paperStatus: fresh.paperStatus,
        classId: e.classId,
        paperDueAt: fresh.paperDueAt,
        sittingLeg: leg,
        availability,
        scheduleStartAt: win.startAt,
        scheduleEndAt: win.endAt,
        canBeginOnline,
        attempt: latestAttempt,
        retakeEligibility: eligibility,
      });
    }
    return out;
  },

  async listAttemptsForStudent(
    schoolId: string,
    studentId: string,
    viewer: { id: string; role: string }
  ) {
    if (viewer.role === "STUDENT" && viewer.id !== studentId) {
      throw httpError("Forbidden", 403);
    }
    if (viewer.role === "PARENT") {
      const { assertParentLinked } = await import("../lib/identityClient");
      const ok = await assertParentLinked(viewer.id, studentId);
      if (!ok) throw httpError("Forbidden", 403);
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { schoolId, studentId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            isGradesReleased: true,
            showResultsImmediately: true,
            isOnline: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return attempts.map((a) => {
      const canSeeScore =
        a.status !== "IN_PROGRESS" &&
        (a.exam.showResultsImmediately || a.exam.isGradesReleased);
      return {
        id: a.id,
        examId: a.examId,
        status: a.status,
        startedAt: a.startedAt,
        endsAt: a.endsAt,
        submittedAt: a.submittedAt,
        violationCount: a.violationCount,
        submitReason: a.submitReason,
        exam: a.exam,
        ...(canSeeScore
          ? {
              score: a.score,
              maxScore: a.maxScore,
              passedCount: a.passedCount,
              missedCount: a.missedCount,
              pendingCount: a.pendingCount,
            }
          : {}),
      };
    });
  },

  async listAttemptsForExam(examId: string, schoolId: string) {
    const exam = await loadExamOrThrow(examId);
    if (exam.schoolId !== schoolId) throw httpError("Forbidden", 403);

    return prisma.examAttempt.findMany({
      where: { examId, schoolId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        studentId: true,
        status: true,
        startedAt: true,
        endsAt: true,
        submittedAt: true,
        violationCount: true,
        score: true,
        maxScore: true,
        passedCount: true,
        missedCount: true,
        pendingCount: true,
        submitReason: true,
      },
    });
  },

  async getLiveAttempts(examId: string, schoolId: string) {
    const exam = await loadExamOrThrow(examId);
    if (exam.schoolId !== schoolId) throw httpError("Forbidden", 403);

    const attempts = await prisma.examAttempt.findMany({
    where: { examId, schoolId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "asc" },
    select: {
      id: true,
      studentId: true,
      startedAt: true,
      endsAt: true,
      violationCount: true,
      lastSeenAt: true,
    },
  });
  const attemptIds = attempts.map((a) => a.id);
  const [totalQuestions, answerCounts] = await Promise.all([
    prisma.examQuestion.count({ where: { examId, schoolId } }),
    attemptIds.length
      ? prisma.examAnswer.groupBy({
          by: ["attemptId"],
          where: { attemptId: { in: attemptIds } },
          _count: { _all: true },
        })
      : Promise.resolve([] as any[]),
  ]);
  const acMap = new Map<string, number>(answerCounts.map((c: any) => [c.attemptId, c._count._all]));

    const studentIds = [...new Set(attempts.map((a) => a.studentId))];
    const userMap = await getIdentityUsersByIds(studentIds);
    const now = Date.now();
    const CONNECTED_WINDOW_MS = 90_000;

    return attempts.map((a) => {
      const user = userMap.get(a.studentId);
      const lastSeen = a.lastSeenAt ? a.lastSeenAt.getTime() : 0;
      const secondsSinceSeen = lastSeen ? Math.round((now - lastSeen) / 1000) : null;
      const connectionState =
        !a.lastSeenAt || now - lastSeen > CONNECTED_WINDOW_MS ? "DISCONNECTED" : "CONNECTED";
      return {
        id: a.id,
        studentId: a.studentId,
        studentName: user?.name || a.studentId,
        studentEmail: user?.email,
        startedAt: a.startedAt,
        endsAt: a.endsAt,
        violationCount: a.violationCount,
        answeredCount: acMap.get(a.id) || 0,
        totalQuestions,
        lastSeenAt: a.lastSeenAt,
        secondsSinceSeen,
        connectionState,
        elapsedMs: now - a.startedAt.getTime(),
        remainingMs: Math.max(0, a.endsAt.getTime() - now),
      };
    });
  },

  /** Minimal access info for Socket.IO room authorization. */
  async getAttemptAccess(attemptId: string) {
    return prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, studentId: true, schoolId: true, examId: true, status: true },
    });
  },

  /** Minimal access info for exam-feed room authorization. */
  async getExamAccess(examId: string) {
    return prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, schoolId: true },
    });
  },

  /** Emit a connection lifecycle event for a student's attempt (proctor feed). */
  async emitAttemptConnection(attemptId: string, type: "attempt.disconnected" | "attempt.reconnected") {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, examId: true, studentId: true, status: true },
    });
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    emitLiveExamEvent({
      type,
      payload: {
        examId: attempt.examId,
        attemptId: attempt.id,
        studentId: attempt.studentId,
        at: new Date(),
      },
    });
  },

  /** Proctor → student warning banner (also persisted as a lightweight trail). */
  async warnStudent(attemptId: string, schoolId: string, message: string) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.schoolId !== schoolId) throw httpError("Attempt not found", 404);
    if (attempt.status !== "IN_PROGRESS") throw httpError("Attempt is not in progress", 409);
    const text = String(message || "").slice(0, 300) || "Proctor warning: please follow exam rules.";
    emitLiveExamEvent({
      type: "attempt.warning",
      payload: { examId: attempt.examId, attemptId, message: text, at: new Date() },
    });
    return { ok: true, message: text };
  },

  async flagAttempt(attemptId: string, schoolId: string, flagged: boolean, note?: string) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.schoolId !== schoolId) throw httpError("Attempt not found", 404);
    emitLiveExamEvent({
      type: "attempt.flagged",
      payload: {
        examId: attempt.examId,
        attemptId,
        flagged,
        note: note ? String(note).slice(0, 300) : undefined,
      },
    });
    return { ok: true, flagged };
  },

  /** Proctor force-submit (audited in submitReason). */
  async forceSubmitAttempt(attemptId: string, schoolId: string, proctorId: string) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.schoolId !== schoolId) throw httpError("Attempt not found", 404);
    if (attempt.status !== "IN_PROGRESS") {
      return { ok: true, status: attempt.status };
    }
    await finalizeAttempt(attemptId, `FORCE_SUBMITTED_BY:${proctorId}`, "AUTO_SUBMITTED");
    emitLiveExamEvent({
      type: "attempt.force_submitted",
      payload: { examId: attempt.examId, attemptId, at: new Date() },
    });
    return { ok: true, status: "AUTO_SUBMITTED" };
  },

  /** Proctor time extension (audited). Caps a single extension to 180 minutes. */
  async extendAttemptTime(attemptId: string, schoolId: string, extraMinutes: number) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.schoolId !== schoolId) throw httpError("Attempt not found", 404);
    if (attempt.status !== "IN_PROGRESS") throw httpError("Attempt is not in progress", 409);
    const minutes = Math.max(1, Math.min(180, Math.trunc(Number(extraMinutes) || 0)));
    const base = attempt.endsAt > new Date() ? attempt.endsAt : new Date();
    const endsAt = new Date(base.getTime() + minutes * 60 * 1000);
    await prisma.examAttempt.update({ where: { id: attemptId }, data: { endsAt } });
    emitLiveExamEvent({
      type: "attempt.extended",
      payload: { examId: attempt.examId, attemptId, endsAt, extraMinutes: minutes },
    });
    return { ok: true, endsAt, extraMinutes: minutes };
  },

  /**
   * Manually mark an essay answer. When the last pending essay is marked the
   * attempt becomes final: emits `attempt.final` and auto-posts the grade.
   * Pass `pointsAwarded = null` to reset the answer back to pending.
   */
  async markEssayAnswer(
    attemptId: string,
    questionId: string,
    schoolId: string,
    pointsAwarded: number | null
  ) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.schoolId !== schoolId) throw httpError("Attempt not found", 404);
    if (!["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"].includes(attempt.status)) {
      throw httpError("Attempt must be submitted before marking", 409);
    }

    const question = await prisma.examQuestion.findFirst({
      where: { id: questionId, examId: attempt.examId, schoolId },
      select: { id: true, type: true, points: true },
    });
    if (!question) throw httpError("Question not found", 404);
    if (String(question.type).toUpperCase() !== "ESSAY") {
      throw httpError("Only essay answers can be marked manually", 400);
    }

    const max = Number(question.points) || 0;
    const pendingReset = pointsAwarded === null || pointsAwarded === undefined;
    const points = pendingReset
      ? null
      : Math.max(0, Math.min(max, Number(pointsAwarded) || 0));
    const isCorrect = pendingReset ? null : max > 0 && points === max;

    await prisma.examAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { pointsAwarded: points, isCorrect },
      create: { attemptId, questionId, schoolId, pointsAwarded: points, isCorrect },
    });

    const totals = await recomputeAttemptTotals(attemptId);

    if (totals.pendingCount === 0) {
      emitLiveExamEvent({
        type: "attempt.final",
        payload: {
          examId: attempt.examId,
          attemptId,
          studentId: attempt.studentId,
          finalAt: new Date(),
          autoSubmitted: false,
        },
      });
      await autoPostGradeForAttempt(attemptId);
    }

    return { ok: true, ...totals };
  },

  /** Screen-capture config for the student agent (SCREEN_VIEW + consent). */
  async getScreenCaptureConfig(attemptId: string, studentId: string) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: { select: { proctorLevel: true, kioskConfig: true } } },
    });
    if (!attempt || attempt.studentId !== studentId) throw httpError("Attempt not found", 404);

    const intervalMs = resolveFrameIntervalMs(readKioskRaw(attempt.exam.kioskConfig));
    const storageEnabled = proctorScreenStorageEnabled();
    const consented = Boolean(attempt.screenShareConsentedAt);
    return {
      proctorLevel: attempt.exam.proctorLevel,
      consented,
      storageEnabled,
      intervalMs,
      enabled: shouldCaptureScreen({
        proctorLevel: attempt.exam.proctorLevel,
        consented,
        storageEnabled,
      }),
    };
  },

  /** Issue a presigned upload for a student screen frame (SCREEN_VIEW only). */
  async createScreenFrameUpload(
    attemptId: string,
    studentId: string,
    schoolId: string,
    mimeType?: string
  ) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: { select: { proctorLevel: true } } },
    });
    if (!attempt || attempt.studentId !== studentId || attempt.schoolId !== schoolId) {
      throw httpError("Attempt not found", 404);
    }
    if (attempt.status !== "IN_PROGRESS") throw httpError("Attempt is not in progress", 409);
    if (!capturesScreen(attempt.exam.proctorLevel)) {
      throw httpError("Screen capture is not enabled for this exam", 403);
    }
    if (!attempt.screenShareConsentedAt) {
      throw httpError("Screen sharing consent is required", 403, "SCREEN_SHARE_CONSENT_REQUIRED");
    }
    if (!proctorScreenStorageEnabled()) {
      return { enabled: false as const };
    }

    const capturedAt = new Date();
    const upload = await createProctorFrameUploadUrl({
      schoolId: attempt.schoolId,
      examId: attempt.examId,
      attemptId: attempt.id,
      at: capturedAt,
      mimeType,
    });
    const expiresAt = computeFrameExpiry(
      capturedAt,
      resolveRetentionDays(process.env.PROCTOR_FRAME_RETENTION_DAYS)
    );

    const frame = await prisma.examProctorFrame.create({
      data: {
        attemptId: attempt.id,
        examId: attempt.examId,
        schoolId: attempt.schoolId,
        storageKey: upload.storageKey,
        contentType: upload.contentType,
        capturedAt,
        expiresAt,
      },
      select: { id: true },
    });

    return {
      enabled: true as const,
      frameId: frame.id,
      uploadUrl: upload.uploadUrl,
      storageKey: upload.storageKey,
      contentType: upload.contentType,
      expiresIn: upload.expiresIn,
    };
  },

  /** Confirm a frame upload and notify proctors. */
  async markScreenFrameUploaded(
    attemptId: string,
    frameId: string,
    studentId: string,
    byteSize?: number
  ) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, studentId: true, examId: true },
    });
    if (!attempt || attempt.studentId !== studentId) throw httpError("Attempt not found", 404);

    const frame = await prisma.examProctorFrame.findFirst({
      where: { id: frameId, attemptId },
    });
    if (!frame) throw httpError("Frame not found", 404);

    const updated = await prisma.examProctorFrame.update({
      where: { id: frame.id },
      data: {
        uploadedAt: new Date(),
        byteSize: Number.isFinite(byteSize) ? Math.trunc(Number(byteSize)) : undefined,
      },
    });

    emitLiveExamEvent({
      type: "screen.frame",
      payload: {
        examId: attempt.examId,
        attemptId: attempt.id,
        storageKey: updated.storageKey,
        capturedAt: updated.capturedAt,
      },
    });

    return { ok: true };
  },

  /** List recent uploaded frames for a proctor with short-lived signed URLs. */
  async listProctorFrames(attemptId: string, schoolId: string) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, schoolId: true },
    });
    if (!attempt || attempt.schoolId !== schoolId) throw httpError("Attempt not found", 404);

    const frames = await prisma.examProctorFrame.findMany({
      where: { attemptId, uploadedAt: { not: null }, expiresAt: { gt: new Date() } },
      orderBy: { capturedAt: "desc" },
      take: 30,
      select: { id: true, capturedAt: true, storageKey: true, byteSize: true },
    });

    const withUrls = await Promise.all(
      frames.map(async (f) => ({
        id: f.id,
        capturedAt: f.capturedAt,
        byteSize: f.byteSize,
        url: await createProctorFrameDownloadUrl(f.storageKey, 300),
      }))
    );
    return withUrls.filter((f) => f.url);
  },

  /** Delete frames past their retention deadline (object + row). */
  async purgeExpiredProctorFrames(limit?: number) {
    const batch = limit ?? (Number(process.env.EXAM_FRAME_PURGE_BATCH_SIZE) || 2000);
    const conc = Number(process.env.EXAM_FRAME_PURGE_CONCURRENCY) || 20;
    const expired = await prisma.examProctorFrame.findMany({
      where: { expiresAt: { lte: new Date() } },
      take: batch,
      select: { id: true, storageKey: true, expiresAt: true },
      orderBy: { expiresAt: "asc" },
    });
    if (!expired.length) return { purged: 0 };
    const results = await mapLimit(expired, conc, async (f) => {
      if (!isFrameExpired(f.expiresAt)) return null;
      try {
        await deleteProctorFrameObject(f.storageKey);
        return f.id;
      } catch (e: any) {
        console.warn("[online-exam] purge s3 delete failed:", f.id, e?.message || e);
        return null;
      }
    });
    const succeeded = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((x): x is string => !!x);
    if (succeeded.length) {
      await prisma.examProctorFrame.deleteMany({ where: { id: { in: succeeded } } });
    }
    return { purged: succeeded.length };
  },

  /** Check if student is eligible for a retake based on exam's retakePolicy. */
  async getRetakeEligibility(examId: string, studentId: string) {
    const exam = await loadExamOrThrow(examId);
    if (!exam.retakePolicy) {
      return { eligible: false, reason: "NO_RETAKE_POLICY" };
    }

    let policy: { maxRetakes?: number; waitingPeriodHours?: number; scoreRetention?: string };
    try {
      policy = JSON.parse(exam.retakePolicy);
    } catch {
      return { eligible: false, reason: "INVALID_RETAKE_POLICY" };
    }

    const maxRetakes = policy.maxRetakes ?? 0;
    if (maxRetakes <= 0) {
      return { eligible: false, reason: "RETAKES_DISABLED" };
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { examId, studentId },
      orderBy: { attemptNumber: "asc" },
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        submittedAt: true,
        score: true,
        maxScore: true,
      },
    });

    if (attempts.length === 0) {
      return { eligible: true, nextAttemptNumber: 1, reason: "FIRST_ATTEMPT", isFirstAttempt: true };
    }

    const completedAttempts = attempts.filter((a) => a.status !== "IN_PROGRESS");
    if (completedAttempts.length >= maxRetakes) {
      return { eligible: false, reason: "MAX_RETAKES_REACHED", attemptsUsed: completedAttempts.length, maxRetakes };
    }

    const lastAttempt = completedAttempts[completedAttempts.length - 1];
    const waitingPeriodHours = policy.waitingPeriodHours ?? 0;
    if (waitingPeriodHours > 0 && lastAttempt.submittedAt) {
      const waitUntil = new Date(lastAttempt.submittedAt.getTime() + waitingPeriodHours * 60 * 60 * 1000);
      if (new Date() < waitUntil) {
        return { eligible: false, reason: "WAITING_PERIOD", waitUntil: waitUntil.toISOString() };
      }
    }

    const inProgress = attempts.find((a) => a.status === "IN_PROGRESS");
    if (inProgress) {
      return { eligible: false, reason: "ATTEMPT_IN_PROGRESS", attemptId: inProgress.id };
    }

    return { eligible: true, nextAttemptNumber: completedAttempts.length + 1, isFirstAttempt: false };
  },

  /** Start a new attempt (first or retake). Returns existing in-progress attempt if any. */
  async startAttempt(
    examId: string,
    studentId: string,
    schoolId: string,
    accepted: boolean = false,
    screenShareConsented: boolean = false
  ) {
    const { examPaperService } = await import("./examPaperService");
    await examPaperService.assertCanStartOnline(examId, schoolId, studentId);

    const exam = await loadExamOrThrow(examId);
    if (exam.schoolId !== schoolId) throw httpError("Forbidden", 403);
    if (!exam.isOnline && exam.deliveryMode !== "HYBRID" && exam.deliveryMode !== "ONLINE") {
      throw httpError("This exam is not available online", 400);
    }

    if (!accepted) {
      throw httpError(
        "You must accept the exam instructions before starting",
        400,
        "INSTRUCTIONS_REQUIRED"
      );
    }

    const kiosk = parseKioskConfig(exam.kioskConfig, exam.maxViolations);
    const needsScreenConsent = kiosk.requireScreenShare || capturesScreen(exam.proctorLevel);
    if (needsScreenConsent && !screenShareConsented) {
      throw httpError(
        "This exam requires screen-share consent before starting",
        400,
        "SCREEN_SHARE_CONSENT_REQUIRED"
      );
    }

    const now = new Date();
    if (now < exam.startDate) throw httpError("Exam has not started yet", 400);
    if (now > exam.endDate) throw httpError("Exam window has ended", 400);

    const questionCount = await prisma.examQuestion.count({
      where: { examId, schoolId },
    });
    if (questionCount === 0) {
      throw httpError("Exam has no questions yet", 400);
    }

    // Audience scoping: enforce membership when the exam targets specific
    // classes (via Exam.classId and/or its ExamSchedule rows). No target = school-wide.
    const scheduleClasses = await prisma.examSchedule.findMany({
      where: { examId, schoolId },
      select: { classId: true, startAt: true, endAt: true },
    });
    const audienceClassIds = new Set<string>();
    if (exam.classId) audienceClassIds.add(exam.classId);
    for (const s of scheduleClasses) if (s.classId) audienceClassIds.add(s.classId);
    let studentClasses: Set<string> | null = null;
    if (audienceClassIds.size) {
      studentClasses = await resolveStudentClassIds(schoolId, studentId);
      let member = false;
      if (studentClasses) {
        for (const cid of audienceClassIds) {
          if (studentClasses.has(cid)) {
            member = true;
            break;
          }
        }
      }
      if (!member) {
        throw httpError("You are not enrolled in this exam's class", 403, "NOT_IN_AUDIENCE");
      }
    }

    // Per-student sitting window: a class-scoped schedule limits access to that
    // sitting. Fall back to the exam envelope when no schedule matches.
    const win = resolveStudentWindow(scheduleClasses, { startDate: exam.startDate, endDate: exam.endDate }, studentClasses);
    if (now < win.startAt) {
      throw httpError("Your exam sitting has not started yet", 403, "SITTING_NOT_OPENED");
    }
    if (now > win.endAt) {
      throw httpError("Your exam sitting window has ended", 403, "SITTING_ENDED");
    }

    // Check for existing in-progress attempt
    const inProgress = await prisma.examAttempt.findFirst({
      where: { examId, studentId, status: "IN_PROGRESS" },
      orderBy: { attemptNumber: "desc" },
    });
    if (inProgress) {
      if (now > inProgress.endsAt) {
        await finalizeAttempt(inProgress.id, "TIME_EXPIRED", "EXPIRED");
        throw httpError("Previous attempt expired", 409, "ATTEMPT_EXPIRED");
      }
      await prisma.examAttempt.update({
        where: { id: inProgress.id },
        data: { lastSeenAt: now },
      });
      return this.getAttemptForStudent(inProgress.id, studentId);
    }

    // Check retake eligibility
    const eligibility = await this.getRetakeEligibility(examId, studentId);
    if (!eligibility.eligible) {
      throw httpError(this.getRetakeErrorMessage(eligibility.reason), 409, eligibility.reason);
    }

    const endsAt = computeEndsAt(now, exam.duration, win.endAt);
    const attempt = await prisma.examAttempt.create({
      data: {
        examId,
        studentId,
        schoolId,
        attemptNumber: eligibility.nextAttemptNumber || 1,
        status: "IN_PROGRESS",
        startedAt: now,
        endsAt,
        instructionsAcceptedAt: now,
        screenShareConsentedAt: needsScreenConsent ? now : null,
        lastSeenAt: now,
      },
    });

    emitLiveExamEvent({
      type: "attempt.started",
      payload: { examId, attemptId: attempt.id, studentId, startedAt: now, attemptNumber: attempt.attemptNumber },
    });

    return this.getAttemptForStudent(attempt.id, studentId);
  },

  getRetakeErrorMessage(reason: string): string {
    switch (reason) {
      case "NO_RETAKE_POLICY":
        return "Retakes are not enabled for this exam";
      case "RETAKES_DISABLED":
        return "Retakes are disabled for this exam";
      case "MAX_RETAKES_REACHED":
        return "Maximum retakes reached for this exam";
      case "WAITING_PERIOD":
        return "You must wait before retaking this exam";
      case "ATTEMPT_IN_PROGRESS":
        return "You already have an attempt in progress";
      case "INVALID_RETAKE_POLICY":
        return "Retake policy is misconfigured";
      default:
        return "You have already completed this exam";
    }
  },

  async getAttemptForStudent(attemptId: string, studentId: string) {
    const attempt = await loadAttemptOrThrow(attemptId);
    if (attempt.studentId !== studentId) throw httpError("Forbidden", 403);

    const now = new Date();
    if (attempt.status === "IN_PROGRESS" && now > attempt.endsAt) {
      await finalizeAttempt(attempt.id, "TIME_EXPIRED", "EXPIRED");
      return this.getResults(attemptId, { id: studentId, role: "STUDENT" });
    }

    const questions = await prisma.examQuestion.findMany({
      where: { examId: attempt.examId, schoolId: attempt.schoolId },
      include: { choices: { orderBy: { orderIndex: "asc" } } },
      orderBy: { orderIndex: "asc" },
    });

    const includeKeys = attempt.status !== "IN_PROGRESS";
    const canSeeScore =
      attempt.status !== "IN_PROGRESS" &&
      (attempt.exam.showResultsImmediately || attempt.exam.isGradesReleased);

    return {
      attempt: {
        id: attempt.id,
        examId: attempt.examId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        endsAt: attempt.endsAt,
        submittedAt: attempt.submittedAt,
        violationCount: attempt.violationCount,
        maxViolations: attempt.exam.maxViolations,
        serverNow: now.toISOString(),
        ...(canSeeScore
          ? {
              score: attempt.score,
              maxScore: attempt.maxScore,
              passedCount: attempt.passedCount,
              missedCount: attempt.missedCount,
              pendingCount: attempt.pendingCount,
              submitReason: attempt.submitReason,
            }
          : {}),
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        instructions: attempt.exam.instructions,
        duration: attempt.exam.duration,
        maxViolations: attempt.exam.maxViolations,
        proctorLevel: attempt.exam.proctorLevel,
        kiosk: parseKioskConfig(attempt.exam.kioskConfig, attempt.exam.maxViolations),
      },
      questions: questions.map((q) => stripCorrectFromQuestion(q, includeKeys && canSeeScore)),
      answers: attempt.answers.map((a) => ({
        questionId: a.questionId,
        selectedChoiceId: a.selectedChoiceId,
        textAnswer: a.textAnswer,
        ...(canSeeScore
          ? { isCorrect: a.isCorrect, pointsAwarded: a.pointsAwarded }
          : {}),
      })),
      violations: attempt.violations.map((v) => ({
        id: v.id,
        type: v.type,
        detail: v.detail,
        createdAt: v.createdAt,
      })),
    };
  },

  /** School-scoped attempt lookup for staff (proctor / teacher / admin). */
  async getAttemptForStaff(attemptId: string, schoolId: string) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.schoolId !== schoolId) {
      throw httpError("Attempt not found", 404);
    }
    return attempt;
  },

  async saveAnswers(
    attemptId: string,
    studentId: string,
    answersInput: { questionId: string; selectedChoiceId?: string | null; textAnswer?: string | null }[]
  ) {
    const attempt = await loadAttemptOrThrow(attemptId);
    if (attempt.studentId !== studentId) throw httpError("Forbidden", 403);
    if (attempt.status !== "IN_PROGRESS") {
      throw httpError("Attempt is no longer editable", 409);
    }

    const now = new Date();
    if (now > attempt.endsAt) {
      await finalizeAttempt(attempt.id, "TIME_EXPIRED", "EXPIRED");
      throw httpError("Time expired", 409, "TIME_EXPIRED");
    }

    if (!Array.isArray(answersInput) || answersInput.length === 0) {
      return { ok: true };
    }
    if (answersInput.length > 100) throw httpError("Too many answers", 400);

    const questions = await prisma.examQuestion.findMany({
      where: { examId: attempt.examId, schoolId: attempt.schoolId },
      include: { choices: true },
    });
    const qById = new Map(questions.map((q) => [q.id, q]));

    await prisma.$transaction(async (tx) => {
      for (const row of answersInput) {
        const q = qById.get(row.questionId);
        if (!q) continue;
        let selectedChoiceId: string | null = null;
        let textAnswer: string | null = null;
        if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
          const cid = row.selectedChoiceId ? String(row.selectedChoiceId) : null;
          if (cid && q.choices.some((c) => c.id === cid)) selectedChoiceId = cid;
        } else {
          textAnswer =
            row.textAnswer === undefined || row.textAnswer === null
              ? null
              : String(row.textAnswer).slice(0, 10000);
        }

        await tx.examAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: q.id,
            },
          },
          create: {
            attemptId,
            questionId: q.id,
            schoolId: attempt.schoolId,
            selectedChoiceId,
            textAnswer,
          },
          update: {
            selectedChoiceId,
            textAnswer,
          },
        });
      }
    });

    // Compute the true total answered count (delta flushes only carry changed
    // questions, so counting the input batch alone would under-report).
    const merged = new Map<string, { selectedChoiceId?: string | null; textAnswer?: string | null }>();
    for (const a of attempt.answers) {
      merged.set(a.questionId, { selectedChoiceId: a.selectedChoiceId, textAnswer: a.textAnswer });
    }
    for (const a of answersInput) {
      if (!qById.has(a.questionId)) continue;
      merged.set(a.questionId, { selectedChoiceId: a.selectedChoiceId, textAnswer: a.textAnswer });
    }
    let answeredCount = 0;
    for (const a of merged.values()) {
      if (a.selectedChoiceId != null || (a.textAnswer != null && a.textAnswer !== "")) answeredCount += 1;
    }
    emitLiveExamEvent({
      type: "attempt.answered",
      payload: { examId: attempt.examId, attemptId, answeredCount },
    });

    return { ok: true, serverNow: now.toISOString(), endsAt: attempt.endsAt };
  },

  async reportViolation(
    attemptId: string,
    studentId: string,
    type: string,
    detail?: string
  ) {
    const attempt = await loadAttemptOrThrow(attemptId);
    if (attempt.studentId !== studentId) throw httpError("Forbidden", 403);
    if (attempt.status !== "IN_PROGRESS") {
      return {
        attempt: {
          id: attempt.id,
          status: attempt.status,
          violationCount: attempt.violationCount,
          autoSubmitted: false,
        },
      };
    }

    const now = new Date();
    if (now > attempt.endsAt) {
      await finalizeAttempt(attempt.id, "TIME_EXPIRED", "EXPIRED");
      return {
        attempt: { id: attempt.id, status: "EXPIRED", autoSubmitted: true },
      };
    }

    const vType = String(type || "").toUpperCase();
    if (!isKnownViolationType(vType)) {
      throw httpError("Invalid violation type", 400);
    }

    const kiosk = parseKioskConfig(attempt.exam.kioskConfig, attempt.exam.maxViolations);
    const counted = isCountedViolation(kiosk, vType);

    const { updated, countedTotal } = await prisma.$transaction(async (tx) => {
      await tx.examViolation.create({
        data: {
          attemptId,
          schoolId: attempt.schoolId,
          type: vType,
          detail: detail ? String(detail).slice(0, 500) : null,
        },
      });
      const next = await tx.examAttempt.update({
        where: { id: attemptId },
        data: { violationCount: { increment: 1 }, lastSeenAt: now },
      });
      const countedTotal = counted
        ? await tx.examViolation.count({
            where: { attemptId, type: { in: kiosk.blockedEvents } },
          })
        : kiosk.blockedEvents.length
          ? await tx.examViolation.count({
              where: { attemptId, type: { in: kiosk.blockedEvents } },
            })
          : 0;
      return { updated: next, countedTotal };
    });

    emitLiveExamEvent({
      type: "attempt.violation",
      payload: {
        examId: attempt.examId,
        attemptId,
        violationCount: updated.violationCount,
        detail,
      },
    });

    const { warn, autoSubmit: auto } = evaluateViolation(kiosk, countedTotal);
    if (auto) {
      await finalizeAttempt(attemptId, `MAX_VIOLATIONS:${vType}`, "AUTO_SUBMITTED");
      return {
        attempt: {
          id: attemptId,
          status: "AUTO_SUBMITTED",
          violationCount: updated.violationCount,
          countedViolations: countedTotal,
          maxViolations: kiosk.maxViolations,
          warn: false,
          autoSubmitted: true,
        },
      };
    }

    return {
      attempt: {
        id: attemptId,
        status: "IN_PROGRESS",
        violationCount: updated.violationCount,
        countedViolations: countedTotal,
        maxViolations: kiosk.maxViolations,
        warn,
        autoSubmitted: false,
      },
    };
  },

  /** Persist a lightweight heartbeat so proctors can show connection state. */
  async heartbeat(attemptId: string, studentId: string) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentId !== studentId) throw httpError("Forbidden", 403);
    if (attempt.status !== "IN_PROGRESS") {
      return { status: attempt.status, serverNow: new Date().toISOString() };
    }
    const now = new Date();
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { lastSeenAt: now },
    });
    return {
      status: "IN_PROGRESS",
      serverNow: now.toISOString(),
      endsAt: attempt.endsAt,
      expired: now > attempt.endsAt,
    };
  },

  /**
   * Server-side sweep that finalizes attempts whose deadline has passed.
   * Idempotent and safe to run on a schedule (see server.ts).
   */
  async sweepExpiredAttempts(limit?: number) {
    const batchSize = limit ?? (Number(process.env.EXAM_SWEEP_BATCH_SIZE) || 500);
    const conc = Number(process.env.EXAM_SWEEP_CONCURRENCY) || 5;
    const now = new Date();
    const expired = await prisma.examAttempt.findMany({
      where: { status: "IN_PROGRESS", endsAt: { lt: now } },
      select: { id: true },
      take: batchSize,
      orderBy: { endsAt: "asc" },
    });
    let finalized = 0;
    let failed = 0;
    await mapLimit(expired, conc, async (row) => {
      try {
        await finalizeAttempt(row.id, "TIME_EXPIRED", "EXPIRED");
        finalized += 1;
      } catch (err: any) {
        failed += 1;
        console.warn("[online-exam] sweep finalize failed:", row.id, err?.message || err);
      }
    });
    return { scanned: expired.length, finalized, failed };
  },

  /** Return the student's active (in-progress) attempt for an exam, if any. */
  async getActiveAttempt(examId: string, studentId: string) {
    const attempt = await prisma.examAttempt.findFirst({
      where: { examId, studentId, status: "IN_PROGRESS" },
      orderBy: { attemptNumber: "desc" },
    });
    if (!attempt) return { inProgress: false as const };
    if (new Date() > attempt.endsAt) {
      await finalizeAttempt(attempt.id, "TIME_EXPIRED", "EXPIRED");
      return { inProgress: false as const, expired: true };
    }
    const data = await this.getAttemptForStudent(attempt.id, studentId);
    return { inProgress: true as const, ...data };
  },

  async submitAttempt(attemptId: string, studentId: string) {
    const attempt = await loadAttemptOrThrow(attemptId);
    if (attempt.studentId !== studentId) throw httpError("Forbidden", 403);
    if (attempt.status !== "IN_PROGRESS") {
      return this.getResults(attemptId, { id: studentId, role: "STUDENT" });
    }
    await finalizeAttempt(attemptId, "STUDENT_SUBMIT", "SUBMITTED");
    return this.getResults(attemptId, { id: studentId, role: "STUDENT" });
  },

  /** Push exam attempt results to gradebook as GradeEntry records. */
  async pushToGradebook(examId: string, attemptId: string, teacherId: string) {
    const attempt = await loadAttemptOrThrow(attemptId);
    if (attempt.examId !== examId) throw httpError("Mismatched exam", 400);
    if (attempt.status !== "SUBMITTED" && attempt.status !== "AUTO_SUBMITTED" && attempt.status !== "EXPIRED") {
      throw httpError("Attempt must be finalized before pushing to gradebook", 409);
    }

    const exam = await loadExamOrThrow(examId);
    const schoolGradebookConfigRaw = await getSchoolGradebookConfig(exam.schoolId);
    const result = await pushAttemptToGradebook(
      prisma,
      exam,
      {
        id: attempt.id,
        studentId: attempt.studentId,
        score: attempt.score,
        maxScore: attempt.maxScore,
      },
      teacherId,
      schoolGradebookConfigRaw,
      { force: true }
    );
    if (result.skipped) return null;
    return result.gradeEntry;
  },

  /**
   * Bulk push all submitted attempts for an exam to gradebook.
   * `dryRun` previews the outcome without writing. Human-entered grades are
   * skipped unless `force` is set.
   */
  async bulkPushToGradebook(
    examId: string,
    teacherId: string,
    opts: { dryRun?: boolean; force?: boolean } = {}
  ) {
    const exam = await loadExamOrThrow(examId);
    if (!exam.subjectId || !exam.classId) {
      throw httpError("Exam must have subjectId and classId to push to gradebook", 400);
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { examId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"] } },
      select: { id: true, studentId: true },
    });

    const schoolGradebookConfigRaw = await getSchoolGradebookConfig(exam.schoolId);

    const results: {
      studentId: string;
      status: "PUSHED" | "SKIPPED" | "FAILED";
      success: boolean;
      reason?: string;
      error?: string;
    }[] = [];

    for (const a of attempts) {
      if (opts.dryRun) {
        results.push({ studentId: a.studentId, status: "PUSHED", success: true, reason: "DRY_RUN" });
        continue;
      }
      try {
        const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id: a.id } });
        const result = await pushAttemptToGradebook(
          prisma,
          exam,
          {
            id: attempt.id,
            studentId: attempt.studentId,
            score: attempt.score,
            maxScore: attempt.maxScore,
          },
          teacherId,
          schoolGradebookConfigRaw,
          { skipManualEntry: true, force: opts.force }
        );
        if (result.skipped) {
          results.push({ studentId: a.studentId, status: "SKIPPED", success: false, reason: result.reason });
        } else {
          results.push({ studentId: a.studentId, status: "PUSHED", success: true });
        }
      } catch (err: any) {
        results.push({ studentId: a.studentId, status: "FAILED", success: false, error: err.message });
      }
    }
    return results;
  },

  async getResults(
    attemptId: string,
    viewer: { id: string; role: string }
  ) {
    let attempt = await loadAttemptOrThrow(attemptId);

    if (
      attempt.status === "IN_PROGRESS" &&
      new Date() > attempt.endsAt
    ) {
      await finalizeAttempt(attemptId, "TIME_EXPIRED", "EXPIRED");
      attempt = await loadAttemptOrThrow(attemptId);
    }

    if (viewer.role === "STUDENT" && viewer.id !== attempt.studentId) {
      throw httpError("Forbidden", 403);
    }
    if (viewer.role === "PARENT") {
      const { assertParentLinked } = await import("../lib/identityClient");
      const ok = await assertParentLinked(viewer.id, attempt.studentId);
      if (!ok) throw httpError("Forbidden", 403);
    }

    const staffViewer = viewer.role !== "STUDENT" && viewer.role !== "PARENT";
    if (attempt.status === "IN_PROGRESS" && !staffViewer) {
      throw httpError("Results not available until the exam is submitted", 409);
    }

    const canSeeScore =
      attempt.status !== "IN_PROGRESS" &&
      (attempt.exam.showResultsImmediately || attempt.exam.isGradesReleased);
    if (
      !canSeeScore &&
      (viewer.role === "STUDENT" || viewer.role === "PARENT")
    ) {
      return {
        attempt: {
          id: attempt.id,
          examId: attempt.examId,
          status: attempt.status,
          submittedAt: attempt.submittedAt,
          resultsPending: true,
        },
        exam: { id: attempt.exam.id, title: attempt.exam.title },
      };
    }

    const questions = await prisma.examQuestion.findMany({
      where: { examId: attempt.examId, schoolId: attempt.schoolId },
      include: { choices: { orderBy: { orderIndex: "asc" } } },
      orderBy: { orderIndex: "asc" },
    });

    let studentName: string | undefined;
    let studentEmail: string | undefined;
    if (staffViewer) {
      const users = await getIdentityUsersByIds([attempt.studentId]);
      const u = users.get(attempt.studentId);
      studentName = u?.name || attempt.studentId;
      studentEmail = u?.email;
    }

    const answerByQ = new Map(attempt.answers.map((a) => [a.questionId, a]));
    const scoreByQ = new Map(
      summarizeAttemptScore(
        toScoreable(questions),
        attempt.answers.map(
          (a): ScoreableAnswer => ({
            questionId: a.questionId,
            selectedChoiceId: a.selectedChoiceId,
            textAnswer: a.textAnswer,
          })
        )
      ).perQuestion.map((r) => [r.questionId, r])
    );

    return {
      attempt: {
        id: attempt.id,
        examId: attempt.examId,
        studentId: attempt.studentId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        endsAt: attempt.endsAt,
        submittedAt: attempt.submittedAt,
        violationCount: attempt.violationCount,
        submitReason: attempt.submitReason,
        score: attempt.score,
        maxScore: attempt.maxScore,
        passedCount: attempt.passedCount,
        missedCount: attempt.missedCount,
        pendingCount: attempt.pendingCount,
        resultsPending: false,
        live: attempt.status === "IN_PROGRESS",
        ...(staffViewer ? { studentName, studentEmail } : {}),
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        maxViolations: attempt.exam.maxViolations,
        ...(staffViewer
          ? {
              proctorLevel: attempt.exam.proctorLevel,
              showResultsImmediately: attempt.exam.showResultsImmediately,
              isGradesReleased: attempt.exam.isGradesReleased,
            }
          : {}),
      },
      questions: questions.map((q) => {
        const a = answerByQ.get(q.id);
        return {
          ...stripCorrectFromQuestion(q, true),
          answer: {
            selectedChoiceId: a?.selectedChoiceId ?? null,
            textAnswer: a?.textAnswer ?? null,
            isCorrect: scoreByQ.get(q.id)?.isCorrect ?? a?.isCorrect ?? null,
            pointsAwarded: scoreByQ.get(q.id)?.pointsAwarded ?? a?.pointsAwarded ?? null,
            pending: Boolean(scoreByQ.get(q.id)?.pending),
            answered: Boolean(a),
          },
        };
      }),
      violations: attempt.violations,
      retakeEligibility: viewer.role === "STUDENT" && viewer.id === attempt.studentId
        ? await this.getRetakeEligibility(attempt.examId, attempt.studentId)
        : undefined,
    };
  },
};
