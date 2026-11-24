import React from "react";
import type { CertificateSignatory } from "../types";
import { getOfficialSignatureUrl } from "../../../lib/userSignature";

export const CERT_W = 1123;
export const CERT_H = 794;

const f = (v: string, fb: string) => `var(${v}, ${fb})`;
export const SERIF_CORM = f("--font-cormorant", "'Cormorant Garamond', Georgia, serif");
export const SANS_INTER = f("--font-inter", "Inter, system-ui, sans-serif");
export const SERIF_DM = f("--font-dm-serif", "'DM Serif Display', Georgia, serif");
export const SANS_DM = f("--font-dm-sans", "'DM Sans', system-ui, sans-serif");
export const SERIF_PLAY = f("--font-playfair", "'Playfair Display', Georgia, serif");
export const SANS_MANROPE = f("--font-manrope", "Manrope, system-ui, sans-serif");
export const SERIF_INSTR = f("--font-instrument", "'Instrument Serif', Georgia, serif");
export const SERIF_CINZEL = f("--font-cinzel", "Cinzel, 'Trajan Pro', Georgia, serif");
export const SERIF_BODONI = f("--font-bodoni", "'Bodoni Moda', 'Didot', Georgia, serif");
export const SERIF_ITALIANA = f("--font-italiana", "Italiana, Georgia, serif");
export const SANS_JOSEFIN = f("--font-josefin", "'Josefin Sans', system-ui, sans-serif");
export const SERIF_MARCELLUS = f("--font-marcellus", "Marcellus, Georgia, serif");

export const monogram = (s: string) =>
  s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const fitName = (name: string, base: number, maxChars: number) =>
  Math.round(base * Math.min(1, Math.max(0.42, maxChars / Math.max(name.length, 1))));

const grain = (rgb: 0 | 255) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${rgb / 255} 0 0 0 0 ${rgb / 255} 0 0 0 0 ${rgb / 255} 0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`
  )}")`;

export function Canvas({
  scale = 1,
  background,
  backgroundClassName,
  children,
}: {
  scale?: number;
  background: string;
  backgroundClassName?: string;
  children: React.ReactNode;
}) {
  const rootStyle = {
    width: CERT_W * scale,
    height: CERT_H * scale,
    overflow: "hidden",
  } as React.CSSProperties;
  return (
    <div className="cert-print" data-cert-canvas="true" data-page-size="a4-landscape" style={rootStyle}>
      <div
        className={`sheet cert-sheet${backgroundClassName ? ` ${backgroundClassName}` : ""}`}
        style={{
          width: CERT_W,
          height: CERT_H,
          position: "relative",
          background,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Texture({
  color,
  grainRgb = 0,
  grainOpacity = 0.06,
  rosette = 0.08,
  rx = 230,
  ry = 78,
}: {
  color: string;
  grainRgb?: 0 | 255;
  grainOpacity?: number;
  rosette?: number;
  rx?: number;
  ry?: number;
}) {
  const n = 36;
  return (
    <>
      <svg width={CERT_W} height={CERT_H} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: rosette }} aria-hidden="true">
        <g transform={`translate(${CERT_W / 2} ${CERT_H / 2})`} fill="none" stroke={color} strokeWidth="0.7">
          {Array.from({ length: n }, (_, i) => (
            <ellipse key={i} rx={rx} ry={ry} transform={`rotate(${(i * 180) / n})`} />
          ))}
          <circle r={rx + 14} />
          <circle r={rx + 18} strokeWidth="0.4" />
        </g>
      </svg>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: grain(grainRgb), opacity: grainOpacity }} />
    </>
  );
}

export function LogoSlot({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <div style={{ height: 52, maxWidth: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          style={{ height: "100%", width: "auto", objectFit: "contain" }}
        />
      ) : null}
    </div>
  );
}

export function SignatureBlock({
  items = [],
  color,
  line,
  nameFont,
  titleFont,
}: {
  items?: CertificateSignatory[];
  color: string;
  line: string;
  nameFont: string;
  titleFont: string;
}) {
  return (
    <div style={{ display: "flex", gap: 40, justifyContent: "center" }}>
      {items.map((s, i) => {
        const url = getOfficialSignatureUrl({ signatureUrl: s.signatureUrl });
        return (
          <div key={`${s.name}-${i}`} style={{ width: 190, textAlign: "center" }}>
            <div style={{ height: 46, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              {url ? <img src={url} alt="" style={{ maxHeight: 44, maxWidth: 170, objectFit: "contain" }} /> : null}
            </div>
            <div style={{ borderTop: `1px solid ${line}`, margin: "2px 0 8px" }} />
            <div style={{ fontFamily: nameFont, fontSize: 16.5, color, fontWeight: 600 }}>{s.name || "\u00a0"}</div>
            <div style={{ fontFamily: titleFont, fontSize: 12.5, color, opacity: 0.7, marginTop: 2 }}>{s.title}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Seal({
  uid,
  size = 100,
  fill,
  ring,
  ink,
  issuer,
  font,
}: {
  uid: string;
  size?: number;
  fill: string;
  ring: string;
  ink: string;
  issuer: string;
  font: string;
}) {
  const pts: string[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (Math.PI * i) / 36;
    const r = i % 2 === 0 ? 48 : 45;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  const rim = `${issuer.toUpperCase().slice(0, 28)} • OFFICIAL SEAL • `;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".4" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
        <path id={`p-${uid}`} d="M50 50 m-31 0 a31 31 0 1 1 62 0 a31 31 0 1 1 -62 0" />
      </defs>
      <polygon points={pts.join(" ")} fill={fill} />
      <polygon points={pts.join(" ")} fill={`url(#g-${uid})`} />
      <circle cx="50" cy="50" r="41" fill="none" stroke={ring} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="25" fill="none" stroke={ring} strokeWidth="0.8" />
      <text style={{ fontFamily: SANS_INTER, fontWeight: 600 }} fontSize="5.2" fill={ink}>
        <textPath href={`#p-${uid}`} textLength="186" lengthAdjust="spacing">{rim}</textPath>
      </text>
      <text x="50" y="58" textAnchor="middle" fontSize="21" fill={ink} style={{ fontFamily: font }}>{monogram(issuer)}</text>
    </svg>
  );
}

export function Divider({ color, w = 220 }: { color: string; w?: number }) {
  return (
    <svg width={w} height="14" viewBox="0 0 220 14" aria-hidden="true">
      <path d="M0 7H92M128 7H220" stroke={color} strokeWidth="1" />
      <path d="M110 1l6 6-6 6-6-6z" fill={color} />
      <circle cx="98" cy="7" r="1.6" fill={color} />
      <circle cx="122" cy="7" r="1.6" fill={color} />
    </svg>
  );
}

export const Meta = ({ children, color, font }: { children: React.ReactNode; color: string; font: string }) => (
  <div style={{ fontFamily: font, fontSize: 11.5, letterSpacing: 0.6, color, opacity: 0.68 }}>{children}</div>
);

export function DateBlock({
  date,
  certificateId,
  academicYear,
  address,
  color,
  font,
  sans,
  line,
}: {
  date: string;
  certificateId?: string | null;
  academicYear?: string | null;
  address?: string | null;
  color: string;
  font: string;
  sans: string;
  line: string;
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-end", textAlign: "left" }}>
      <div style={{ maxWidth: 300 }}>
        <div style={{ fontFamily: font, fontSize: 17, fontWeight: 600, color }}>{date}</div>
        <Meta color={color} font={sans}>Date of issue</Meta>
        {academicYear ? <Meta color={color} font={sans}>{academicYear}</Meta> : null}
        {address ? (
          <div style={{ fontFamily: sans, fontSize: 10, color, opacity: 0.6, marginTop: 4, lineHeight: 1.3 }}>
            {address}
          </div>
        ) : null}
        {certificateId ? (
          <div style={{ fontFamily: sans, fontSize: 10, color, opacity: 0.75, marginTop: 4, borderTop: `1px solid ${line}`, paddingTop: 4 }}>
            No. {certificateId}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Footer({ left, center, right }: { left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ marginTop: "auto", width: "100%", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "end" }}>
      <div style={{ justifySelf: "start" }}>{left}</div>
      <div>{center}</div>
      <div style={{ justifySelf: "end" }}>{right}</div>
    </div>
  );
}

export function Laurel({ color, flip = false, w = 96, h = 40 }: { color: string; flip?: boolean; w?: number; h?: number }) {
  const p0 = [2, 30];
  const p1 = [50, 34];
  const p2 = [94, 8];
  const point = (t: number) => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
  ];
  const ts = [0.12, 0.26, 0.4, 0.54, 0.68, 0.82, 0.95];
  return (
    <svg width={w} height={h} viewBox="0 0 96 40" style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden="true">
      <path d={`M${p0} Q${p1} ${p2}`} fill="none" stroke={color} strokeWidth="1.2" />
      {ts.flatMap((t) => {
        const [x, y] = point(t);
        const [x2, y2] = point(Math.min(t + 0.02, 1));
        const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
        return [-38, 38].map((offset) => (
          <ellipse
            key={`${t}-${offset}`}
            cx={x}
            cy={y}
            rx="7"
            ry="2.7"
            fill={color}
            transform={`rotate(${angle + offset} ${x} ${y}) translate(6 0)`}
          />
        ));
      })}
    </svg>
  );
}

export function LaurelRule({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Laurel color={color} />
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 0l7 7-7 7-7-7z" fill={color} /></svg>
      <Laurel color={color} flip />
    </div>
  );
}
