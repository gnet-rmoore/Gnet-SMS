export type CertificateTemplateId =
  | "CERT_CLASSIC_BROWN"
  | "CERT_GOLD_LAURELS"
  | "CERT_RED_SEAL"
  | "CERT_HERITAGE_TAN";

export type CertificateSignatory = {
  name: string;
  title: string;
  /** Official signature data URL when available */
  signatureUrl?: string | null;
};

/** Persisted per-school defaults for certificate issuance. */
export type CertificateDefaults = {
  sig1Name: string;
  sig1Title: string;
  sig2Name: string;
  sig2Title: string;
  sig1UserId: string;
  sig2UserId: string;
};

export const DEFAULT_CERTIFICATE_DEFAULTS: CertificateDefaults = {
  sig1Name: "",
  sig1Title: "School Principal",
  sig2Name: "",
  sig2Title: "Education Chairman",
  sig1UserId: "",
  sig2UserId: "",
};

export type CertificateData = {
  school: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
  };
  /** School brand hex for accents; templates fall back to design defaults when empty */
  brandColor: string | null;
  /** Main heading, e.g. CERTIFICATE OF COMPLETION */
  title: string;
  /** Line above the student name */
  leadIn: string;
  studentName: string;
  /** Sentence below the name (school name already interpolated) */
  body: string;
  issueDate: string;
  academicYear: string;
  signatories: [CertificateSignatory, CertificateSignatory];
};

export type CertificateTemplateDef = {
  id: CertificateTemplateId;
  name: string;
  description: string;
  /** CSS @page size token */
  cssPageSize: string;
  pdfFormat: "letter";
  orientation: "landscape";
  /** Design fallback accent when school has no brandColor */
  fallbackBrand: string;
};
