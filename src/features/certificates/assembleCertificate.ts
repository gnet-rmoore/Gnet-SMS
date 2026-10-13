import type {
  CertificateData,
  CertificateDefaults,
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
  signatories?: [CertificateSignatory, CertificateSignatory] | null;
  logoUrl?: string | null;
  address?: string | null;
  brandColor?: string | null;
};

function defaultBody(schoolName: string): string {
  return `has completed the prescribed course of study at ${schoolName}.`;
}

/** Map school + student (+ optional overrides) → printable certificate data. */
export function assembleCertificateData(
  input: AssembleCertificateInput
): CertificateData {
  const schoolName = (input.schoolName || "").trim() || "School";
  const studentName = (input.studentName || "").trim() || "—";
  const year =
    (input.academicYear || "").trim() ||
    `${new Date().getFullYear()} — ${new Date().getFullYear() + 1}`;
  const issueDate =
    (input.issueDate || "").trim() ||
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

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
    title: (input.title || "").trim() || "CERTIFICATE OF COMPLETION",
    leadIn: (input.leadIn || "").trim() || "THIS CERTIFIES THAT",
    studentName: studentName.toUpperCase(),
    body: (input.body || "").trim() || defaultBody(schoolName),
    issueDate,
    academicYear: year,
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
  if (!raw) return { ...DEFAULT_CERTIFICATE_DEFAULTS };
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_CERTIFICATE_DEFAULTS };
    }
  }
  if (!obj || typeof obj !== "object") return { ...DEFAULT_CERTIFICATE_DEFAULTS };
  return {
    sig1Name: String(obj.sig1Name ?? "").trim(),
    sig1Title:
      String(obj.sig1Title ?? "").trim() || DEFAULT_CERTIFICATE_DEFAULTS.sig1Title,
    sig2Name: String(obj.sig2Name ?? "").trim(),
    sig2Title:
      String(obj.sig2Title ?? "").trim() || DEFAULT_CERTIFICATE_DEFAULTS.sig2Title,
    sig1UserId: String(obj.sig1UserId ?? "").trim(),
    sig2UserId: String(obj.sig2UserId ?? "").trim(),
  };
}

export function serializeCertificateDefaults(
  defaults: CertificateDefaults
): string {
  const parsed = parseCertificateDefaults(defaults);
  return JSON.stringify(parsed);
}
