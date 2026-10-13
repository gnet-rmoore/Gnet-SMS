export type CertificateDefaults = {
  sig1Name: string;
  sig1Title: string;
  sig2Name: string;
  sig2Title: string;
  sig1UserId: string;
  sig2UserId: string;
};

const DEFAULTS: CertificateDefaults = {
  sig1Name: "",
  sig1Title: "School Principal",
  sig2Name: "",
  sig2Title: "Education Chairman",
  sig1UserId: "",
  sig2UserId: "",
};

export function parseCertificateDefaults(raw: unknown): CertificateDefaults {
  if (!raw) return { ...DEFAULTS };
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ...DEFAULTS };
    }
  }
  if (!obj || typeof obj !== "object") return { ...DEFAULTS };
  return {
    sig1Name: String(obj.sig1Name ?? "").trim(),
    sig1Title: String(obj.sig1Title ?? "").trim() || DEFAULTS.sig1Title,
    sig2Name: String(obj.sig2Name ?? "").trim(),
    sig2Title: String(obj.sig2Title ?? "").trim() || DEFAULTS.sig2Title,
    sig1UserId: String(obj.sig1UserId ?? "").trim(),
    sig2UserId: String(obj.sig2UserId ?? "").trim(),
  };
}

export function serializeCertificateDefaults(raw: unknown): string {
  return JSON.stringify(parseCertificateDefaults(raw));
}
