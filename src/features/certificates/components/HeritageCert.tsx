import React from "react";
import type { CertificateData } from "../types";
import { getCertificatePrimaryColor } from "../registry";
import {
  Canvas,
  DateBlock,
  Divider,
  fitName,
  Footer,
  LogoSlot,
  SANS_INTER,
  Seal,
  SERIF_CORM,
  SignatureBlock,
  Texture,
} from "./CertificatePrimitives";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

function Corner({ rotate, color, accent }: { rotate: number; color: string; accent: string }) {
  const pos: React.CSSProperties = { position: "absolute", transform: `rotate(${rotate}deg)` };
  if (rotate === 0) Object.assign(pos, { top: 24, left: 24 });
  if (rotate === 90) Object.assign(pos, { top: 24, right: 24 });
  if (rotate === 180) Object.assign(pos, { bottom: 24, right: 24 });
  if (rotate === 270) Object.assign(pos, { bottom: 24, left: 24 });
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" style={pos} aria-hidden="true">
      <path d="M2 82V2h80" fill="none" stroke={color} strokeWidth="3" />
      <path d="M14 70V14h56" fill="none" stroke={accent} strokeWidth="1" />
      <path d="M14 14 q22 2 30 26 q-22 -4 -30 -26z" fill={accent} opacity="0.9" />
      <rect x="-3" y="-3" width="10" height="10" transform="translate(2 2) rotate(45 2 2)" fill={color} />
      <circle cx="70" cy="14" r="2.4" fill={accent} />
      <circle cx="14" cy="70" r="2.4" fill={accent} />
    </svg>
  );
}

export function HeritageCert({ data, compact }: Props) {
  const navy = getCertificatePrimaryColor("CERT_CLASSIC_BROWN");
  const gold = "#B08D3C";
  const paper = "#FBFAF6";
  const sealId = React.useId().replace(/:/g, "");
  return (
    <Canvas scale={compact ? 0.68 : 1} background={paper}>
      <Texture color={gold} rosette={0.1} />
      <div style={{ position: "absolute", inset: 22, border: `3px solid ${navy}` }} />
      <div style={{ position: "absolute", inset: 32, border: `1px solid ${gold}` }} />
      <div style={{ position: "absolute", inset: 38, border: `1px solid ${navy}`, opacity: 0.25 }} />
      {[0, 90, 180, 270].map((r) => <Corner key={r} rotate={r} color={navy} accent={gold} />)}

      <div style={{ position: "absolute", inset: "78px 120px 70px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: navy }}>
        <LogoSlot logoUrl={data.school.logoUrl} />
        <div style={{ fontFamily: SANS_INTER, fontSize: 13, letterSpacing: 5, color: gold, fontWeight: 600, marginTop: 10 }}>{data.school.name.toUpperCase()}</div>
        <h1 style={{ fontFamily: SERIF_CORM, fontSize: 62, fontWeight: 500, margin: "16px 0 0", letterSpacing: 1 }}>{data.title || "Certificate of Achievement"}</h1>
        <div style={{ margin: "16px 0 14px" }}><Divider color={gold} /></div>
        <div style={{ fontFamily: SERIF_CORM, fontStyle: "italic", fontSize: 22, opacity: 0.75 }}>{data.leadIn}</div>
        <div style={{ fontFamily: SERIF_CORM, fontSize: fitName(data.studentName, 76, 24), fontWeight: 500, lineHeight: 1.1, margin: "12px 0 8px" }}>{data.studentName}</div>
        <p style={{ fontFamily: SERIF_CORM, fontSize: 21, lineHeight: 1.5, maxWidth: 680, margin: "6px 0 0", opacity: 0.85 }}>{data.body}</p>

        <Footer
          left={<DateBlock date={data.issueDate} certificateId={data.certificateId} academicYear={data.academicYear} address={data.school.address} color={navy} font={SERIF_CORM} sans={SANS_INTER} line={gold} />}
          center={<SignatureBlock items={data.signatories} color={navy} line={navy} nameFont={SERIF_CORM} titleFont={SANS_INTER} />}
          right={<Seal uid={sealId} fill={gold} ring={paper} ink={paper} issuer={data.school.name} font={SERIF_CORM} />}
        />
      </div>
    </Canvas>
  );
}
