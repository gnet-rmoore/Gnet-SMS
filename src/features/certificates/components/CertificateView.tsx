import React from "react";
import type { CertificateData } from "../types";
import { resolveCertificateTemplateKey } from "../registry";
import { HeritageCert } from "./HeritageCert";
import { MeridianCert } from "./MeridianCert";
import { NoirCert } from "./NoirCert";
import { AtlasCert } from "./AtlasCert";
import "../styles/fonts.css";

export type CertificateViewProps = {
  templateId: string;
  data: CertificateData;
  compact?: boolean;
};

export function CertificateView({ templateId, data, compact }: CertificateViewProps) {
  const key = resolveCertificateTemplateKey(templateId);
  if (key === "CERT_GOLD_LAURELS") {
    return <MeridianCert data={data} compact={compact} />;
  }
  if (key === "CERT_RED_SEAL") {
    return <NoirCert data={data} compact={compact} />;
  }
  if (key === "CERT_HERITAGE_TAN") {
    return <AtlasCert data={data} compact={compact} />;
  }
  return <HeritageCert data={data} compact={compact} />;
}
