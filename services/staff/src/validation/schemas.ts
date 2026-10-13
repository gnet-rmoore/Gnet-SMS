import { z } from "zod";

/** Ported from src/server/validation/schemas.ts (payroll subset only). */
export const payrollCreateSchema = z.object({
  userId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  basicSalary: z.coerce.number().nonnegative(),
  allowances: z.coerce.number().nonnegative().optional(),
  deductions: z.coerce.number().nonnegative().optional(),
  netSalary: z.coerce.number().nonnegative(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export const staffTaskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "MEDIUM"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]).optional(),
  assignedTo: z.string().min(1),
  dueDate: z.string().optional(),
});

export const leavePoliciesUpdateSchema = z.object({
  policies: z
    .array(
      z.object({
        type: z.string().min(1),
        annualDays: z.coerce.number().nonnegative(),
        isActive: z.boolean().optional(),
      })
    )
    .min(1),
});
