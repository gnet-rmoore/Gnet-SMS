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
  SANS_MANROPE,
  Seal,
  SERIF_MARCELLUS,
  SignatureBlock,
  Texture,
} from "./CertificatePrimitives";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

function Lace({ len, color, accent, h = 30 }: { len: number; color: string; accent: string; h?: number }) {
  const wave = (amp: number, period: number, phase: number) => {
    let d = "";
    for (let x = 0; x <= len; x += 3) d += `${x ? "L" : "M"}${x} ${(h / 2 + amp * Math.sin((x / period) * Math.PI * 2 + phase)).toFixed(1)}`;
    return d;
  };
  return (
    <svg width={len} height={h} aria-hidden="true" style={{ display: "block" }}>
      {[0, 2.094, 4.188].map((ph) => <path key={ph} d={wave(h / 2 - 3, 44, ph)} fill="none" stroke={color} strokeWidth="0.9" />)}
      <path d={wave(5, 22, 0)} fill="none" stroke={accent} strokeWidth="1" />
      <path d={`M0 0.8H${len}M0 ${h - 0.8}H${len}`} stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function ImperialCert({ data, compact }: Props) {
  const purple = getCertificatePrimaryColor("CERT_IMPERIAL");
  const gold = "#B8923A";
  const sealId = React.useId().replace(/:/g, "");
  const title = data.title || "Certificate of Honour";
  const T = 30;
  const I = 26;
  const tile = (pos: React.CSSProperties) => (
    <svg width={T} height={T} style={{ position: "absolute", ...pos }} aria-hidden="true">
      <rect x="0.8" y="0.8" width={T - 1.6} height={T - 1.6} fill="#FCFBF8" stroke={purple} strokeWidth="1.6" />
      <circle cx={T / 2} cy={T / 2} r="9" fill="none" stroke={gold} strokeWidth="1" />
      <path d={`M${T / 2} 8l7 7-7 7-7-7z`} fill={purple} />
    </svg>
  );
  const side = (left: number) => (
    <div style={{ position: "absolute", left, top: I + T, width: T, height: CERT_H - 2 * (I + T) }}>
      <div style={{ transform: `translateX(${T}px) rotate(90deg)`, transformOrigin: "0 0" }}>
        <Lace len={CERT_H - 2 * (I + T)} color={purple} accent={gold} />
      </div>
    </div>
  );
  return (
    <Canvas scale={compact ? 0.68 : 1} background="#FCFBF8">
      <Texture color={purple} rosette={0.07} />
      <div style={{ position: "absolute", left: I + T, top: I }}><Lace len={CERT_W - 2 * (I + T)} color={purple} accent={gold} /></div>
      <div style={{ position: "absolute", left: I + T, top: CERT_H - I - T }}><Lace len={CERT_W - 2 * (I + T)} color={purple} accent={gold} /></div>
      {side(I)}
      {side(CERT_W - I - T)}
      {tile({ top: I, left: I })}
      {tile({ top: I, right: I })}
      {tile({ bottom: I, left: I })}
      {tile({ bottom: I, right: I })}
      <div style={{ position: "absolute", inset: 66, border: `1px solid ${gold}` }} />

      <div style={{ position: "absolute", inset: "82px 116px 80px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: purple }}>
        <LogoSlot logoUrl={data.school.logoUrl} />
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 12.5, letterSpacing: 5, color: gold, fontWeight: 700, marginTop: 8 }}>{data.school.name.toUpperCase()}</div>
        <h1 style={{ fontFamily: SERIF_MARCELLUS, fontWeight: 400, fontSize: fitName(title, 50, 24), letterSpacing: 2, margin: "16px 0 0" }}>{title}</h1>
        <div style={{ margin: "14px 0 4px" }}><LaurelRule color={gold} /></div>
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 15, marginTop: 8, opacity: 0.65 }}>{data.leadIn}</div>
        <div style={{ fontFamily: SERIF_MARCELLUS, fontSize: fitName(data.studentName, 62, 22), lineHeight: 1.15, margin: "10px 0 0" }}>{data.studentName}</div>
        <p style={{ fontFamily: SANS_MANROPE, fontSize: 16.5, lineHeight: 1.65, maxWidth: 620, margin: "16px 0 0", color: "#241a3a", opacity: 0.85 }}>{data.body}</p>
        <Footer
          left={<DateBlock date={data.issueDate} certificateId={data.certificateId} academicYear={data.academicYear} address={data.school.address} color={purple} font={SERIF_MARCELLUS} sans={SANS_MANROPE} line={gold} />}
          center={<SignatureBlock items={data.signatories} color={purple} line={purple} nameFont={SERIF_MARCELLUS} titleFont={SANS_MANROPE} />}
          right={<Seal uid={sealId} fill={purple} ring={gold} ink={gold} issuer={data.school.name} font={SERIF_MARCELLUS} />}
        />
      </div>
    </Canvas>
  );
}
