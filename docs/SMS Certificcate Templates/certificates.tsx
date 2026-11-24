import type { CSSProperties, ReactNode } from "react";

/* =====================================================================
 * TODO (AI AGENT) — SCHOOL LOGO, SIGNATURES, QR & BRAND COLOURS
 * Multi-tenant school management system: nothing tenant-specific may be
 * hard-coded in this file. Wire the following to the back-end.
 *
 * 1. LOGO (`logo` prop). Each school (tenant) has its own logo.
 *    - Resolve the tenant from the session/route (e.g. schoolId), then use the
 *      EXISTING branding/school endpoint in this codebase. Don't invent a new
 *      endpoint if one already exists.
 *    - Fetch on the server (RSC or route handler) and pass:
 *        logo={<img src={school.logoUrl} alt={`${school.name} logo`}
 *               style={{ height: "100%", width: "auto", objectFit: "contain" }} />}
 *    - Use a plain <img> (not next/image) so screen, print and PDF match.
 *      The slot is 52px tall, max ~220px wide. The space is always reserved,
 *      even when `logo` is undefined (tenant has no logo): render nothing.
 *    - PDF/print: the logo must be fully loaded before capture. Prefer a
 *      base64 data URI fetched server-side; otherwise await image decode.
 *      Signed URLs must outlive rendering; cross-origin images need CORS.
 *    - Template "noir" has a dark background (see `darkLogoTemplates`). Use the
 *      tenant's light/transparent logo variant there, or place the logo on a
 *      light rounded chip if only one variant exists.
 *    - Remove `showLogoPlaceholder` outside dev/preview.
 * 2. BRAND COLOURS (`primary`, `accent`). If the tenant has brand colours,
 *    pass them (hex). Otherwise omit them and the template defaults apply.
 *    Check contrast of `primary` on white (or on dark for noir).
 * 3. SIGNATURES. Per signatory, pass `signatureImage` (transparent PNG/SVG,
 *    ~44px tall, from tenant storage) if available. Otherwise `signatureText`
 *    renders in a script font; with neither, the signing space stays blank.
 * 4. QR (`qr`). Pass <QRCodeSVG value={verifyUrl} size={52} /> from
 *    `qrcode.react`, with a tenant-aware, publicly reachable verification URL
 *    that looks up `certificateId`. Show the same URL in `verifyUrl`.
 * 5. COPY. Use "Educator" and "Learner" in any generated wording.
 * ===================================================================== */

export type Signatory = {
  name: string;
  title: string;
  signatureImage?: string; // URL or data URI (transparent PNG/SVG)
  signatureText?: string; // fallback: rendered in a handwriting font
};

export type CertificateProps = {
  recipient: string;
  title?: string;
  description: string;
  issuer: string; // school name
  date: string; // pre-formatted
  certificateId?: string;
  verifyUrl?: string; // small print under the footer
  signatories?: Signatory[]; // 1–2 recommended
  logo?: ReactNode; // see TODO 1
  showLogoPlaceholder?: boolean; // dev/preview only
  qr?: ReactNode; // ~52px square, see TODO 4
  primary?: string; // brand colour override (hex)
  accent?: string; // secondary/metallic accent override (hex)
  scale?: number; // 1 = 1123×794px (A4 landscape @ 96dpi)
};

export const CERT_W = 1123;
export const CERT_H = 794;
/** Templates with dark backgrounds: supply a light logo variant. */
export const darkLogoTemplates = ["noir"] as const;

/** Add once (e.g. in layout) for crisp A4 landscape printing. */
export const certificatePrintCss = `
@page { size: A4 landscape; margin: 0; }
@media print {
  body * { visibility: hidden; }
  .cert-print, .cert-print * { visibility: visible; }
  .cert-print { position: fixed; inset: 0; transform: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

const f = (v: string, fb: string) => `var(${v}, ${fb})`;
const SERIF_CORM = f("--font-cormorant", "'Cormorant Garamond', Georgia, serif");
const SANS_INTER = f("--font-inter", "Inter, system-ui, sans-serif");
const SERIF_DM = f("--font-dm-serif", "'DM Serif Display', Georgia, serif");
const SANS_DM = f("--font-dm-sans", "'DM Sans', system-ui, sans-serif");
const SERIF_PLAY = f("--font-playfair", "'Playfair Display', Georgia, serif");
const SANS_MANROPE = f("--font-manrope", "Manrope, system-ui, sans-serif");
const SERIF_INSTR = f("--font-instrument", "'Instrument Serif', Georgia, serif");
const SCRIPT = f("--font-signature", "Allura, 'Brush Script MT', cursive");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const monogram = (s: string) =>
  s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Shrinks long names so they stay on one line. */
const fitName = (name: string, base: number, maxChars: number) =>
  Math.round(base * Math.min(1, Math.max(0.55, maxChars / Math.max(name.length, 1))));

const grain = (rgb: 0 | 255) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${rgb / 255} 0 0 0 0 ${rgb / 255} 0 0 0 0 ${rgb / 255} 0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`
  )}")`;

/* ------------------------------------------------------------------ */
/*  Shared building blocks                                             */
/* ------------------------------------------------------------------ */

function Canvas({ scale = 1, background, children }: { scale?: number; background: string; children: ReactNode }) {
  return (
    <div className="cert-print" style={{ width: CERT_W * scale, height: CERT_H * scale, overflow: "hidden" }}>
      <div style={{ width: CERT_W, height: CERT_H, position: "relative", background, transform: `scale(${scale})`, transformOrigin: "top left", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

/** Paper grain + guilloche rosette sitting under the content. */
function Texture({ color, grainRgb = 0, grainOpacity = 0.06, rosette = 0.08, rx = 230, ry = 78 }: { color: string; grainRgb?: 0 | 255; grainOpacity?: number; rosette?: number; rx?: number; ry?: number }) {
  const n = 36;
  return (
    <>
      <svg width={CERT_W} height={CERT_H} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: rosette }} aria-hidden>
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

function LogoSlot({ logo, show, color, height = 52 }: { logo?: ReactNode; show?: boolean; color: string; height?: number }) {
  return (
    <div style={{ height, maxWidth: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {logo ??
        (show ? (
          <div style={{ height: "100%", width: 150, boxSizing: "border-box", border: `1.5px dashed ${color}`, opacity: 0.5, color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", fontSize: 12 }}>
            School logo
          </div>
        ) : null)}
    </div>
  );
}

function QrSlot({ qr, line }: { qr?: ReactNode; line: string }) {
  if (!qr) return null;
  return <div style={{ width: 60, height: 60, padding: 3, boxSizing: "border-box", background: "#fff", border: `1px solid ${line}`, display: "flex", flexShrink: 0 }}>{qr}</div>;
}

function Signatures({ items = [], color, line, nameFont, titleFont }: { items?: Signatory[]; color: string; line: string; nameFont: string; titleFont: string }) {
  return (
    <div style={{ display: "flex", gap: 40, justifyContent: "center" }}>
      {items.map((s) => (
        <div key={s.name} style={{ width: 190, textAlign: "center" }}>
          <div style={{ height: 46, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            {s.signatureImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.signatureImage} alt="" style={{ maxHeight: 44, maxWidth: 170, objectFit: "contain" }} />
            ) : s.signatureText ? (
              <span style={{ fontFamily: SCRIPT, fontSize: 36, lineHeight: 1, color }}>{s.signatureText}</span>
            ) : null}
          </div>
          <div style={{ borderTop: `1px solid ${line}`, margin: "2px 0 8px" }} />
          <div style={{ fontFamily: nameFont, fontSize: 16.5, color, fontWeight: 600 }}>{s.name}</div>
          <div style={{ fontFamily: titleFont, fontSize: 12.5, color, opacity: 0.7, marginTop: 2 }}>{s.title}</div>
        </div>
      ))}
    </div>
  );
}

/** Foil-style seal: scalloped edge, issuer text around the rim, monogram in the centre. */
function Seal({ uid, size = 100, fill, ring, ink, issuer, font }: { uid: string; size?: number; fill: string; ring: string; ink: string; issuer: string; font: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (Math.PI * i) / 36;
    const r = i % 2 === 0 ? 48 : 45;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  const rim = `${issuer.toUpperCase().slice(0, 28)} • OFFICIAL SEAL • `;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
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

function Divider({ color, w = 220 }: { color: string; w?: number }) {
  return (
    <svg width={w} height="14" viewBox="0 0 220 14" aria-hidden>
      <path d="M0 7H92M128 7H220" stroke={color} strokeWidth="1" />
      <path d="M110 1l6 6-6 6-6-6z" fill={color} />
      <circle cx="98" cy="7" r="1.6" fill={color} />
      <circle cx="122" cy="7" r="1.6" fill={color} />
    </svg>
  );
}

const Meta = ({ children, color, font }: { children: ReactNode; color: string; font: string }) => (
  <div style={{ fontFamily: font, fontSize: 11.5, letterSpacing: 0.6, color, opacity: 0.68 }}>{children}</div>
);

function DateBlock({ p, color, font, sans, line }: { p: CertificateProps; color: string; font: string; sans: string; line: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-end", textAlign: "left" }}>
      <QrSlot qr={p.qr} line={line} />
      <div>
        <div style={{ fontFamily: font, fontSize: 17, fontWeight: 600, color }}>{p.date}</div>
        <Meta color={color} font={sans}>Date of issue</Meta>
        {p.certificateId && <Meta color={color} font={sans}>No. {p.certificateId}</Meta>}
      </div>
    </div>
  );
}

function Footer({ left, center, right }: { left: ReactNode; center: ReactNode; right: ReactNode }) {
  return (
    <div style={{ marginTop: "auto", width: "100%", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "end" }}>
      <div style={{ justifySelf: "start" }}>{left}</div>
      <div>{center}</div>
      <div style={{ justifySelf: "end" }}>{right}</div>
    </div>
  );
}

const Verify = ({ url, color, font }: { url?: string; color: string; font: string }) =>
  url ? <div style={{ marginTop: 14 }}><Meta color={color} font={font}>Verify at {url}</Meta></div> : null;

/* ------------------------------------------------------------------ */
/*  1. HERITAGE                                                        */
/* ------------------------------------------------------------------ */

function Corner({ rotate, color, accent }: { rotate: number; color: string; accent: string }) {
  const pos: CSSProperties = { position: "absolute", transform: `rotate(${rotate}deg)` };
  if (rotate === 0) Object.assign(pos, { top: 24, left: 24 });
  if (rotate === 90) Object.assign(pos, { top: 24, right: 24 });
  if (rotate === 180) Object.assign(pos, { bottom: 24, right: 24 });
  if (rotate === 270) Object.assign(pos, { bottom: 24, left: 24 });
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" style={pos} aria-hidden>
      <path d="M2 82V2h80" fill="none" stroke={color} strokeWidth="3" />
      <path d="M14 70V14h56" fill="none" stroke={accent} strokeWidth="1" />
      <path d="M14 14 q22 2 30 26 q-22 -4 -30 -26z" fill={accent} opacity="0.9" />
      <rect x="-3" y="-3" width="10" height="10" transform="translate(2 2) rotate(45 2 2)" fill={color} />
      <circle cx="70" cy="14" r="2.4" fill={accent} />
      <circle cx="14" cy="70" r="2.4" fill={accent} />
    </svg>
  );
}

export function CertificateHeritage(p: CertificateProps) {
  const navy = p.primary ?? "#14264A";
  const gold = p.accent ?? "#B08D3C";
  const paper = "#FBFAF6";
  return (
    <Canvas scale={p.scale} background={paper}>
      <Texture color={gold} rosette={0.1} />
      <div style={{ position: "absolute", inset: 22, border: `3px solid ${navy}` }} />
      <div style={{ position: "absolute", inset: 32, border: `1px solid ${gold}` }} />
      <div style={{ position: "absolute", inset: 38, border: `1px solid ${navy}`, opacity: 0.25 }} />
      {[0, 90, 180, 270].map((r) => <Corner key={r} rotate={r} color={navy} accent={gold} />)}

      <div style={{ position: "absolute", inset: "78px 120px 70px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: navy }}>
        <LogoSlot logo={p.logo} show={p.showLogoPlaceholder} color={navy} />
        <div style={{ fontFamily: SANS_INTER, fontSize: 13, letterSpacing: 5, color: gold, fontWeight: 600, marginTop: 10 }}>{p.issuer.toUpperCase()}</div>
        <h1 style={{ fontFamily: SERIF_CORM, fontSize: 62, fontWeight: 500, margin: "16px 0 0", letterSpacing: 1 }}>{p.title ?? "Certificate of Achievement"}</h1>
        <div style={{ margin: "16px 0 14px" }}><Divider color={gold} /></div>
        <div style={{ fontFamily: SERIF_CORM, fontStyle: "italic", fontSize: 22, opacity: 0.75 }}>This certificate is proudly presented to</div>
        <div style={{ fontFamily: SERIF_CORM, fontSize: fitName(p.recipient, 76, 24), fontWeight: 500, lineHeight: 1.1, margin: "12px 0 8px" }}>{p.recipient}</div>
        <p style={{ fontFamily: SERIF_CORM, fontSize: 21, lineHeight: 1.5, maxWidth: 680, margin: "6px 0 0", opacity: 0.85 }}>{p.description}</p>

        <Footer
          left={<DateBlock p={p} color={navy} font={SERIF_CORM} sans={SANS_INTER} line={gold} />}
          center={<Signatures items={p.signatories} color={navy} line={navy} nameFont={SERIF_CORM} titleFont={SANS_INTER} />}
          right={<Seal uid="heritage" fill={gold} ring={paper} ink={paper} issuer={p.issuer} font={SERIF_CORM} />}
        />
        <Verify url={p.verifyUrl} color={navy} font={SANS_INTER} />
      </div>
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/*  2. MERIDIAN                                                        */
/* ------------------------------------------------------------------ */

function chamfer(inset: number, c: number) {
  const a = inset, r = CERT_W - inset, b = CERT_H - inset;
  return `${a + c},${a} ${r - c},${a} ${r},${a + c} ${r},${b - c} ${r - c},${b} ${a + c},${b} ${a},${b - c} ${a},${a + c}`;
}

export function CertificateMeridian(p: CertificateProps) {
  const ink = p.primary ?? "#0E3B36";
  const brass = p.accent ?? "#B38B4D";
  return (
    <Canvas scale={p.scale} background="#FFFFFF">
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, #EEF4F2 0%, #FFFFFF 55%)" }} />
      <Texture color={ink} rosette={0.07} />
      <svg width={CERT_W} height={CERT_H} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <polygon points={chamfer(26, 34)} fill="none" stroke={ink} strokeWidth="5" />
        <polygon points={chamfer(40, 26)} fill="none" stroke={brass} strokeWidth="1.2" />
        <polygon points={chamfer(48, 22)} fill="none" stroke={ink} strokeWidth="0.6" opacity="0.5" />
        <g fill={brass}>
          <rect x={CERT_W / 2 - 5} y={35} width="10" height="10" transform={`rotate(45 ${CERT_W / 2} 40)`} />
          <rect x={CERT_W / 2 - 5} y={CERT_H - 45} width="10" height="10" transform={`rotate(45 ${CERT_W / 2} ${CERT_H - 40})`} />
        </g>
      </svg>

      <div style={{ position: "absolute", inset: "80px 110px 78px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: ink }}>
        <LogoSlot logo={p.logo} show={p.showLogoPlaceholder} color={ink} />
        <div style={{ fontFamily: SANS_DM, fontSize: 15, fontWeight: 600, letterSpacing: 1, marginTop: 8 }}>{p.issuer}</div>
        <h1 style={{ fontFamily: SERIF_DM, fontWeight: 400, fontSize: 56, margin: "26px 0 0", letterSpacing: -0.5 }}>{p.title ?? "Certificate of Completion"}</h1>
        <div style={{ fontFamily: SANS_DM, fontSize: 17, marginTop: 24, opacity: 0.7 }}>Awarded to</div>
        <div style={{ fontFamily: SERIF_DM, fontSize: fitName(p.recipient, 66, 22), lineHeight: 1.1, margin: "8px 0 0", borderBottom: `1.5px solid ${brass}`, padding: "0 40px 12px" }}>{p.recipient}</div>
        <p style={{ fontFamily: SANS_DM, fontSize: 17.5, lineHeight: 1.6, maxWidth: 640, margin: "20px 0 0", opacity: 0.85 }}>{p.description}</p>

        <Footer
          left={<DateBlock p={p} color={ink} font={SANS_DM} sans={SANS_DM} line={brass} />}
          center={<Signatures items={p.signatories} color={ink} line={ink} nameFont={SERIF_DM} titleFont={SANS_DM} />}
          right={<Seal uid="meridian" fill={ink} ring={brass} ink={brass} issuer={p.issuer} font={SERIF_DM} />}
        />
        <Verify url={p.verifyUrl} color={ink} font={SANS_DM} />
      </div>
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/*  3. NOIR                                                            */
/* ------------------------------------------------------------------ */

export function CertificateNoir(p: CertificateProps) {
  const base = p.primary ?? "#14161A";
  const gold = p.accent ?? "#C9A96B";
  const paper = "#ECE6D8";
  const goldText: CSSProperties = {
    background: `linear-gradient(100deg, color-mix(in srgb, ${gold} 70%, black) 0%, color-mix(in srgb, ${gold} 55%, white) 38%, ${gold} 55%, color-mix(in srgb, ${gold} 50%, white) 78%, color-mix(in srgb, ${gold} 75%, black) 100%)`,
    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
  };
  const bracket = (pos: CSSProperties, b: CSSProperties): CSSProperties => ({ position: "absolute", width: 70, height: 70, borderColor: gold, borderStyle: "solid", borderWidth: 0, ...pos, ...b });
  return (
    <Canvas scale={p.scale} background={`radial-gradient(ellipse at 50% 40%, color-mix(in srgb, ${base} 84%, white) 0%, ${base} 75%)`}>
      <Texture color={gold} grainRgb={255} grainOpacity={0.07} rosette={0.12} />
      <div style={{ position: "absolute", inset: 24, border: `1px solid ${gold}`, opacity: 0.55 }} />
      <div style={{ position: "absolute", inset: 34, border: `1px solid ${gold}`, opacity: 0.3 }} />
      <div style={bracket({ top: 24, left: 24 }, { borderTopWidth: 4, borderLeftWidth: 4 })} />
      <div style={bracket({ top: 24, right: 24 }, { borderTopWidth: 4, borderRightWidth: 4 })} />
      <div style={bracket({ bottom: 24, left: 24 }, { borderBottomWidth: 4, borderLeftWidth: 4 })} />
      <div style={bracket({ bottom: 24, right: 24 }, { borderBottomWidth: 4, borderRightWidth: 4 })} />

      <div style={{ position: "absolute", inset: "78px 120px 72px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: paper }}>
        <LogoSlot logo={p.logo} show={p.showLogoPlaceholder} color={paper} />
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 13, letterSpacing: 6, color: gold, marginTop: 8 }}>{p.issuer.toUpperCase()}</div>
        <h1 style={{ fontFamily: SERIF_PLAY, fontWeight: 400, fontSize: 52, margin: "22px 0 0", ...goldText }}>{p.title ?? "Certificate of Excellence"}</h1>
        <div style={{ margin: "16px 0 0" }}><Divider color={gold} w={180} /></div>
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 15, marginTop: 20, opacity: 0.65 }}>Presented to</div>
        <div style={{ fontFamily: SERIF_PLAY, fontStyle: "italic", fontSize: fitName(p.recipient, 68, 20), lineHeight: 1.15, margin: "10px 0 0" }}>{p.recipient}</div>
        <p style={{ fontFamily: SANS_MANROPE, fontSize: 16.5, lineHeight: 1.7, maxWidth: 640, margin: "18px 0 0", opacity: 0.8 }}>{p.description}</p>

        <Footer
          left={<DateBlock p={p} color={paper} font={SANS_MANROPE} sans={SANS_MANROPE} line={gold} />}
          center={<Signatures items={p.signatories} color={paper} line={gold} nameFont={SERIF_PLAY} titleFont={SANS_MANROPE} />}
          right={<Seal uid="noir" fill={gold} ring={base} ink={base} issuer={p.issuer} font={SERIF_PLAY} />}
        />
        <Verify url={p.verifyUrl} color={paper} font={SANS_MANROPE} />
      </div>
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/*  4. ATLAS (centred)                                                 */
/* ------------------------------------------------------------------ */

export function CertificateAtlas(p: CertificateProps) {
  const indigo = p.primary ?? "#1C2766";
  const coral = p.accent ?? "#C8553D";
  const ink = "#171A2E";
  const ticks = (side: "top" | "bottom"): CSSProperties => ({
    position: "absolute", left: 58, right: 58, [side]: 40, height: 7,
    backgroundImage: `repeating-linear-gradient(90deg, ${indigo} 0 1px, transparent 1px 12px)`, opacity: 0.55,
  });
  return (
    <Canvas scale={p.scale} background="#FDFDFB">
      <Texture color={indigo} rosette={0.06} rx={250} ry={60} />
      <div style={{ position: "absolute", inset: 0, border: `14px solid ${indigo}`, boxSizing: "border-box" }} />
      <div style={{ position: "absolute", inset: 30, border: `1px solid ${indigo}` }} />
      <div style={ticks("top")} />
      <div style={ticks("bottom")} />
      <div style={{ position: "absolute", top: 30, left: 30, width: 14, height: 14, background: coral }} />
      <div style={{ position: "absolute", bottom: 30, right: 30, width: 14, height: 14, background: coral }} />

      <div style={{ position: "absolute", inset: "76px 105px 78px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: ink }}>
        <LogoSlot logo={p.logo} show={p.showLogoPlaceholder} color={ink} />
        <div style={{ fontFamily: SANS_MANROPE, fontWeight: 700, fontSize: 18, marginTop: 8 }}>{p.issuer}</div>
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 18, fontWeight: 600, color: coral, marginTop: 26 }}>{p.title ?? "Certificate of Achievement"}</div>
        <div style={{ fontFamily: SANS_MANROPE, fontSize: 16, marginTop: 28, opacity: 0.65 }}>This certifies that</div>
        <div style={{ fontFamily: SERIF_INSTR, fontSize: fitName(p.recipient, 90, 22), lineHeight: 1.05, margin: "8px 0 0", color: indigo }}>{p.recipient}</div>
        <p style={{ fontFamily: SANS_MANROPE, fontSize: 17.5, lineHeight: 1.65, maxWidth: 640, margin: "20px 0 0", opacity: 0.85 }}>{p.description}</p>

        <Footer
          left={<DateBlock p={p} color={ink} font={SANS_MANROPE} sans={SANS_MANROPE} line={indigo} />}
          center={<Signatures items={p.signatories} color={ink} line={ink} nameFont={SERIF_INSTR} titleFont={SANS_MANROPE} />}
          right={<Seal uid="atlas" fill={indigo} ring="#FDFDFB" ink="#FDFDFB" issuer={p.issuer} font={SERIF_INSTR} />}
        />
        <Verify url={p.verifyUrl} color={ink} font={SANS_MANROPE} />
      </div>
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

export const certificateTemplates = {
  heritage: CertificateHeritage,
  meridian: CertificateMeridian,
  noir: CertificateNoir,
  atlas: CertificateAtlas,
} as const;

export type CertificateTemplateId = keyof typeof certificateTemplates;

export function Certificate({ template, ...props }: CertificateProps & { template: CertificateTemplateId }) {
  const T = certificateTemplates[template];
  return <T {...props} />;
}
