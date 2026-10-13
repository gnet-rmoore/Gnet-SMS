import type { CertificateTemplateDef, CertificateTemplateId } from "./types";

export const CERTIFICATE_TEMPLATES: CertificateTemplateDef[] = [
  {
    id: "CERT_CLASSIC_BROWN",
    name: "Classic brown frame",
    description: "Double brown border with scalloped seal. Landscape Letter.",
    cssPageSize: "letter landscape",
    pdfFormat: "letter",
    orientation: "landscape",
    fallbackBrand: "#5c4033",
  },
  {
    id: "CERT_GOLD_LAURELS",
    name: "Gold laurels",
    description: "Gold side rules, laurel watermark, gold seal. Landscape Letter.",
    cssPageSize: "letter landscape",
    pdfFormat: "letter",
    orientation: "landscape",
    fallbackBrand: "#c9a227",
  },
  {
    id: "CERT_RED_SEAL",
    name: "Red seal diploma",
    description: "Grey band frame with red wreath seal. Landscape Letter.",
    cssPageSize: "letter landscape",
    pdfFormat: "letter",
    orientation: "landscape",
    fallbackBrand: "#b91c1c",
  },
  {
    id: "CERT_HERITAGE_TAN",
    name: "Heritage diploma",
    description: "Tan border, art-deco corners, medal seal. Landscape Letter.",
    cssPageSize: "letter landscape",
    pdfFormat: "letter",
    orientation: "landscape",
    fallbackBrand: "#c4a574",
  },
];

const byId = Object.fromEntries(
  CERTIFICATE_TEMPLATES.map((t) => [t.id, t])
) as Record<CertificateTemplateId, CertificateTemplateDef>;

export function resolveCertificateTemplateKey(
  raw: string | null | undefined
): CertificateTemplateId {
  if (
    raw === "CERT_CLASSIC_BROWN" ||
    raw === "CERT_GOLD_LAURELS" ||
    raw === "CERT_RED_SEAL" ||
    raw === "CERT_HERITAGE_TAN"
  ) {
    return raw;
  }
  return "CERT_CLASSIC_BROWN";
}

export function getCertificateTemplateDef(
  raw: string | null | undefined
): CertificateTemplateDef {
  return byId[resolveCertificateTemplateKey(raw)];
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
