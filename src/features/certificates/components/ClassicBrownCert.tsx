import React from "react";
import type { CertificateData } from "../types";
import { CertSignatory } from "./CertSignatory";
import { ScallopedSeal } from "./Seals";
import { CertSchoolMark, certBrandStyle } from "./CertChrome";
import { resolveCertificateBrand } from "../registry";
import "../styles/fonts.css";
import "../styles/classic-brown.css";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

export function ClassicBrownCert({ data, compact }: Props) {
  const brandStyle = certBrandStyle("CERT_CLASSIC_BROWN", data);
  const brand = resolveCertificateBrand("CERT_CLASSIC_BROWN", data.brandColor);
  return (
    <div
      className="cert-classic-brown"
      id="graduation-certificate"
      data-page-size="letter-landscape"
      style={brandStyle}
    >
      <div className="stage" style={compact ? { padding: 0 } : undefined}>
        <div className="sheet cert-sheet">
          <div className="outer-frame" />
          <div className="inner-frame" />
          <div className="content">
            <div>
              <CertSchoolMark data={data} />
              <h1 className="title">{data.title}</h1>
              <div className="flourish" aria-hidden />
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
                <ScallopedSeal fill={brand} />
              </div>
              <CertSignatory sig={data.signatories[1]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
