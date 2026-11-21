/** School admission policy shape (Identity `School.admissionPolicy` JSON). */

export type AdmissionEntranceSlot = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  location?: string | null;
  instructions?: string | null;
};

export type AdmissionPolicy = {
  publicApplyEnabled: boolean;
  /** Allow returning students to re-register online (email + DOB match). */
  returningApplyEnabled: boolean;
  requireEntranceFee: boolean;
  requiredDocTypes: string[];
  requireClassroomOnEnroll: boolean;
  entranceFeeAmount: number;
  applyBackgroundUrl?: string;
  entranceSchedulingEnabled: boolean;
  entranceSlots: AdmissionEntranceSlot[];
  entranceBookingDeadline: string | null;
  entranceRescheduleCutoffHours: number;
  /** YYYY-MM-DD bounds for entrance dates (inclusive). */
  entranceAvailableFrom: string | null;
  entranceAvailableTo: string | null;
  /** 0 = Sunday … 6 = Saturday. Defaults to Monday–Friday. */
  entranceAvailableWeekdays: number[];
  /** School-written rule shown to families on the entrance booking page. */
  entranceAvailabilityNote: string | null;
};

export const DEFAULT_ADMISSION_POLICY: AdmissionPolicy = {
  publicApplyEnabled: true,
  returningApplyEnabled: true,
  requireEntranceFee: false,
  /** Student admission documents are optional — never block enroll by default. */
  requiredDocTypes: [],
  requireClassroomOnEnroll: false,
  entranceFeeAmount: 0,
  applyBackgroundUrl: "",
  entranceSchedulingEnabled: false,
  entranceSlots: [],
  entranceBookingDeadline: null,
  entranceRescheduleCutoffHours: 24,
  entranceAvailableFrom: null,
  entranceAvailableTo: null,
  entranceAvailableWeekdays: [1, 2, 3, 4, 5],
  entranceAvailabilityNote: null,
};

function parseDateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : value;
}

function parseWeekdays(value: unknown): number[] {
  const input = Array.isArray(value) ? value : DEFAULT_ADMISSION_POLICY.entranceAvailableWeekdays;
  const days = input
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const unique = Array.from(new Set(days)).sort((a, b) => a - b);
  return unique.length ? unique : [...DEFAULT_ADMISSION_POLICY.entranceAvailableWeekdays];
}

function parseAvailabilityNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim().slice(0, 500);
  return note || null;
}

export function isEntranceSlotWithinPolicy(
  policy: AdmissionPolicy,
  slot: Pick<AdmissionEntranceSlot, "startAt">
): boolean {
  const date = String(slot.startAt || "").slice(0, 10);
  if (!parseDateOnly(date)) return false;
  if (policy.entranceAvailableFrom && date < policy.entranceAvailableFrom) return false;
  if (policy.entranceAvailableTo && date > policy.entranceAvailableTo) return false;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return policy.entranceAvailableWeekdays.includes(weekday);
}

export function parseAdmissionPolicy(raw: unknown): AdmissionPolicy {
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
  const docs: string[] = [];
  return {
    publicApplyEnabled:
      parsed.publicApplyEnabled !== undefined
        ? Boolean(parsed.publicApplyEnabled)
        : DEFAULT_ADMISSION_POLICY.publicApplyEnabled,
    returningApplyEnabled:
      parsed.returningApplyEnabled !== undefined
        ? Boolean(parsed.returningApplyEnabled)
        : DEFAULT_ADMISSION_POLICY.returningApplyEnabled,
    requireEntranceFee:
      parsed.requireEntranceFee !== undefined
        ? Boolean(parsed.requireEntranceFee)
        : DEFAULT_ADMISSION_POLICY.requireEntranceFee,
    // Product rule (2026-07-29): admission documents never block enroll.
    requiredDocTypes: docs,
    requireClassroomOnEnroll:
      parsed.requireClassroomOnEnroll !== undefined
        ? Boolean(parsed.requireClassroomOnEnroll)
        : DEFAULT_ADMISSION_POLICY.requireClassroomOnEnroll,
    entranceFeeAmount: Number(parsed.entranceFeeAmount || 0) || 0,
    applyBackgroundUrl: typeof parsed.applyBackgroundUrl === "string" ? parsed.applyBackgroundUrl : "",
    entranceSchedulingEnabled:
      parsed.entranceSchedulingEnabled !== undefined
        ? Boolean(parsed.entranceSchedulingEnabled)
        : DEFAULT_ADMISSION_POLICY.entranceSchedulingEnabled,
    entranceSlots: Array.isArray(parsed.entranceSlots)
      ? parsed.entranceSlots
          .map((slot: any) => ({
            id: String(slot?.id || "").trim(),
            startAt: String(slot?.startAt || "").trim(),
            endAt: String(slot?.endAt || "").trim(),
            capacity: Number(slot?.capacity || 0),
            location: slot?.location ? String(slot.location) : null,
            instructions: slot?.instructions ? String(slot.instructions) : null,
          }))
          .filter((slot: AdmissionEntranceSlot) => slot.id && slot.startAt && slot.endAt && slot.capacity > 0)
      : [],
    entranceBookingDeadline:
      typeof parsed.entranceBookingDeadline === "string" && parsed.entranceBookingDeadline.trim()
        ? parsed.entranceBookingDeadline
        : null,
    entranceRescheduleCutoffHours:
      Number(parsed.entranceRescheduleCutoffHours) >= 0
        ? Number(parsed.entranceRescheduleCutoffHours)
        : DEFAULT_ADMISSION_POLICY.entranceRescheduleCutoffHours,
    entranceAvailableFrom: parseDateOnly(parsed.entranceAvailableFrom),
    entranceAvailableTo: parseDateOnly(parsed.entranceAvailableTo),
    entranceAvailableWeekdays: parseWeekdays(parsed.entranceAvailableWeekdays),
    entranceAvailabilityNote: parseAvailabilityNote(parsed.entranceAvailabilityNote),
  };
}

/**
 * Statuses that may call orchestrated enroll (after gates).
 * Derived from the canonical transition map so it can never drift (see admissionStates).
 */
export { ENROLLABLE_STATUSES, isEnrollableStatus } from "./admissionStates";

export function parseApplicationNotes(notes: string | null | undefined): Record<string, unknown> {
  if (!notes) return {};
  try {
    const v = JSON.parse(notes);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : { text: notes };
  } catch {
    return { text: notes };
  }
}

export function applicantTypeFromNotes(notes: string | null | undefined): "NEW" | "RETURNING" {
  const n = parseApplicationNotes(notes);
  return n.applicantType === "RETURNING" ? "RETURNING" : "NEW";
}
