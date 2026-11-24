export type CertificateTemplateId =
  | "CERT_CLASSIC_BROWN"
  | "CERT_GOLD_LAURELS"
  | "CERT_RED_SEAL"
  | "CERT_HERITAGE_TAN";

export type CertificateSignatory = {
  name: string;
  title: string;
  signatureUrl?: string | null;
};

export type CertificateRoster = {
  enabled: boolean;
  studentIds: string[];
};

export type CertificateDefaults = {
  sig1Name: string;
  sig1Title: string;
  sig2Name: string;
  sig2Title: string;
  sig1UserId: string;
  sig2UserId: string;
  title: string;
  leadIn: string;
  body: string;
  certificateIdPrefix: string;
  issueDateDefault: string;
  academicYearDefault: string;
  certificateRoster: CertificateRoster;
};

export const DEFAULT_CERTIFICATE_DEFAULTS: CertificateDefaults = {
  sig1Name: "",
  sig1Title: "School Principal",
  sig2Name: "",
  sig2Title: "Education Chairman",
  sig1UserId: "",
  sig2UserId: "",
  title: "Certificate of Achievement",
  leadIn: "This certificate is proudly presented to",
  body: "has completed the prescribed course of study at {{schoolName}}.",
  certificateIdPrefix: "CERT",
  issueDateDefault: "",
  academicYearDefault: "",
  certificateRoster: { enabled: false, studentIds: [] },
};

export type CertificateData = {
  school: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
  };
  brandColor: string | null;
  title: string;
  leadIn: string;
  studentName: string;
  body: string;
  certificateId?: string | null;
  issueDate: string;
  academicYear: string;
  signatories: [CertificateSignatory, CertificateSignatory];
};

export type CertificateTemplateDef = {
  id: CertificateTemplateId;
  name: string;
  description: string;
  cssPageSize: string;
  pdfFormat: "a4";
  orientation: "landscape";
  fallbackBrand: string;
};
