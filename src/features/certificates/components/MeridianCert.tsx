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
  SANS_DM,
  Seal,
  SERIF_DM,
  SignatureBlock,
  Texture,
} from "./CertificatePrimitives";

type Props = {
  data: CertificateData;
  compact?: boolean;
};

function chamfer(inset: number, c: number) {
  const a = inset, r = CERT_W - inset, b = CERT_H - inset;
  return `${a + c},${a} ${r - c},${a} ${r},${a + c} ${r},${b - c} ${r - c},${b} ${a + c},${b} ${a},${b - c} ${a},${a + c}`;
}

export function MeridianCert({ data, compact }: Props) {
  const ink = getCertificatePrimaryColor("CERT_GOLD_LAURELS");
  const brass = "#B38B4D";
  const sealId = React.useId().replace(/:/g, "");
  return (
    <Canvas scale={compact ? 0.68 : 1} background="#FFFFFF" backgroundClassName="cert-meridian-bg">
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, #EEF4F2 0%, #FFFFFF 55%)" }} />
      <Texture color={ink} rosette={0.07} />
      <svg width={CERT_W} height={CERT_H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <polygon points={chamfer(26, 34)} fill="none" stroke={ink} strokeWidth="5" />
        <polygon points={chamfer(40, 26)} fill="none" stroke={brass} strokeWidth="1.2" />
        <polygon points={chamfer(48, 22)} fill="none" stroke={ink} strokeWidth="0.6" opacity="0.5" />
        <g fill={brass}>
          <rect x={CERT_W / 2 - 5} y={35} width="10" height="10" transform={`rotate(45 ${CERT_W / 2} 40)`} />
          <rect x={CERT_W / 2 - 5} y={CERT_H - 45} width="10" height="10" transform={`rotate(45 ${CERT_W / 2} ${CERT_H - 40})`} />
        </g>
      </svg>

      <div style={{ position: "absolute", inset: "80px 110px 78px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: ink }}>
        <LogoSlot logoUrl={data.school.logoUrl} />
        <div style={{ fontFamily: SANS_DM, fontSize: 15, fontWeight: 600, letterSpacing: 1, marginTop: 8 }}>{data.school.name}</div>
        <h1 style={{ fontFamily: SERIF_DM, fontWeight: 400, fontSize: 56, margin: "26px 0 0", letterSpacing: -0.5 }}>{data.title || "Certificate of Completion"}</h1>
        <div style={{ fontFamily: SANS_DM, fontSize: 17, marginTop: 24, opacity: 0.7 }}>{data.leadIn}</div>
        <div style={{ fontFamily: SERIF_DM, fontSize: fitName(data.studentName, 66, 22), lineHeight: 1.1, margin: "8px 0 0", borderBottom: `1.5px solid ${brass}`, padding: "0 40px 12px" }}>{data.studentName}</div>
        <p style={{ fontFamily: SANS_DM, fontSize: 17.5, lineHeight: 1.6, maxWidth: 640, margin: "20px 0 0", opacity: 0.85 }}>{data.body}</p>

        <Footer
          left={<DateBlock date={data.issueDate} certificateId={data.certificateId} academicYear={data.academicYear} address={data.school.address} color={ink} font={SANS_DM} sans={SANS_DM} line={brass} />}
          center={<SignatureBlock items={data.signatories} color={ink} line={ink} nameFont={SERIF_DM} titleFont={SANS_DM} />}
          right={<Seal uid={sealId} fill={ink} ring={brass} ink={brass} issuer={data.school.name} font={SERIF_DM} />}
        />
      </div>
    </Canvas>
  );
}
