import React from "react";
import type { CertificateData } from "../types";
import { resolveCertificateBrand, resolveCertificateTemplateKey } from "../registry";

/** Shared logo + address block for certificate headers. */
export function CertSchoolMark({ data }: { data: CertificateData }) {
  const logo = data.school.logoUrl;
  const address = data.school.address;
  if (!logo && !address) return null;
  return (
    <div className="cert-school-mark">
      {logo ? (
        <img
          className="cert-logo"
          src={logo}
          alt=""
          crossOrigin="anonymous"
        />
      ) : null}
      {address ? <p className="cert-address">{address}</p> : null}
    </div>
  );
}

/** Apply --cert-brand for accents; returns className props for the sheet root. */
export function certBrandStyle(
  templateId: string,
  data: CertificateData
): React.CSSProperties {
  const brand = resolveCertificateBrand(
    resolveCertificateTemplateKey(templateId),
    data.brandColor
  );
  return { ["--cert-brand" as string]: brand };
}
