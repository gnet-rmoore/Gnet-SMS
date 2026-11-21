/** Shared admission policy helpers (Identity). */

export type AdmissionEntranceSlot = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  location?: string;
  instructions?: string;
};

export type AdmissionPolicy = {
  publicApplyEnabled: boolean;
  /** Allow returning students to re-register online (match existing STUDENT by email + DOB). */
  returningApplyEnabled: boolean;
  requireEntranceFee: boolean;
  requiredDocTypes: string[];
  requireClassroomOnEnroll: boolean;
  entranceFeeAmount: number;
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
  /** Custom background image URL for the public apply page. */
  applyBackgroundUrl?: string;
};

export const DEFAULT_ADMISSION_POLICY: AdmissionPolicy = {
  publicApplyEnabled: true,
  returningApplyEnabled: true,
  requireEntranceFee: false,
  /** Student admission documents are optional — never block enroll by default. */
  requiredDocTypes: [],
  requireClassroomOnEnroll: false,
  entranceFeeAmount: 0,
  entranceSchedulingEnabled: false,
  entranceSlots: [],
  entranceBookingDeadline: null,
  entranceRescheduleCutoffHours: 24,
  entranceAvailableFrom: null,
  entranceAvailableTo: null,
  entranceAvailableWeekdays: [1, 2, 3, 4, 5],
  entranceAvailabilityNote: null,
};

function parseEntranceSlots(value: unknown): AdmissionEntranceSlot[] {
  if (!Array.isArray(value)) return [];
  const slots: AdmissionEntranceSlot[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    if (
      typeof raw.id !== "string" ||
      typeof raw.startAt !== "string" ||
      typeof raw.endAt !== "string" ||
      typeof raw.capacity !== "number" ||
      !Number.isFinite(raw.capacity)
    ) {
      continue;
    }
    const slot: AdmissionEntranceSlot = {
      id: raw.id,
      startAt: raw.startAt,
      endAt: raw.endAt,
      capacity: raw.capacity,
    };
    if (typeof raw.location === "string") slot.location = raw.location;
    if (typeof raw.instructions === "string") slot.instructions = raw.instructions;
    slots.push(slot);
  }
  return slots;
}

function parseCutoffHours(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : DEFAULT_ADMISSION_POLICY.entranceRescheduleCutoffHours;
}

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

export function parseAdmissionPolicy(raw: string | null | undefined): AdmissionPolicy {
  let parsed: Record<string, unknown> = {};
  if (raw) {
    try {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      /* keep defaults */
    }
  }
  return {
    publicApplyEnabled: parsed.publicApplyEnabled !== false,
    returningApplyEnabled: parsed.returningApplyEnabled !== false,
    requireEntranceFee: Boolean(parsed.requireEntranceFee),
    // Product rule (2026-07-29): admission documents never block enroll.
    requiredDocTypes: [],
    requireClassroomOnEnroll: Boolean(parsed.requireClassroomOnEnroll),
    entranceFeeAmount: Number(parsed.entranceFeeAmount) || 0,
    entranceSchedulingEnabled: parsed.entranceSchedulingEnabled === true,
    entranceSlots: parseEntranceSlots(parsed.entranceSlots),
    entranceBookingDeadline:
      typeof parsed.entranceBookingDeadline === "string" ? parsed.entranceBookingDeadline : null,
    entranceRescheduleCutoffHours: parseCutoffHours(parsed.entranceRescheduleCutoffHours),
    entranceAvailableFrom: parseDateOnly(parsed.entranceAvailableFrom),
    entranceAvailableTo: parseDateOnly(parsed.entranceAvailableTo),
    entranceAvailableWeekdays: parseWeekdays(parsed.entranceAvailableWeekdays),
    entranceAvailabilityNote: parseAvailabilityNote(parsed.entranceAvailabilityNote),
    applyBackgroundUrl: typeof parsed.applyBackgroundUrl === "string" ? parsed.applyBackgroundUrl : "",
  };
}

export function mergeAdmissionPolicy(
  currentRaw: string | null | undefined,
  patch: Partial<AdmissionPolicy> | string | null | undefined
): string {
  const current = parseAdmissionPolicy(currentRaw);
  let incoming: Partial<AdmissionPolicy> = {};
  if (typeof patch === "string") {
    try {
      incoming = JSON.parse(patch);
    } catch {
      incoming = {};
    }
  } else if (patch && typeof patch === "object") {
    incoming = patch;
  }
  const next: AdmissionPolicy = {
    ...current,
    ...incoming,
    // Documents remain optional regardless of stored / patched lists.
    requiredDocTypes: [],
  };
  if (incoming.publicApplyEnabled !== undefined) {
    next.publicApplyEnabled = Boolean(incoming.publicApplyEnabled);
  }
  if (incoming.returningApplyEnabled !== undefined) {
    next.returningApplyEnabled = Boolean(incoming.returningApplyEnabled);
  }
  if (incoming.requireEntranceFee !== undefined) {
    next.requireEntranceFee = Boolean(incoming.requireEntranceFee);
  }
  if (incoming.requireClassroomOnEnroll !== undefined) {
    next.requireClassroomOnEnroll = Boolean(incoming.requireClassroomOnEnroll);
  }
  if (incoming.entranceFeeAmount !== undefined) {
    next.entranceFeeAmount = Number(incoming.entranceFeeAmount) || 0;
  }
  if (incoming.entranceSchedulingEnabled !== undefined) {
    next.entranceSchedulingEnabled = incoming.entranceSchedulingEnabled === true;
  }
  if (incoming.entranceSlots !== undefined) {
    next.entranceSlots = parseEntranceSlots(incoming.entranceSlots);
  }
  if (incoming.entranceBookingDeadline !== undefined) {
    next.entranceBookingDeadline =
      typeof incoming.entranceBookingDeadline === "string" ? incoming.entranceBookingDeadline : null;
  }
  if (incoming.entranceRescheduleCutoffHours !== undefined) {
    next.entranceRescheduleCutoffHours = parseCutoffHours(incoming.entranceRescheduleCutoffHours);
  }
  if (incoming.entranceAvailableFrom !== undefined) {
    next.entranceAvailableFrom = parseDateOnly(incoming.entranceAvailableFrom);
  }
  if (incoming.entranceAvailableTo !== undefined) {
    next.entranceAvailableTo = parseDateOnly(incoming.entranceAvailableTo);
  }
  if (incoming.entranceAvailableWeekdays !== undefined) {
    next.entranceAvailableWeekdays = parseWeekdays(incoming.entranceAvailableWeekdays);
  }
  if (incoming.entranceAvailabilityNote !== undefined) {
    next.entranceAvailabilityNote = parseAvailabilityNote(incoming.entranceAvailabilityNote);
  }
  if (incoming.applyBackgroundUrl !== undefined) {
    next.applyBackgroundUrl = String(incoming.applyBackgroundUrl || "");
  }
  return JSON.stringify(next);
}
