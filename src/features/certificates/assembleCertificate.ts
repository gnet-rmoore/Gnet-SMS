import type {
  CertificateData,
  CertificateDefaults,
  CertificateRoster,
  CertificateSignatory,
} from "./types";
import { DEFAULT_CERTIFICATE_DEFAULTS } from "./types";

export type AssembleCertificateInput = {
  schoolName: string;
  studentName: string;
  academicYear?: string | null;
  issueDate?: string | null;
  title?: string | null;
  leadIn?: string | null;
  body?: string | null;
  certificateId?: string | null;
  signatories?: [CertificateSignatory, CertificateSignatory] | null;
  logoUrl?: string | null;
  address?: string | null;
  brandColor?: string | null;
};

function currentAcademicYear(): string {
  const year = new Date().getFullYear();
  return `${year} — ${year + 1}`;
}

function currentIssueDate(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function interpolate(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "");
}

export function parseCertificateRoster(raw: unknown): CertificateRoster {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CERTIFICATE_DEFAULTS.certificateRoster };
  const obj = raw as { enabled?: unknown; studentIds?: unknown };
  const studentIds = Array.isArray(obj.studentIds)
    ? obj.studentIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];
  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : false,
    studentIds: [...new Set(studentIds)],
  };
}

export function assembleCertificateData(
  input: AssembleCertificateInput
): CertificateData {
  const schoolName = (input.schoolName || "").trim() || "School";
  const studentName = (input.studentName || "").trim() || "—";
  const academicYear = (input.academicYear || "").trim() || currentAcademicYear();
  const issueDate = (input.issueDate || "").trim() || currentIssueDate();
  const values = { schoolName, studentName, academicYear };

  const sigs: [CertificateSignatory, CertificateSignatory] = input.signatories || [
    { name: "", title: "School Principal", signatureUrl: null },
    { name: "", title: "Education Chairman", signatureUrl: null },
  ];

  const brand = (input.brandColor || "").trim() || null;

  return {
    school: {
      name: schoolName,
      logoUrl: input.logoUrl ?? null,
      address: (input.address || "").trim() || null,
    },
    brandColor: brand && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(brand) ? brand : null,
    title:
      interpolate((input.title || "").trim() || DEFAULT_CERTIFICATE_DEFAULTS.title, values) ||
      DEFAULT_CERTIFICATE_DEFAULTS.title,
    leadIn:
      interpolate(
        (input.leadIn || "").trim() || DEFAULT_CERTIFICATE_DEFAULTS.leadIn,
        values
      ) || DEFAULT_CERTIFICATE_DEFAULTS.leadIn,
    studentName,
    body:
      interpolate(
        (input.body || "").trim() || DEFAULT_CERTIFICATE_DEFAULTS.body,
        values
      ) || DEFAULT_CERTIFICATE_DEFAULTS.body,
    certificateId: (input.certificateId || "").trim() || null,
    issueDate,
    academicYear,
    signatories: [
      {
        name: (sigs[0].name || "").trim(),
        title: (sigs[0].title || "").trim() || "School Principal",
        signatureUrl: sigs[0].signatureUrl ?? null,
      },
      {
        name: (sigs[1].name || "").trim(),
        title: (sigs[1].title || "").trim() || "Education Chairman",
        signatureUrl: sigs[1].signatureUrl ?? null,
      },
    ],
  };
}

export function parseCertificateDefaults(raw: unknown): CertificateDefaults {
  if (!raw) {
    return {
      ...DEFAULT_CERTIFICATE_DEFAULTS,
      certificateRoster: { ...DEFAULT_CERTIFICATE_DEFAULTS.certificateRoster },
    };
  }
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return {
      ...DEFAULT_CERTIFICATE_DEFAULTS,
      certificateRoster: { ...DEFAULT_CERTIFICATE_DEFAULTS.certificateRoster },
    };
  }
  const text = (key: keyof CertificateDefaults) => String(obj[key] ?? "").trim();
  return {
    sig1Name: text("sig1Name"),
    sig1Title: text("sig1Title") || DEFAULT_CERTIFICATE_DEFAULTS.sig1Title,
    sig2Name: text("sig2Name"),
    sig2Title: text("sig2Title") || DEFAULT_CERTIFICATE_DEFAULTS.sig2Title,
    sig1UserId: text("sig1UserId"),
    sig2UserId: text("sig2UserId"),
    title: text("title") || DEFAULT_CERTIFICATE_DEFAULTS.title,
    leadIn: text("leadIn") || DEFAULT_CERTIFICATE_DEFAULTS.leadIn,
    body: text("body") || DEFAULT_CERTIFICATE_DEFAULTS.body,
    certificateIdPrefix:
      text("certificateIdPrefix") || DEFAULT_CERTIFICATE_DEFAULTS.certificateIdPrefix,
    issueDateDefault: text("issueDateDefault"),
    academicYearDefault: text("academicYearDefault"),
    certificateRoster: parseCertificateRoster(obj.certificateRoster),
  };
}

export function serializeCertificateDefaults(
  defaults: CertificateDefaults
): string {
  return JSON.stringify(parseCertificateDefaults(defaults));
}
