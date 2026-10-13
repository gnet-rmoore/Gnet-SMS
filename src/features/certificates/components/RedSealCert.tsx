import React from "react";
import type { CertificateData } from "../types";
import { RedWreathSeal } from "./Seals";
import { CertSchoolMark, certBrandStyle } from "./CertChrome";
import { CertSignatory } from "./CertSignatory";
import { resolveCertificateBrand } from "../registry";
import "../styles/fonts.css";
import "../styles/red-seal.css";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

/** Red-seal layout leads with school name (matches diploma samples). */
export function RedSealCert({ data, compact }: Props) {
  const brandStyle = certBrandStyle("CERT_RED_SEAL", data);
  const brand = resolveCertificateBrand("CERT_RED_SEAL", data.brandColor);
  return (
    <div
      className="cert-red-seal"
      id="graduation-certificate"
      data-page-size="letter-landscape"
      style={brandStyle}
    >
      <div className="stage" style={compact ? { padding: 0 } : undefined}>
        <div className="sheet cert-sheet">
          <div className="band" />
          <div className="band-rule" />
          <div className="content">
            <div>
              <CertSchoolMark data={data} />
              <h1 className="school-name">{data.school.name}</h1>
              <p className="lead-in">{data.leadIn}</p>
              <p className="student-name">{data.studentName}</p>
              <p className="body">{data.body}</p>
              <p className="meta">
                {data.academicYear}
                {data.issueDate ? ` · ${data.issueDate}` : ""}
              </p>
            </div>
            <div className="footer">
              <CertSignatory sig={data.signatories[0]} />
              <div className="seal-wrap">
                <RedWreathSeal fill={brand} />
              </div>
              <CertSignatory sig={data.signatories[1]} />
            </div>
          </div>
          <div className="band-rule bottom" />
          <div className="band" />
        </div>
      </div>
    </div>
  );
}
