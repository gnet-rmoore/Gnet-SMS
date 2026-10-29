import { z } from "zod";
import { VIOLATION_TYPES } from "../lib/onlineExamKiosk";

/** Ported from src/server/validation/schemas.ts (exam grade subset only). */
export const gradeEntryUpsertSchema = z.object({
  studentId: z.string().min(1),
  grade: z.union([z.coerce.number(), z.null()]),
  status: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  examComponentId: z.string().optional().nullable(),
});

export const gradeEntryBulkSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  status: z.enum(["DRAFT", "SUBMITTED"]),
  examComponentId: z.string().optional().nullable(),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        grade: z.union([z.coerce.number(), z.null()]),
      })
    )
    .min(1)
    .max(500),
});

export const componentGradeBulkSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  examComponentId: z.string().min(1),
  status: z.enum(["DRAFT", "SUBMITTED"]),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        grade: z.union([z.coerce.number(), z.null()]),
        structureColumnId: z.string().min(1).optional().nullable(),
        isIncomplete: z.boolean().optional(),
        incompleteNote: z.string().max(500).nullable().optional(),
      })
    )
    .min(1)
    .max(2000),
});

export const onlineExamKioskConfigSchema = z.object({
  requireFullscreen: z.boolean().optional(),
  requireScreenShare: z.boolean().optional(),
  maxViolations: z.coerce.number().int().min(0).max(50).optional(),
  warnAt: z.coerce.number().int().min(0).max(50).optional(),
  blockedEvents: z.array(z.enum(VIOLATION_TYPES)).max(20).optional(),
  allowReconnect: z.boolean().optional(),
});

export const onlineExamRetakePolicyBaseSchema = z.object({
  maxRetakes: z.coerce.number().int().min(0).max(10).optional(),
  waitingPeriodHours: z.coerce.number().int().min(0).max(168).optional(),
  scoreRetention: z.enum(["best", "last", "average"]).optional(),
});

export const onlineExamRetakePolicySchema = onlineExamRetakePolicyBaseSchema.refine((data) => {
  // If retake policy is provided (any field), maxRetakes must be > 0
  const hasPolicy = data.maxRetakes != null || data.waitingPeriodHours != null || data.scoreRetention != null;
  if (hasPolicy && (data.maxRetakes == null || data.maxRetakes <= 0)) {
    return false;
  }
  return true;
}, {
  message: "maxRetakes must be greater than 0 when retake policy is enabled",
  path: ["maxRetakes"],
});

export const onlineExamConfigSchema = z.object({
  isOnline: z.boolean().optional(),
  duration: z.coerce.number().int().min(1).max(600).optional(),
  maxViolations: z.coerce.number().int().min(0).max(50).optional(),
  showResultsImmediately: z.boolean().optional(),
  instructions: z.string().max(5000).nullable().optional(),
  classId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  paperDueAt: z.coerce.date().nullable().optional(),
  proctorLevel: z.enum(["OFF", "MONITOR", "SCREEN_VIEW"]).optional(),
  kioskConfig: onlineExamKioskConfigSchema.nullable().optional(),
  retakePolicy: onlineExamRetakePolicyBaseSchema.nullable().optional(),
  autoPostGrades: z.boolean().optional(),
});

export const onlineQuestionSchema = z.object({
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK", "ESSAY"]),
  prompt: z.string().min(1).max(120000),
  points: z.coerce.number().positive().max(100),
  correctAnswer: z.string().max(2000).optional().nullable(),
  correctBoolean: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  choices: z
    .array(
      z.object({
        label: z.string().max(4).optional(),
        text: z.string().min(1).max(40000),
        isCorrect: z.boolean(),
      })
    )
    .optional(),
});

export const examScheduleCreateSchema = z.object({
  classId: z.string().nullable().optional(),
  room: z.string().max(120).nullable().optional(),
  session: z.string().max(120).nullable().optional(),
  invigilatorId: z.string().nullable().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  note: z.string().max(1000).nullable().optional(),
});

export const examScheduleUpdateSchema = z.object({
  classId: z.string().nullable().optional(),
  room: z.string().max(120).nullable().optional(),
  session: z.string().max(120).nullable().optional(),
  invigilatorId: z.string().nullable().optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export const onlineExamQuestionsSchema = z.object({
  questions: z.array(onlineQuestionSchema).max(100),
});

/** Spreadsheet question import: rows are client-parsed; the server validates. */
export const questionImportRowsSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).max(500),
  sourceFileName: z.string().max(255).optional(),
});

export const onlineExamAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedChoiceId: z.string().nullable().optional(),
        textAnswer: z.string().max(10000).nullable().optional(),
      })
    )
    .min(1)
    .max(100),
});

/** Staff preview scoring accepts any subset of answers (including none). */
export const onlineExamPreviewScoreSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedChoiceId: z.string().nullable().optional(),
        textAnswer: z.string().max(10000).nullable().optional(),
      })
    )
    .max(100)
    .optional(),
});

export const onlineExamViolationSchema = z.object({
  type: z.enum(VIOLATION_TYPES),
  detail: z.string().max(500).optional().nullable(),
});

export const proctorWarnSchema = z.object({
  message: z.string().max(300).optional(),
});

export const proctorFlagSchema = z.object({
  flagged: z.boolean(),
  note: z.string().max(300).optional().nullable(),
});

export const proctorExtendSchema = z.object({
  extraMinutes: z.coerce.number().int().min(1).max(180),
});

export const onlineExamPushGradebookSchema = z.object({
  attemptId: z.string().optional(),
  pushAll: z.boolean().optional(),
  /** Preview only — compute the outcome without writing to the gradebook. */
  dryRun: z.boolean().optional(),
  /** Overwrite human-entered grades (bulk push). */
  force: z.boolean().optional(),
}).refine((data) => (data.attemptId ? 1 : 0) + (data.pushAll ? 1 : 0) === 1, {
  message: "Exactly one of attemptId or pushAll must be provided",
  path: ["attemptId"],
});

/** Manual essay marking. `pointsAwarded: null` resets the answer to pending. */
export const essayGradeSchema = z.object({
  pointsAwarded: z.coerce.number().min(0).nullable(),
});

/** Proctor screen-frame upload request/confirmation (Phase 3). */
export const screenFrameSchema = z.object({
  mimeType: z.string().max(80).optional(),
  byteSize: z.coerce.number().int().min(0).optional(),
});

export const examPaperDraftSchema = z.object({
  deliveryMode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).optional(),
  instructions: z.string().max(5000).nullable().optional(),
  maxViolations: z.coerce.number().int().min(0).max(50).optional(),
});

export const examPaperPresignSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.literal("application/pdf"),
});

export const examPaperConfirmPdfSchema = z.object({
  storageKey: z.string().min(1),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1).max(200),
});

export const examPaperReviewSchema = z.object({
  action: z.enum(["APPROVE", "RETURN"]),
  feedback: z.string().max(5000).optional().nullable(),
  deliveryMode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).optional(),
  duration: z.coerce.number().int().min(1).max(600).optional(),
});

export const examPaperRosterSchema = z.object({
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        leg: z.enum(["ONLINE", "OFFLINE"]),
      })
    )
    .max(2000),
});

export const securityPolicySchema = z.object({
  passwordMinLength: z.coerce.number().int().min(6).max(32),
  requireStrongPassword: z.boolean(),
  sessionIdleMinutes: z.coerce.number().int().min(0).max(10080), // max 7 days
  forcePasswordChangeDays: z.coerce.number().int().min(0).max(365),
  mfaMode: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),
  mfaRequiredRoles: z.array(z.string()).optional(),
  allowSmsMfa: z.boolean(),
});

// ---------------------------------------------------------------------------
// Question bank (reusable school questions)
// ---------------------------------------------------------------------------

/** Subject/grade tagging + sharing visibility shared by all bank writes. */
const questionBankTaxonomySchema = z.object({
  subjectId: z.string().nullable().optional(),
  gradeLevelId: z.string().nullable().optional(),
  topic: z.string().max(200).nullable().optional(),
  tags: z.union([z.string().max(2000), z.array(z.string().max(40)).max(20)]).optional(),
  visibility: z.enum(["PRIVATE", "SHARED"]).optional(),
});

export const questionBankCreateSchema = questionBankTaxonomySchema.extend({
  questions: z.array(onlineQuestionSchema).min(1).max(100),
});

export const questionBankUpdateSchema = questionBankTaxonomySchema.extend({
  question: onlineQuestionSchema,
});

/** Copy questions from an exam into the bank (copy-on-insert source). */
export const questionBankSaveFromExamSchema = questionBankTaxonomySchema.extend({
  questionIds: z.array(z.string().min(1)).max(200).optional(),
});

// ---------------------------------------------------------------------------
// Transcripts (registrar prepares ? principal/VPI/VPA approves)
// ---------------------------------------------------------------------------

export const transcriptPrepareSchema = z.object({
  studentId: z.string().min(1),
  templateKey: z.enum(["classic", "modern", "executive"]).optional().nullable(),
  academicYear: z.string().max(20).optional().nullable(),
  gradeLevel: z.string().max(100).optional().nullable(),
});

export const transcriptReviewSchema = z.object({
  comment: z.string().max(2000).optional().nullable(),
});
