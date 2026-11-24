export type CertificateRoster = { enabled: boolean; studentIds: string[] };

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

const DEFAULTS: CertificateDefaults = {
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

function trim(value: unknown): string {
  return String(value ?? "").trim();
}

function parseCertificateRoster(raw: unknown): CertificateRoster {
  if (!raw || typeof raw !== "object") return { enabled: false, studentIds: [] };
  const obj = raw as { enabled?: unknown; studentIds?: unknown };
  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : false;
  const studentIds = Array.isArray(obj.studentIds)
    ? obj.studentIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    : [];
  return { enabled, studentIds };
}

export function parseCertificateDefaults(raw: unknown): CertificateDefaults {
  if (!raw) return { ...DEFAULTS, certificateRoster: { ...DEFAULTS.certificateRoster } };
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ...DEFAULTS, certificateRoster: { ...DEFAULTS.certificateRoster } };
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ...DEFAULTS, certificateRoster: { ...DEFAULTS.certificateRoster } };
  }
  return {
    sig1Name: trim(obj.sig1Name),
    sig1Title: trim(obj.sig1Title) || DEFAULTS.sig1Title,
    sig2Name: trim(obj.sig2Name),
    sig2Title: trim(obj.sig2Title) || DEFAULTS.sig2Title,
    sig1UserId: trim(obj.sig1UserId),
    sig2UserId: trim(obj.sig2UserId),
    title: trim(obj.title) || DEFAULTS.title,
    leadIn: trim(obj.leadIn) || DEFAULTS.leadIn,
    body: trim(obj.body) || DEFAULTS.body,
    certificateIdPrefix: trim(obj.certificateIdPrefix) || DEFAULTS.certificateIdPrefix,
    issueDateDefault: trim(obj.issueDateDefault),
    academicYearDefault: trim(obj.academicYearDefault),
    certificateRoster: parseCertificateRoster(obj.certificateRoster),
  };
}

export function serializeCertificateDefaults(raw: unknown): string {
  return JSON.stringify(parseCertificateDefaults(raw));
}
