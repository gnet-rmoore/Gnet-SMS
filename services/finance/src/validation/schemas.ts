import { z } from "zod";

/** Ported from src/server/validation/schemas.ts (fee subset only). */
export const feeCreateSchema = z.object({
  studentId: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.string().min(1),
  status: z.string().optional(),
  dueDate: z.union([z.string().min(1), z.coerce.date()]),
  notes: z.string().max(2000).optional(),
  applicationId: z.string().optional(),
  templateId: z.string().optional(),
  schoolYearKey: z.string().max(32).optional().nullable(),
  scopeMode: z.enum(["SCHOOL", "GRADE", "DIVISION"]).optional(),
  gradeLevelId: z.string().optional().nullable(),
  divisionId: z.string().optional().nullable(),
  cohort: z.enum(["ALL", "NEW", "RETURNING"]).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  originalAmount: z.coerce.number().positive().optional(),
});

export const feeUpdateSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  type: z.string().min(1).optional(),
  dueDate: z.union([z.string().min(1), z.coerce.date()]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const feeTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(40),
  amount: z.coerce.number().positive(),
  description: z.string().max(500).optional(),
  scopeMode: z.enum(["SCHOOL", "GRADE", "DIVISION"]).optional(),
  gradeLevelId: z.string().optional().nullable(),
  divisionId: z.string().optional().nullable(),
  cohort: z.enum(["ALL", "NEW", "RETURNING"]).optional(),
  schoolYearKey: z.string().max(32).optional().nullable(),
  subcategory: z.string().max(60).optional().nullable(),
  active: z.boolean().optional(),
});

export const feeBatchApplySchema = z.object({
  templateId: z.string().min(1),
  dueDate: z.union([z.string().min(1), z.coerce.date()]),
  schoolYearKey: z.string().max(32).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const feeCollectSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  method: z.enum(["CASH", "CHECK", "TRANSFER", "CARD", "OTHER", "CHECKOUT"]).optional(),
  paidAt: z.string().optional(),
  notes: z.string().max(2000).optional().nullable(),
  payerUserId: z.string().optional().nullable(),
  confirmStale: z.boolean().optional(),
});

export const feePaymentRecordSchema = feeCollectSchema;
