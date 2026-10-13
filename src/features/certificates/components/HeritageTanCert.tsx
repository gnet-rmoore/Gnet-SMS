import React from "react";
import type { CertificateData } from "../types";
import { MedalSeal } from "./Seals";
import { CertSchoolMark, certBrandStyle } from "./CertChrome";
import { CertSignatory } from "./CertSignatory";
import { resolveCertificateBrand } from "../registry";
import "../styles/fonts.css";
import "../styles/heritage-tan.css";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

function CornerFan() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden>
      <path
        fill="currentColor"
        d="M2 2h8v2H4v6H2V2zm10 0l18 18-2 2L10 4l2-2zm20 2c8 0 14 6 14 14h-3c0-6-5-11-11-11V4zM2 14c0 18 14 32 32 32v-3C18 43 5 30 5 14H2z"
        opacity="0.85"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        d="M14 6c10 2 18 10 20 20M10 12c8 2 14 8 16 16"
      />
    </svg>
  );
}

export function HeritageTanCert({ data, compact }: Props) {
  const brandStyle = certBrandStyle("CERT_HERITAGE_TAN", data);
  const brand = resolveCertificateBrand("CERT_HERITAGE_TAN", data.brandColor);
  const titleLines = data.title.includes("\n")
    ? data.title.split("\n")
    : data.title.toUpperCase().includes("GRADUATION")
      ? ["HIGH SCHOOL", "GRADUATION DIPLOMA"]
      : [data.title];

  return (
    <div
      className="cert-heritage-tan"
      id="graduation-certificate"
      data-page-size="letter-landscape"
      style={brandStyle}
    >
      <div className="stage" style={compact ? { padding: 0 } : undefined}>
        <div className="sheet cert-sheet">
          <div className="outer-frame" />
          <div className="inner-line" />
          <div className="corner tl">
            <CornerFan />
          </div>
          <div className="corner tr">
            <CornerFan />
          </div>
          <div className="corner bl">
            <CornerFan />
          </div>
          <div className="corner br">
            <CornerFan />
          </div>
          <div className="content">
            <div>
              <CertSchoolMark data={data} />
              <h1 className="title">
                {titleLines.map((line) => (
                  <span key={line} style={{ display: "block" }}>
                    {line}
                  </span>
                ))}
              </h1>
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
                <MedalSeal fill={brand} />
              </div>
              <CertSignatory sig={data.signatories[1]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
