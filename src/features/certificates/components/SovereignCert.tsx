import React from "react";
import type { CertificateData } from "../types";
import { getCertificatePrimaryColor } from "../registry";
import {
  Canvas,
  CERT_H,
  CERT_W,
  DateBlock,
  fitName,
  Footer,
  LaurelRule,
  LogoSlot,
  SANS_INTER,
  Seal,
  SERIF_CINZEL,
  SERIF_CORM,
  SignatureBlock,
  Texture,
} from "./CertificatePrimitives";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

export function SovereignCert({ data, compact }: Props) {
  const wine = getCertificatePrimaryColor("CERT_SOVEREIGN");
  const gold = "#C6A04A";
  const paper = "#FBF8F1";
  const sealId = React.useId().replace(/:/g, "");
  const title = data.title || "Certificate of Achievement";
  const studs: [number, number][] = [];
  for (let x = 44; x < CERT_W - 30; x += 28) studs.push([x, 14], [x, CERT_H - 14]);
  for (let y = 44; y < CERT_H - 30; y += 28) studs.push([14, y], [CERT_W - 14, y]);
  const corner = (rot: number, pos: React.CSSProperties) => (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: "absolute", transform: `rotate(${rot}deg)`, ...pos }} aria-hidden="true">
      <path d="M0 52A52 52 0 0 0 52 0" fill="none" stroke={gold} strokeWidth="1.4" />
      <path d="M0 38A38 38 0 0 0 38 0" fill="none" stroke={gold} strokeWidth="0.8" />
      <circle cx="12" cy="12" r="4" fill={gold} />
    </svg>
  );
  return (
    <Canvas scale={compact ? 0.68 : 1} background={paper}>
      <Texture color={wine} rosette={0.07} />
      <div style={{ position: "absolute", inset: 0, border: `28px solid ${wine}`, boxSizing: "border-box" }} />
      <svg width={CERT_W} height={CERT_H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        {studs.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill={gold} />)}
      </svg>
      <div style={{ position: "absolute", inset: 28, border: `2px solid ${gold}` }} />
      <div style={{ position: "absolute", inset: 38, border: `1px solid ${gold}`, opacity: 0.7 }} />
      {corner(0, { top: 42, left: 42 })}
      {corner(90, { top: 42, right: 42 })}
      {corner(180, { bottom: 42, right: 42 })}
      {corner(270, { bottom: 42, left: 42 })}

      <div style={{ position: "absolute", inset: "74px 118px 70px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: wine }}>
        <LogoSlot logoUrl={data.school.logoUrl} />
        <div style={{ fontFamily: SANS_INTER, fontSize: 12.5, letterSpacing: 5, color: gold, fontWeight: 600, marginTop: 8 }}>{data.school.name.toUpperCase()}</div>
        <h1 style={{ fontFamily: SERIF_CINZEL, fontWeight: 600, fontSize: fitName(title, 42, 24), letterSpacing: 2, margin: "16px 0 0" }}>{title}</h1>
        <div style={{ margin: "12px 0 6px" }}><LaurelRule color={gold} /></div>
        <div style={{ fontFamily: SERIF_CORM, fontStyle: "italic", fontSize: 21, opacity: 0.75 }}>{data.leadIn}</div>
        <div style={{ fontFamily: SERIF_CORM, fontStyle: "italic", fontWeight: 500, fontSize: fitName(data.studentName, 76, 24), lineHeight: 1.1, margin: "8px 0 4px" }}>{data.studentName}</div>
        <p style={{ fontFamily: SERIF_CORM, fontSize: 20, lineHeight: 1.5, maxWidth: 660, margin: "6px 0 0", color: "#2B1A20", opacity: 0.85 }}>{data.body}</p>
        <Footer
          left={<DateBlock date={data.issueDate} certificateId={data.certificateId} academicYear={data.academicYear} address={data.school.address} color={wine} font={SERIF_CORM} sans={SANS_INTER} line={gold} />}
          center={<SignatureBlock items={data.signatories} color={wine} line={wine} nameFont={SERIF_CORM} titleFont={SANS_INTER} />}
          right={<Seal uid={sealId} fill={wine} ring={gold} ink={gold} issuer={data.school.name} font={SERIF_CINZEL} />}
        />
      </div>
    </Canvas>
  );
}
