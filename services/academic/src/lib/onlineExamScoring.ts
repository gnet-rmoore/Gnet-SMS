/** Pure scoring helpers for online exams (unit-testable, no DB). */

export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";

export type ScoreableChoice = {
  id: string;
  isCorrect: boolean;
};

export type ScoreableQuestion = {
  id: string;
  type: string;
  points: number;
  correctAnswer?: string | null;
  caseSensitive?: boolean;
  choices?: ScoreableChoice[];
};

export type ScoreableAnswer = {
  questionId: string;
  selectedChoiceId?: string | null;
  textAnswer?: string | null;
};

export type QuestionScore = {
  questionId: string;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  pending: boolean;
};

export type AttemptScoreSummary = {
  score: number;
  maxScore: number;
  passedCount: number;
  missedCount: number;
  pendingCount: number;
  perQuestion: QuestionScore[];
};

function normalizeBlank(value: string, caseSensitive: boolean): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

export function scoreQuestion(
  question: ScoreableQuestion,
  answer: ScoreableAnswer | undefined
): QuestionScore {
  const type = String(question.type || "").toUpperCase();
  const points = Number(question.points) || 0;

  if (type === "ESSAY") {
    return {
      questionId: question.id,
      isCorrect: null,
      pointsAwarded: null,
      pending: true,
    };
  }

  if (!answer) {
    return {
      questionId: question.id,
      isCorrect: false,
      pointsAwarded: 0,
      pending: false,
    };
  }

  if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
    const choiceId = answer.selectedChoiceId || null;
    if (!choiceId) {
      return {
        questionId: question.id,
        isCorrect: false,
        pointsAwarded: 0,
        pending: false,
      };
    }
    const choice = (question.choices || []).find((c) => c.id === choiceId);
    const isCorrect = Boolean(choice?.isCorrect);
    return {
      questionId: question.id,
      isCorrect,
      pointsAwarded: isCorrect ? points : 0,
      pending: false,
    };
  }

  if (type === "FILL_BLANK") {
    const expected = question.correctAnswer ?? "";
    const given = answer.textAnswer ?? "";
    if (!String(expected).trim()) {
      return {
        questionId: question.id,
        isCorrect: null,
        pointsAwarded: null,
        pending: true,
      };
    }
    const caseSensitive = Boolean(question.caseSensitive);
    const isCorrect =
      normalizeBlank(String(given), caseSensitive) ===
      normalizeBlank(String(expected), caseSensitive);
    return {
      questionId: question.id,
      isCorrect,
      pointsAwarded: isCorrect ? points : 0,
      pending: false,
    };
  }

  return {
    questionId: question.id,
    isCorrect: null,
    pointsAwarded: null,
    pending: true,
  };
}

export function summarizeAttemptScore(
  questions: ScoreableQuestion[],
  answers: ScoreableAnswer[]
): AttemptScoreSummary {
  const byQ = new Map(answers.map((a) => [a.questionId, a]));
  const perQuestion = questions.map((q) => scoreQuestion(q, byQ.get(q.id)));
  let score = 0;
  let maxScore = 0;
  let passedCount = 0;
  let missedCount = 0;
  let pendingCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const row = perQuestion[i];
    maxScore += Number(q.points) || 0;
    if (row.pending) {
      pendingCount += 1;
      continue;
    }
    score += Number(row.pointsAwarded) || 0;
    if (row.isCorrect) passedCount += 1;
    else missedCount += 1;
  }

  return { score, maxScore, passedCount, missedCount, pendingCount, perQuestion };
}

export function computeEndsAt(
  startedAt: Date,
  durationMinutes: number,
  examEndDate: Date
): Date {
  const durationMs = Math.max(1, Number(durationMinutes) || 1) * 60_000;
  const fromDuration = new Date(startedAt.getTime() + durationMs);
  return fromDuration < examEndDate ? fromDuration : new Date(examEndDate);
}

export function shouldAutoSubmitForViolations(
  violationCount: number,
  maxViolations: number
): boolean {
  if (!Number.isFinite(maxViolations) || maxViolations <= 0) return false;
  return violationCount >= maxViolations;
}
