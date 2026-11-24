import React from "react";
import type { CertificateData } from "../types";
import { getCertificatePrimaryColor } from "../registry";
import {
  Canvas,
  CERT_H,
  CERT_W,
  DateBlock,
  Divider,
  fitName,
  Footer,
  LogoSlot,
  SANS_DM,
  Seal,
  SERIF_BODONI,
  SignatureBlock,
  Texture,
} from "./CertificatePrimitives";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

function notched(inset: number, c: number) {
  const a = inset;
  const r = CERT_W - inset;
  const b = CERT_H - inset;
  return `M${a + c} ${a}H${r - c}A${c} ${c} 0 0 0 ${r} ${a + c}V${b - c}A${c} ${c} 0 0 0 ${r - c} ${b}H${a + c}A${c} ${c} 0 0 0 ${a} ${b - c}V${a + c}A${c} ${c} 0 0 0 ${a + c} ${a}Z`;
}

export function RegentCert({ data, compact }: Props) {
  const navy = getCertificatePrimaryColor("CERT_REGENT");
  const gold = "#C2A25A";
  const panel = "#FBF8F0";
  const uid = React.useId().replace(/:/g, "");
  const latticeId = `regent-lattice-${uid}`;
  const title = data.title || "Certificate of Distinction";
  return (
    <Canvas scale={compact ? 0.68 : 1} background={navy} backgroundClassName="cert-regent-bg">
      <svg width={CERT_W} height={CERT_H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <defs>
          <pattern id={latticeId} width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M13 0L26 13 13 26 0 13z" fill="none" stroke={gold} strokeWidth="0.8" opacity="0.16" />
          </pattern>
        </defs>
        <rect width={CERT_W} height={CERT_H} fill={`url(#${latticeId})`} />
        <path d={notched(34, 30)} fill={panel} stroke={gold} strokeWidth="2.5" />
        <path d={notched(48, 20)} fill="none" stroke={gold} strokeWidth="1" />
        <path d={notched(54, 16)} fill="none" stroke={navy} strokeWidth="0.6" opacity="0.4" />
      </svg>
      <Texture color={navy} rosette={0.06} />

      <div style={{ position: "absolute", inset: "82px 116px 76px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: navy }}>
        <LogoSlot logoUrl={data.school.logoUrl} />
        <div style={{ fontFamily: SANS_DM, fontSize: 12.5, letterSpacing: 5, color: gold, fontWeight: 600, marginTop: 8, filter: "brightness(.85)" }}>{data.school.name.toUpperCase()}</div>
        <h1 style={{ fontFamily: SERIF_BODONI, fontWeight: 500, fontSize: fitName(title, 48, 26), margin: "18px 0 0", letterSpacing: 0.5 }}>{title}</h1>
        <div style={{ margin: "14px 0 6px" }}><Divider color={gold} w={200} /></div>
        <div style={{ fontFamily: SANS_DM, fontSize: 15, marginTop: 8, opacity: 0.65, letterSpacing: 1 }}>{data.leadIn}</div>
        <div style={{ fontFamily: SERIF_BODONI, fontStyle: "italic", fontSize: fitName(data.studentName, 64, 22), lineHeight: 1.15, margin: "10px 0 0" }}>{data.studentName}</div>
        <p style={{ fontFamily: SANS_DM, fontSize: 16.5, lineHeight: 1.65, maxWidth: 640, margin: "16px 0 0", opacity: 0.85 }}>{data.body}</p>
        <Footer
          left={<DateBlock date={data.issueDate} certificateId={data.certificateId} academicYear={data.academicYear} address={data.school.address} color={navy} font={SERIF_BODONI} sans={SANS_DM} line={gold} />}
          center={<SignatureBlock items={data.signatories} color={navy} line={navy} nameFont={SERIF_BODONI} titleFont={SANS_DM} />}
          right={<Seal uid={uid} fill={navy} ring={gold} ink={gold} issuer={data.school.name} font={SERIF_BODONI} />}
        />
      </div>
    </Canvas>
  );
}
