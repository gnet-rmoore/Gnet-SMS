import React from "react";
import type { CertificateData } from "../types";
import { resolveCertificateTemplateKey } from "../registry";
import { ClassicBrownCert } from "./ClassicBrownCert";
import { GoldLaurelsCert } from "./GoldLaurelsCert";
import { RedSealCert } from "./RedSealCert";
import { HeritageTanCert } from "./HeritageTanCert";

export type CertificateViewProps = {
  templateId: string;
  data: CertificateData;
  compact?: boolean;
};

export function CertificateView({ templateId, data, compact }: CertificateViewProps) {
  const key = resolveCertificateTemplateKey(templateId);
  if (key === "CERT_GOLD_LAURELS") {
    return <GoldLaurelsCert data={data} compact={compact} />;
  }
  if (key === "CERT_RED_SEAL") {
    return <RedSealCert data={data} compact={compact} />;
  }
  if (key === "CERT_HERITAGE_TAN") {
    return <HeritageTanCert data={data} compact={compact} />;
  }
  return <ClassicBrownCert data={data} compact={compact} />;
}
