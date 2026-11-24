import type { CertificateTemplateDef, CertificateTemplateId } from "./types";

export const CERTIFICATE_TEMPLATES: CertificateTemplateDef[] = [
  {
    id: "CERT_CLASSIC_BROWN",
    name: "Heritage",
    description: "Ivory, navy and gold. Triple frame with flourished corners. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    primaryColor: "#14264A",
  },
  {
    id: "CERT_GOLD_LAURELS",
    name: "Meridian",
    description: "White, deep emerald and brass. Chamfered double frame. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    primaryColor: "#0E3B36",
  },
  {
    id: "CERT_RED_SEAL",
    name: "Noir",
    description: "Charcoal with champagne-gold gradient title. Corner brackets. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    primaryColor: "#14161A",
  },
  {
    id: "CERT_HERITAGE_TAN",
    name: "Atlas",
    description: "Left-aligned editorial layout. Heavy indigo frame with ruler-tick edges. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    primaryColor: "#1C2766",
  },
  {
    id: "CERT_SOVEREIGN",
    name: "Sovereign",
    description: "Ivory with a thick burgundy border, gold studs, and a laurel divider. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    primaryColor: "#5B1226",
  },
  {
    id: "CERT_REGENT",
    name: "Regent",
    description: "Navy page with an ivory notched panel and a subtle gold lattice. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    primaryColor: "#10224A",
  },
  {
    id: "CERT_DECO",
    name: "Deco",
    description: "Emerald-black with a stepped gold frame and sunburst fan. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    primaryColor: "#0A2B25",
  },
  {
    id: "CERT_IMPERIAL",
    name: "Imperial",
    description: "Royal purple banknote-style lace border with gold accents and laurels. A4 landscape.",
    cssPageSize: "a4 landscape",
    pdfFormat: "a4",
    orientation: "landscape",
    primaryColor: "#33195F",
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
  sovereign: "CERT_SOVEREIGN",
  regent: "CERT_REGENT",
  deco: "CERT_DECO",
  imperial: "CERT_IMPERIAL",
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

export function getCertificatePrimaryColor(
  templateId: string | null | undefined
): string {
  return getCertificateTemplateDef(templateId).primaryColor;
}
