/** School admission policy shape (Identity `School.admissionPolicy` JSON). */

export type AdmissionPolicy = {
  publicApplyEnabled: boolean;
  /** Allow returning students to re-register online (email + DOB match). */
  returningApplyEnabled: boolean;
  requireEntranceFee: boolean;
  requiredDocTypes: string[];
  requireClassroomOnEnroll: boolean;
  entranceFeeAmount: number;
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
  applyBackgroundUrl: "",
};

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
