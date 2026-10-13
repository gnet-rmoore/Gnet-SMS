/** Shared admission policy helpers (Identity). */

export type AdmissionPolicy = {
  publicApplyEnabled: boolean;
  /** Allow returning students to re-register online (match existing STUDENT by email + DOB). */
  returningApplyEnabled: boolean;
  requireEntranceFee: boolean;
  requiredDocTypes: string[];
  requireClassroomOnEnroll: boolean;
  entranceFeeAmount: number;
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
};

export function parseAdmissionPolicy(raw: string | null | undefined): AdmissionPolicy {
  let parsed: Partial<AdmissionPolicy> = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* keep defaults */
    }
  }
  return {
    ...DEFAULT_ADMISSION_POLICY,
    ...parsed,
    // Product rule (2026-07-29): admission documents never block enroll.
    requiredDocTypes: [],
    publicApplyEnabled: parsed.publicApplyEnabled !== false,
    returningApplyEnabled: parsed.returningApplyEnabled !== false,
    requireEntranceFee: Boolean(parsed.requireEntranceFee),
    requireClassroomOnEnroll: Boolean(parsed.requireClassroomOnEnroll),
    entranceFeeAmount: Number(parsed.entranceFeeAmount) || 0,
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
  if (incoming.applyBackgroundUrl !== undefined) {
    next.applyBackgroundUrl = String(incoming.applyBackgroundUrl || "");
  }
  return JSON.stringify(next);
}
