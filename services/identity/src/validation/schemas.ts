import { z } from "zod";
import { isKnownReceiptTemplateId } from "../lib/receiptTemplateIds";
import {
  gradebookConfigSchema,
  normalizeCategories,
  validateGradebookConfigTotals,
} from "../lib/gradebookConfig";

const gradebookConfigUpdateSchema = z.string().nullable().superRefine((raw, context) => {
  if (raw == null) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Gradebook configuration must be valid JSON.",
    });
    return;
  }

  const result = gradebookConfigSchema.safeParse(parsed);
  if (!result.success) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Gradebook configuration is invalid.",
    });
    return;
  }

  for (const message of validateGradebookConfigTotals({
    categories: normalizeCategories(result.data),
  })) {
    context.addIssue({ code: z.ZodIssueCode.custom, message });
  }
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16),
});

export const confirmRegistrationSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(16),
});

const receiptTemplatesMapSchema = z
  .object({
    FEE_PAYMENT: z.string().min(1).optional(),
    PAYSLIP: z.string().min(1).optional(),
    EXPENSE: z.string().min(1).optional(),
    TRANSACTION: z.string().min(1).optional(),
  })
  .refine(
    (obj) =>
      Object.values(obj).every((v) => v === undefined || isKnownReceiptTemplateId(v)),
    { message: "Invalid receipt template id" }
  );

export const receiptTemplateUpdateSchema = z
  .object({
    receiptTemplate: z.string().min(1).optional(),
    receiptTemplates: receiptTemplatesMapSchema.optional(),
  })
  .refine((data) => data.receiptTemplate != null || data.receiptTemplates != null, {
    message: "receiptTemplates or receiptTemplate is required",
  });

export const schoolUpdateSchema = z
  .object({
    name: z.string().min(1),
    logoUrl: z.string().nullable(),
    contactEmail: z.string().email(),
    contactPhone: z.string().nullable(),
    address: z.string().nullable(),
    country: z.string().min(1).max(120),
    timezone: z.string(),
    defaultLocale: z.string().min(1).max(20).optional(),
    region: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    holidayEnabled: z.boolean().optional(),
    holidayTypes: z
      .array(z.enum(["national", "regional", "international"]))
      .nullable()
      .optional(),
    gradeSheetTemplate: z.string(),
    reportCardTemplate: z.string(),
    receiptTemplate: z.string().optional(),
    receiptTemplates: receiptTemplatesMapSchema.optional(),
    certificateTemplate: z.string(),
    certificateDefaults: z
      .object({
        sig1Name: z.string().optional(),
        sig1Title: z.string().optional(),
        sig2Name: z.string().optional(),
        sig2Title: z.string().optional(),
        sig1UserId: z.string().optional(),
        sig2UserId: z.string().optional(),
      })
      .passthrough()
      .or(z.string()),
    documentSignatories: z
      .record(
        z.string(),
        z.union([z.string(), z.object({ userId: z.string() }).passthrough()])
      )
      .or(z.string()),
    brandColor: z.string(),
    gradebookConfig: gradebookConfigUpdateSchema,
    payrollAttendanceRules: z.union([
      z.string(),
      z.object({
        enabled: z.boolean().optional(),
        graceMinutes: z.number().optional(),
        deductionPerMissingDay: z.number().optional(),
        deductionPerLate: z.number().optional(),
        blockNonInstructionalRollCall: z.boolean().optional(),
        publishRollCallToCalendar: z.boolean().optional(),
      }),
    ]),
    securityPolicy: z.union([
      z.string(),
      z.object({
        passwordMinLength: z.coerce.number().int().min(6).max(32),
        requireStrongPassword: z.boolean(),
        sessionIdleMinutes: z.coerce.number().int().min(0).max(10080),
        forcePasswordChangeDays: z.coerce.number().int().min(0).max(365),
        mfaMode: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),
        mfaRequiredRoles: z.array(z.string()),
        allowSmsMfa: z.boolean(),
      }),
    ]),
    guideRequired: z.boolean(),
  })
  .partial();

/** Super Admin System Credential creation (Settings → Credentials). */
export const credentialCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().min(1).max(200),
  provider: z.string().trim().min(1).max(40).optional(),
  secret: z.string().max(2000).optional(),
  metadata: z.unknown().optional(),
});
