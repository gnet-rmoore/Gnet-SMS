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
  LogoSlot,
  SANS_JOSEFIN,
  Seal,
  SERIF_ITALIANA,
  SignatureBlock,
  Texture,
} from "./CertificatePrimitives";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

function stepped(a0: number, s: number) {
  const a = a0;
  const r = CERT_W - a0;
  const b = CERT_H - a0;
  return [
    [a + 2 * s, a], [r - 2 * s, a], [r - 2 * s, a + s], [r - s, a + s], [r - s, a + 2 * s], [r, a + 2 * s],
    [r, b - 2 * s], [r - s, b - 2 * s], [r - s, b - s], [r - 2 * s, b - s], [r - 2 * s, b],
    [a + 2 * s, b], [a + 2 * s, b - s], [a + s, b - s], [a + s, b - 2 * s], [a, b - 2 * s],
    [a, a + 2 * s], [a + s, a + 2 * s], [a + s, a + s], [a + 2 * s, a + s],
  ]
    .map((q) => q.join(","))
    .join(" ");
}

export function DecoCert({ data, compact }: Props) {
  const base = getCertificatePrimaryColor("CERT_DECO");
  const gold = "#CDAA5E";
  const paper = "#EFE8D6";
  const sealId = React.useId().replace(/:/g, "");
  const title = data.title || "Certificate of Excellence";
  const rays = Array.from({ length: 21 }, (_, i) => 15 + i * 7.5);
  return (
    <Canvas scale={compact ? 0.68 : 1} background={`radial-gradient(ellipse at 50% 35%, color-mix(in srgb, ${base} 80%, white) 0%, ${base} 80%)`} backgroundClassName="cert-deco-bg">
      <Texture color={gold} grainRgb={255} grainOpacity={0.06} rosette={0.1} />
      <svg width={CERT_W} height={CERT_H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <polygon points={stepped(26, 12)} fill="none" stroke={gold} strokeWidth="2.5" />
        <polygon points={stepped(40, 9)} fill="none" stroke={gold} strokeWidth="1" opacity="0.8" />
        <polygon points={stepped(50, 6)} fill="none" stroke={gold} strokeWidth="0.6" opacity="0.5" />
        <g transform={`translate(${CERT_W / 2} 50)`} stroke={gold} fill="none">
          {rays.map((deg) => {
            const t = (deg * Math.PI) / 180;
            return <line key={deg} x1={90 * Math.cos(t)} y1={90 * Math.sin(t)} x2={138 * Math.cos(t)} y2={138 * Math.sin(t)} strokeWidth="1" opacity="0.5" />;
          })}
          {[90, 97, 138].map((r) => <path key={r} d={`M${-r} 0A${r} ${r} 0 0 0 ${r} 0`} strokeWidth={r === 138 ? 0.8 : 1.2} opacity="0.65" />)}
        </g>
        {[CERT_H / 2 - 22, CERT_H / 2, CERT_H / 2 + 22].map((y, i) => (
          <g key={y} fill={gold} opacity={i === 1 ? 1 : 0.6}>
            <rect x="36" y={y - 5} width="10" height="10" transform={`rotate(45 41 ${y})`} />
            <rect x={CERT_W - 46} y={y - 5} width="10" height="10" transform={`rotate(45 ${CERT_W - 41} ${y})`} />
          </g>
        ))}
      </svg>

      <div style={{ position: "absolute", inset: "70px 118px 72px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: paper }}>
        <LogoSlot logoUrl={data.school.logoUrl} />
        <div style={{ fontFamily: SANS_JOSEFIN, fontSize: 13, letterSpacing: 7, color: gold, marginTop: 70 }}>{data.school.name.toUpperCase()}</div>
        <h1 style={{ fontFamily: SERIF_ITALIANA, fontWeight: 400, fontSize: fitName(title, 56, 24), letterSpacing: 3, margin: "14px 0 0", color: gold }}>{title.toUpperCase()}</h1>
        <div style={{ fontFamily: SANS_JOSEFIN, fontWeight: 300, fontSize: 15, letterSpacing: 4, marginTop: 16, opacity: 0.7 }}>{data.leadIn.toUpperCase()}</div>
        <div style={{ fontFamily: SERIF_ITALIANA, fontSize: fitName(data.studentName, 70, 24), lineHeight: 1.15, margin: "8px 0 0" }}>{data.studentName}</div>
        <div style={{ width: 160, height: 1, background: gold, margin: "10px 0 0", opacity: 0.8 }} />
        <p style={{ fontFamily: SANS_JOSEFIN, fontWeight: 300, fontSize: 16.5, lineHeight: 1.7, maxWidth: 640, margin: "16px 0 0", opacity: 0.88 }}>{data.body}</p>
        <Footer
          left={<DateBlock date={data.issueDate} certificateId={data.certificateId} academicYear={data.academicYear} address={data.school.address} color={paper} font={SANS_JOSEFIN} sans={SANS_JOSEFIN} line={gold} />}
          center={<SignatureBlock items={data.signatories} color={paper} line={gold} nameFont={SERIF_ITALIANA} titleFont={SANS_JOSEFIN} />}
          right={<Seal uid={sealId} fill={gold} ring={base} ink={base} issuer={data.school.name} font={SERIF_ITALIANA} />}
        />
      </div>
    </Canvas>
  );
}
