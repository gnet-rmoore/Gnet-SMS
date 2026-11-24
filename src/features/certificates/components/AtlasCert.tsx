import React from "react";
import type { CertificateData } from "../types";
import { resolveCertificateBrand } from "../registry";
import {
  Canvas,
  DateBlock,
  fitName,
  Footer,
  LogoSlot,
  SANS_MANROPE,
  Seal,
  SERIF_INSTR,
  SignatureBlock,
  Texture,
} from "./CertificatePrimitives";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

export function AtlasCert({ data, compact }: Props) {
  const indigo = resolveCertificateBrand("CERT_HERITAGE_TAN", data.brandColor);
  const coral = "#C8553D";
  const ink = "#171A2E";
  const sealId = React.useId().replace(/:/g, "");
  const ticks = (side: "top" | "bottom"): React.CSSProperties => ({
    position: "absolute", left: 58, right: 58, [side]: 40, height: 7,
    backgroundImage: `repeating-linear-gradient(90deg, ${indigo} 0 1px, transparent 1px 12px)`, opacity: 0.55,
  });
  return (
    <Canvas scale={compact ? 0.68 : 1} background="#FDFDFB" brand={indigo}>
      <Texture color={indigo} rosette={0.06} rx={250} ry={60} />
      <div style={{ position: "absolute", inset: 0, border: `14px solid ${indigo}`, boxSizing: "border-box" }} />
      <div style={{ position: "absolute", inset: 30, border: `1px solid ${indigo}` }} />
      <div style={ticks("top")} />
      <div style={ticks("bottom")} />
      <div style={{ position: "absolute", top: 30, left: 30, width: 14, height: 14, background: coral }} />
      <div style={{ position: "absolute", bottom: 30, right: 30, width: 14, height: 14, background: coral }} />

      <div style={{ position: "absolute", inset: "76px 105px 78px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: ink }}>
        <LogoSlot logoUrl={data.school.logoUrl} />
        <div style={{ fontFamily: SANS_MANROPE, fontWeight: 700, fontSize: 18, marginTop: 8 }}>{data.school.name}</div>
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 18, fontWeight: 600, color: coral, marginTop: 26 }}>{data.title || "Certificate of Achievement"}</div>
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 16, marginTop: 28, opacity: 0.65 }}>{data.leadIn}</div>
        <div style={{ fontFamily: SERIF_INSTR, fontSize: fitName(data.studentName, 90, 22), lineHeight: 1.05, margin: "8px 0 0", color: indigo }}>{data.studentName}</div>
        <p style={{ fontFamily: SANS_MANROPE, fontSize: 17.5, lineHeight: 1.65, maxWidth: 640, margin: "20px 0 0", opacity: 0.85 }}>{data.body}</p>

        <Footer
          left={<DateBlock date={data.issueDate} certificateId={data.certificateId} academicYear={data.academicYear} address={data.school.address} color={ink} font={SANS_MANROPE} sans={SANS_MANROPE} line={indigo} />}
          center={<SignatureBlock items={data.signatories} color={ink} line={ink} nameFont={SERIF_INSTR} titleFont={SANS_MANROPE} />}
          right={<Seal uid={sealId} fill={indigo} ring="#FDFDFB" ink="#FDFDFB" issuer={data.school.name} font={SERIF_INSTR} />}
        />
      </div>
    </Canvas>
  );
}
