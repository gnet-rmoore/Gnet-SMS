/** Default + parse helpers for Identity.School.payrollAttendanceRules JSON. */
export type PayrollAttendanceRules = {
  /** When true, payroll UI can apply suggested deductions. */
  enabled: boolean;
  /** Minutes after school start before check-in counts as late (summary only). */
  graceMinutes: number;
  deductionPerMissingDay: number;
  deductionPerLate: number;
  /** Block student roll call on weekends / Holiday / Non-Instruction days. */
  blockNonInstructionalRollCall: boolean;
  /** Upsert a calendar event when a student roll call is saved. */
  publishRollCallToCalendar: boolean;
};

export const DEFAULT_PAYROLL_ATTENDANCE_RULES: PayrollAttendanceRules = {
  enabled: false,
  graceMinutes: 15,
  deductionPerMissingDay: 0,
  deductionPerLate: 0,
  blockNonInstructionalRollCall: true,
  publishRollCallToCalendar: true,
};

export function parsePayrollAttendanceRules(
  raw: string | null | undefined | object
): PayrollAttendanceRules {
  let parsed: any = {};
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw;
  }
  return {
    enabled: Boolean(parsed.enabled),
    graceMinutes: Math.max(0, Number(parsed.graceMinutes) || 0),
    deductionPerMissingDay: Math.max(0, Number(parsed.deductionPerMissingDay) || 0),
    deductionPerLate: Math.max(0, Number(parsed.deductionPerLate) || 0),
    blockNonInstructionalRollCall:
      parsed.blockNonInstructionalRollCall !== undefined
        ? Boolean(parsed.blockNonInstructionalRollCall)
        : DEFAULT_PAYROLL_ATTENDANCE_RULES.blockNonInstructionalRollCall,
    publishRollCallToCalendar:
      parsed.publishRollCallToCalendar !== undefined
        ? Boolean(parsed.publishRollCallToCalendar)
        : DEFAULT_PAYROLL_ATTENDANCE_RULES.publishRollCallToCalendar,
  };
}

export function serializePayrollAttendanceRules(
  rules: Partial<PayrollAttendanceRules> | null | undefined
): string {
  return JSON.stringify({
    ...DEFAULT_PAYROLL_ATTENDANCE_RULES,
    ...(rules || {}),
  });
}
