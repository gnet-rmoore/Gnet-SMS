import React from "react";
import type { CertificateData } from "../types";
import { resolveCertificateBrand } from "../registry";
import {
  Canvas,
  DateBlock,
  Divider,
  fitName,
  Footer,
  LogoSlot,
  SANS_MANROPE,
  SERIF_PLAY,
  Seal,
  SignatureBlock,
  Texture,
} from "./CertificatePrimitives";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

export function NoirCert({ data, compact }: Props) {
  const base = resolveCertificateBrand("CERT_RED_SEAL", data.brandColor);
  const gold = "#C9A96B";
  const paper = "#ECE6D8";
  const sealId = React.useId().replace(/:/g, "");
  const goldText: React.CSSProperties = {
    background: `linear-gradient(100deg, color-mix(in srgb, ${gold} 70%, black) 0%, color-mix(in srgb, ${gold} 55%, white) 38%, ${gold} 55%, color-mix(in srgb, ${gold} 50%, white) 78%, color-mix(in srgb, ${gold} 75%, black) 100%)`,
    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
  };
  const bracket = (pos: React.CSSProperties, b: React.CSSProperties): React.CSSProperties => ({ position: "absolute", width: 70, height: 70, borderColor: gold, borderStyle: "solid", borderWidth: 0, ...pos, ...b });
  return (
    <Canvas scale={compact ? 0.68 : 1} background={`radial-gradient(ellipse at 50% 40%, color-mix(in srgb, ${base} 84%, white) 0%, ${base} 75%)`} brand={base} backgroundClassName="cert-noir-bg">
      <Texture color={gold} grainRgb={255} grainOpacity={0.07} rosette={0.12} />
      <div style={{ position: "absolute", inset: 24, border: `1px solid ${gold}`, opacity: 0.55 }} />
      <div style={{ position: "absolute", inset: 34, border: `1px solid ${gold}`, opacity: 0.3 }} />
      <div style={bracket({ top: 24, left: 24 }, { borderTopWidth: 4, borderLeftWidth: 4 })} />
      <div style={bracket({ top: 24, right: 24 }, { borderTopWidth: 4, borderRightWidth: 4 })} />
      <div style={bracket({ bottom: 24, left: 24 }, { borderBottomWidth: 4, borderLeftWidth: 4 })} />
      <div style={bracket({ bottom: 24, right: 24 }, { borderBottomWidth: 4, borderRightWidth: 4 })} />

      <div style={{ position: "absolute", inset: "78px 120px 72px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: paper }}>
        <LogoSlot logoUrl={data.school.logoUrl} />
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 13, letterSpacing: 6, color: gold, marginTop: 8 }}>{data.school.name.toUpperCase()}</div>
        <h1 className="cert-noir-title" style={{ fontFamily: SERIF_PLAY, fontWeight: 400, fontSize: 52, margin: "22px 0 0", ...goldText }}>{data.title}</h1>
        <div style={{ margin: "16px 0 0" }}><Divider color={gold} w={180} /></div>
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 15, marginTop: 20, opacity: 0.65 }}>{data.leadIn}</div>
        <div style={{ fontFamily: SERIF_PLAY, fontStyle: "italic", fontSize: fitName(data.studentName, 68, 20), lineHeight: 1.15, margin: "10px 0 0" }}>{data.studentName}</div>
        <p style={{ fontFamily: SANS_MANROPE, fontSize: 16.5, lineHeight: 1.7, maxWidth: 640, margin: "18px 0 0", opacity: 0.8 }}>{data.body}</p>

        <Footer
          left={<DateBlock date={data.issueDate} certificateId={data.certificateId} academicYear={data.academicYear} address={data.school.address} color={paper} font={SANS_MANROPE} sans={SANS_MANROPE} line={gold} />}
          center={<SignatureBlock items={data.signatories} color={paper} line={gold} nameFont={SERIF_PLAY} titleFont={SANS_MANROPE} />}
          right={<Seal uid={sealId} fill={gold} ring={base} ink={base} issuer={data.school.name} font={SERIF_PLAY} />}
        />
      </div>
    </Canvas>
  );
}
