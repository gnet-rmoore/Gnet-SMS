import type { CertificateTemplateDef, CertificateTemplateId } from "./types";

export const CERTIFICATE_TEMPLATES: CertificateTemplateDef[] = [
  {
    id: "CERT_CLASSIC_BROWN",
    name: "Heritage",
    description: "Ivory, navy and gold. Triple frame with flourished corners. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    fallbackBrand: "#14264A",
  },
  {
    id: "CERT_GOLD_LAURELS",
    name: "Meridian",
    description: "White, deep emerald and brass. Chamfered double frame. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    fallbackBrand: "#0E3B36",
  },
  {
    id: "CERT_RED_SEAL",
    name: "Noir",
    description: "Charcoal with champagne-gold gradient title. Corner brackets. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    fallbackBrand: "#14161A",
  },
  {
    id: "CERT_HERITAGE_TAN",
    name: "Atlas",
    description: "Left-aligned editorial layout. Heavy indigo frame with ruler-tick edges. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    fallbackBrand: "#1C2766",
  },
];

const byId = Object.fromEntries(
  CERTIFICATE_TEMPLATES.map((t) => [t.id, t])
) as Record<CertificateTemplateId, CertificateTemplateDef>;

const suppliedIdAliases: Record<string, CertificateTemplateId> = {
  heritage: "CERT_CLASSIC_BROWN",
  meridian: "CERT_GOLD_LAURELS",
  noir: "CERT_RED_SEAL",
  atlas: "CERT_HERITAGE_TAN",
};

export function resolveCertificateTemplateKey(
  raw: string | null | undefined
): CertificateTemplateId {
  const value = (raw || "").trim();
  if (Object.prototype.hasOwnProperty.call(byId, value)) {
    return value as CertificateTemplateId;
  }
  const alias = value.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(suppliedIdAliases, alias)) {
    return suppliedIdAliases[alias];
  }
  return "CERT_CLASSIC_BROWN";
}

export function getCertificateTemplateDef(
  raw: string | null | undefined
): CertificateTemplateDef {
  return byId[resolveCertificateTemplateKey(raw)] ?? CERTIFICATE_TEMPLATES[0];
}

/** Resolve accent color: school brand when valid hex, else template fallback. */
export function resolveCertificateBrand(
  templateId: string | null | undefined,
  brandColor?: string | null
): string {
  const def = getCertificateTemplateDef(templateId);
  const raw = (brandColor || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw) || /^#[0-9A-Fa-f]{3}$/.test(raw)) {
    return raw;
  }
  return def.fallbackBrand;
}
