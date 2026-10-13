import prisma from "../lib/prisma";
import {
  computeEndsAt,
  shouldAutoSubmitForViolations,
  summarizeAttemptScore,
  type ScoreableAnswer,
  type ScoreableQuestion,
} from "../lib/onlineExamScoring";
import { getStudentParentIds, getIdentityUsersByRoles, getIdentityUsersByIds } from "../lib/identityClient";
import { notifyInAppMany } from "../lib/notifyInApp";
import { sendTransactionalEmail } from "../lib/mailClient";
import {
  SAMPLE_PREVIEW_EXAM_ID,
  sampleExamMeta,
  sampleQuestions,
} from "../lib/onlineExamPreviewSample";
import { getClassroomsByMember } from "../lib/classroomClient";
import { assertStudentInClass } from "../lib/gradeAccess";
import { emitLiveExamEvent } from "../lib/liveExamEvents";

const QUESTION_TYPES = new Set([
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "ESSAY",
]);

const VIOLATION_TYPES = new Set([
  "EXIT_FULLSCREEN",
  "TAB_BLUR",
  "VISIBILITY_HIDDEN",
  "CONTEXT_MENU",
  "COPY_ATTEMPT",
]);

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

export const onlineExamService = {
  async updateOnlineConfig(examId: string, schoolId: string, data: any) {
    const exam = await loadExamOrThrow(examId);
    if (exam.schoolId !== schoolId) throw httpError("Forbidden", 403);

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

    return prisma.exam.update({
      where: { id: examId },
      data: {
        isOnline: data.isOnline === undefined ? exam.isOnline : Boolean(data.isOnline),
        maxViolations,
        paperDueAt,
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

  async replaceQuestions(examId: string, schoolId: string, questionsInput: any[]) {
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

    if (!Array.isArray(questionsInput)) {
      throw httpError("questions must be an array", 400);
    }
    if (questionsInput.length > 100) {
      throw httpError("Maximum 100 questions per exam", 400);
    }

    const normalized = questionsInput.map((raw, index) => {
      const type = String(raw.type || "").toUpperCase();
      if (!QUESTION_TYPES.has(type)) {
        throw httpError(`Invalid question type at index ${index}`, 400);
      }
      const prompt = String(raw.prompt || "").trim();
      if (!prompt) throw httpError(`Question ${index + 1} needs a prompt`, 400);
      const points = Number(raw.points);
      if (!Number.isFinite(points) || points <= 0 || points > 100) {
        throw httpError(`Question ${index + 1} points must be between 0 and 100`, 400);
      }

      let choices: { label: string; text: string; isCorrect: boolean }[] = [];
      let correctAnswer: string | null = null;
      const caseSensitive = Boolean(raw.caseSensitive);

      if (type === "MULTIPLE_CHOICE") {
        const rawChoices = Array.isArray(raw.choices) ? raw.choices : [];
        if (rawChoices.length < 2 || rawChoices.length > 8) {
          throw httpError(`MCQ ${index + 1} needs 2–8 choices`, 400);
        }
        choices = rawChoices.map((c: any, ci: number) => ({
          label: String(c.label || String.fromCharCode(65 + ci)).slice(0, 4),
          text: String(c.text || "").trim(),
          isCorrect: Boolean(c.isCorrect),
        }));
        if (choices.some((c) => !c.text)) {
          throw httpError(`MCQ ${index + 1} has empty choice text`, 400);
        }
        if (choices.filter((c) => c.isCorrect).length !== 1) {
          throw httpError(`MCQ ${index + 1} must have exactly one correct choice`, 400);
        }
      } else if (type === "TRUE_FALSE") {
        const truth = raw.correctBoolean;
        if (typeof truth !== "boolean") {
          throw httpError(`True/False ${index + 1} needs correctBoolean`, 400);
        }
        choices = [
          { label: "T", text: "True", isCorrect: truth === true },
          { label: "F", text: "False", isCorrect: truth === false },
        ];
      } else if (type === "FILL_BLANK") {
        correctAnswer = String(raw.correctAnswer || "").trim();
        if (!correctAnswer) {
          throw httpError(`Fill-blank ${index + 1} needs correctAnswer`, 400);
        }
      }

      return {
        type,
        prompt,
        points,
        orderIndex: index,
        correctAnswer,
        caseSensitive,
        choices,
      };
    });

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
      if (!exam.isOnline) {
        await tx.exam.update({
          where: { id: examId },
          data: { isOnline: true },
        });
      }
    });

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
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        _count: { select: { questions: true } },
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
      if (e.classId) {
        if (studentClassIds === undefined) {
          studentClassIds = await resolveStudentClassIds(schoolId, studentId);
        }
        if (!studentClassIds || !studentClassIds.has(e.classId)) continue;
      }
      await ensureLegacyPaperApproved(e.id, schoolId);
      const fresh = await prisma.exam.findUnique({ where: { id: e.id } });
      if (!fresh || fresh.paperStatus !== "APPROVED") continue;
      if (fresh.deliveryMode === "OFFLINE") continue;
      if (e._count.questions < 1) continue;

      const leg = await examPaperService.getStudentLeg(e.id, schoolId, studentId);
      const canBeginOnline = leg === "ONLINE";

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
        answers: { select: { questionId: true } },
      },
    });

    const studentIds = [...new Set(attempts.map((a) => a.studentId))];
    const users = await getIdentityUsersByIds(studentIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return attempts.map((a) => {
      const user = userMap.get(a.studentId);
      return {
        id: a.id,
        studentId: a.studentId,
        studentName: user ? `${user.firstName} ${user.lastName}`.trim() : a.studentId,
        studentEmail: user?.email,
        startedAt: a.startedAt,
        endsAt: a.endsAt,
        violationCount: a.violationCount,
        answeredCount: a.answers.length,
      };
    });
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
      select: { attemptNumber: true, status: true, submittedAt: true, score: true, maxScore: true },
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
    accepted: boolean = false
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

    if (exam.classId) {
      await assertStudentInClass(exam.classId, studentId);
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
      return this.getAttemptForStudent(inProgress.id, studentId);
    }

    // Check retake eligibility
    const eligibility = await this.getRetakeEligibility(examId, studentId);
    if (!eligibility.eligible) {
      throw httpError(this.getRetakeErrorMessage(eligibility.reason), 409, eligibility.reason);
    }

    const endsAt = computeEndsAt(now, exam.duration, exam.endDate);
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

    const answeredCount = answersInput.filter(
      (a) => a.selectedChoiceId != null || a.textAnswer != null
    ).length;
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
    if (!VIOLATION_TYPES.has(vType)) {
      throw httpError("Invalid violation type", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.examViolation.create({
        data: {
          attemptId,
          schoolId: attempt.schoolId,
          type: vType,
          detail: detail ? String(detail).slice(0, 500) : null,
        },
      });
      return tx.examAttempt.update({
        where: { id: attemptId },
        data: { violationCount: { increment: 1 } },
      });
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

    const auto =
      shouldAutoSubmitForViolations(
        updated.violationCount,
        attempt.exam.maxViolations
      );
    if (auto) {
      await finalizeAttempt(attemptId, `MAX_VIOLATIONS:${vType}`, "AUTO_SUBMITTED");
      return {
        attempt: {
          id: attemptId,
          status: "AUTO_SUBMITTED",
          violationCount: updated.violationCount,
          maxViolations: attempt.exam.maxViolations,
          autoSubmitted: true,
        },
      };
    }

    return {
      attempt: {
        id: attemptId,
        status: "IN_PROGRESS",
        violationCount: updated.violationCount,
        maxViolations: attempt.exam.maxViolations,
        autoSubmitted: false,
      },
    };
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
    if (!exam.subjectId || !exam.classId) {
      throw httpError("Exam must have subjectId and classId to push to gradebook", 400);
    }

    // Determine score based on retake policy (best/last/average)
    let finalScore = attempt.score ?? 0;
    let finalMaxScore = attempt.maxScore ?? 0;

    const policy = exam.retakePolicy ? JSON.parse(exam.retakePolicy) : {};
    const scoreRetention = policy.scoreRetention || "last";

    if (scoreRetention !== "last") {
      const allAttempts = await prisma.examAttempt.findMany({
        where: { examId, studentId: attempt.studentId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"] } },
        select: { score: true, maxScore: true },
      });
      const validScores = allAttempts.filter((a) => a.score != null && a.maxScore != null);
      if (validScores.length > 1) {
        if (scoreRetention === "best") {
          const best = validScores.reduce((max, a) => (a.score! / a.maxScore!) > (max.score! / max.maxScore!) ? a : max);
          finalScore = best.score!;
          finalMaxScore = best.maxScore!;
        } else if (scoreRetention === "average") {
          const avgPct = validScores.reduce((sum, a) => sum + a.score! / a.maxScore!, 0) / validScores.length;
          finalScore = Math.round(avgPct * 100) / 100;
          finalMaxScore = 100;
        }
      }
    }

    // Determine the structureColumnId from examComponent's gradebookStructure
    let structureColumnId: string | null = null;
    if (exam.examComponentId) {
      const component = await prisma.examComponent.findUnique({
        where: { id: exam.examComponentId },
        select: { gradebookStructure: true },
      });
      if (component?.gradebookStructure) {
        try {
          const structure = JSON.parse(component.gradebookStructure);
          const examColumn = structure.columns?.find((c: any) => {
            const type = String(c.componentType || "").toUpperCase();
            return type.includes("EXAM") || type === "FINAL" || type === "MIDTERM" || type === "TEST" || type === "QUIZ" || type === "SUMMATIVE";
          });
          if (examColumn) structureColumnId = examColumn.id;
        } catch {
          // ignore parse errors
        }
      }
    }

    const schoolYear = await prisma.academicYear.findFirst({
      where: { schoolId: exam.schoolId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!schoolYear) {
      throw httpError("No active academic year found for this school", 400, "NO_ACTIVE_YEAR");
    }
    const schoolYearId = schoolYear.id;

    const gradeEntry = await prisma.gradeEntry.upsert({
      where: {
        examId_studentId_subjectId_classId_examComponentId_structureColumnId: {
          examId,
          studentId: attempt.studentId,
          subjectId: exam.subjectId,
          classId: exam.classId,
          examComponentId: exam.examComponentId ?? "",
          structureColumnId: structureColumnId ?? "",
        },
      },
      create: {
        examId,
        studentId: attempt.studentId,
        subjectId: exam.subjectId,
        classId: exam.classId,
        schoolId: exam.schoolId,
        schoolYearId: schoolYearId?.id || "CURRENT_YEAR",
        score: finalScore,
        status: "SUBMITTED",
        enteredBy: teacherId,
        examComponentId: exam.examComponentId,
        structureColumnId,
        isIncomplete: false,
      },
      update: {
        score: finalScore,
        status: "SUBMITTED",
        enteredBy: teacherId,
        examComponentId: exam.examComponentId,
        structureColumnId,
        isIncomplete: false,
        updatedAt: new Date(),
      },
    });

    // Link the gradeEntry to the attempt for audit trail
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { gradeEntryId: gradeEntry.id },
    });

    // Create grade history entry
    await prisma.gradeHistory.create({
      data: {
        gradeEntryId: gradeEntry.id,
        score: gradeEntry.score,
        status: gradeEntry.status,
        feedback: `Pushed from online exam attempt ${attemptId}`,
        changedBy: teacherId,
        changedAt: new Date(),
      },
    });

    return gradeEntry;
  },

  /** Bulk push all submitted attempts for an exam to gradebook. */
  async bulkPushToGradebook(examId: string, teacherId: string) {
    const exam = await loadExamOrThrow(examId);
    const attempts = await prisma.examAttempt.findMany({
      where: { examId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"] } },
      select: { id: true, studentId: true },
    });

    const results: { studentId: string; success: boolean; error?: string }[] = [];
    await prisma.$transaction(async (tx) => {
      for (const a of attempts) {
        try {
          // Replicate pushToGradebook logic within transaction
          const attempt = await tx.examAttempt.findUniqueOrThrow({ where: { id: a.id } });
          if (attempt.examId !== examId) throw httpError("Mismatched exam", 400);
          if (attempt.status !== "SUBMITTED" && attempt.status !== "AUTO_SUBMITTED" && attempt.status !== "EXPIRED") {
            throw httpError("Attempt must be finalized before pushing to gradebook", 409);
          }

          if (!exam.subjectId || !exam.classId) {
            throw httpError("Exam must have subjectId and classId to push to gradebook", 400);
          }

          // Determine score based on retake policy (best/last/average)
          let finalScore = attempt.score ?? 0;
          let finalMaxScore = attempt.maxScore ?? 0;

          const policy = exam.retakePolicy ? JSON.parse(exam.retakePolicy) : {};
          const scoreRetention = policy.scoreRetention || "last";

          if (scoreRetention !== "last") {
            const allAttempts = await tx.examAttempt.findMany({
              where: { examId, studentId: attempt.studentId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "EXPIRED"] } },
              select: { score: true, maxScore: true },
            });
            const validScores = allAttempts.filter((at) => at.score != null && at.maxScore != null);
            if (validScores.length > 1) {
              if (scoreRetention === "best") {
                const best = validScores.reduce((max, at) => (at.score! / at.maxScore!) > (max.score! / max.maxScore!) ? at : max);
                finalScore = best.score!;
                finalMaxScore = best.maxScore!;
              } else if (scoreRetention === "average") {
                const avgPct = validScores.reduce((sum, at) => sum + at.score! / at.maxScore!, 0) / validScores.length;
                finalScore = Math.round(avgPct * 100) / 100;
                finalMaxScore = 100;
              }
            }
          }

          // Determine the structureColumnId from examComponent's gradebookStructure
          let structureColumnId: string | null = null;
          if (exam.examComponentId) {
            const component = await tx.examComponent.findUnique({
              where: { id: exam.examComponentId },
              select: { gradebookStructure: true },
            });
            if (component?.gradebookStructure) {
              try {
                const structure = JSON.parse(component.gradebookStructure);
                const examColumn = structure.columns?.find((c: any) => {
                  const type = String(c.componentType || "").toUpperCase();
                  return type.includes("EXAM") || type === "FINAL" || type === "MIDTERM" || type === "TEST" || type === "QUIZ" || type === "SUMMATIVE";
                });
                if (examColumn) structureColumnId = examColumn.id;
              } catch {
                // ignore parse errors
              }
            }
          }

          const schoolYear = await tx.academicYear.findFirst({
            where: { schoolId: exam.schoolId, status: "ACTIVE" },
            select: { id: true },
          });
          if (!schoolYear) {
            throw httpError("No active academic year found for this school", 400, "NO_ACTIVE_YEAR");
          }
          const schoolYearId = schoolYear.id;

          const gradeEntry = await tx.gradeEntry.upsert({
            where: {
              examId_studentId_subjectId_classId_examComponentId_structureColumnId: {
                examId,
                studentId: attempt.studentId,
                subjectId: exam.subjectId,
                classId: exam.classId,
                examComponentId: exam.examComponentId ?? "",
                structureColumnId: structureColumnId ?? "",
              },
            },
            create: {
              examId,
              studentId: attempt.studentId,
              subjectId: exam.subjectId,
              classId: exam.classId,
              schoolId: exam.schoolId,
              schoolYearId: schoolYearId?.id ?? "CURRENT_YEAR",
              score: finalScore,
              status: "SUBMITTED",
              enteredBy: teacherId,
              examComponentId: exam.examComponentId,
              structureColumnId,
              isIncomplete: false,
            },
            update: {
              score: finalScore,
              status: "SUBMITTED",
              enteredBy: teacherId,
              examComponentId: exam.examComponentId,
              structureColumnId,
              isIncomplete: false,
              updatedAt: new Date(),
            },
          });

          // Link the gradeEntry to the attempt for audit trail
          await tx.examAttempt.update({
            where: { id: a.id },
            data: { gradeEntryId: gradeEntry.id },
          });

          // Create grade history entry
          await tx.gradeHistory.create({
            data: {
              gradeEntryId: gradeEntry.id,
              score: gradeEntry.score,
              status: gradeEntry.status,
              feedback: `Pushed from online exam attempt ${a.id}`,
              changedBy: teacherId,
              changedAt: new Date(),
            },
          });

          results.push({ studentId: a.studentId, success: true });
        } catch (err: any) {
          results.push({ studentId: a.studentId, success: false, error: err.message });
        }
      }
    });
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

    if (attempt.status === "IN_PROGRESS") {
      throw httpError("Results not available until the exam is submitted", 409);
    }

    const canSeeScore =
      attempt.exam.showResultsImmediately || attempt.exam.isGradesReleased;
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
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        maxViolations: attempt.exam.maxViolations,
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
