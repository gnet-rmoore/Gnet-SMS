# Certificate Templates for Next.js

Four print-ready certificate templates built as plain React components. No CSS framework, no runtime dependencies beyond React and `next/font`.

| Template | Look | Best for |
|---|---|---|
| `heritage` | Ivory, navy and gold. Triple frame with flourished corners. Cormorant Garamond. | Academic and formal programmes |
| `meridian` | White, deep emerald and brass. Chamfered double frame. DM Serif and DM Sans. | Corporate training and professional credentials |
| `noir` | Charcoal with champagne-gold gradient title. Corner brackets. Playfair Display. | Awards and premium programmes |
| `atlas` | Left-aligned editorial layout. Heavy indigo frame with ruler-tick edges. Instrument Serif. | Modern or tech organisations |

## Files

```
components/
  certificates.tsx        # the four templates, shared types, print CSS
app/
  fonts.ts                # next/font setup (see fonts-and-demo.tsx)
  layout.tsx              # applies font variables and print CSS
  certificates/page.tsx   # optional preview page for all four
```

`fonts-and-demo.tsx` contains the font setup, the layout snippet and the preview page in one file. Split them as shown above.

## Setup

**1. Copy the component.** Put `certificates.tsx` at `components/certificates.tsx`. The demo imports it as `@/components/certificates`, so adjust the path if your alias differs.

**2. Register the fonts.** Create `app/fonts.ts` from `fonts-and-demo.tsx`. It loads eight Google fonts through `next/font/google` and exposes them as CSS variables.

**3. Wire up the layout.** Apply the font variables to `<body>` and add the print CSS:

```tsx
// app/layout.tsx
import { fontVars } from "./fonts";
import { certificatePrintCss } from "@/components/certificates";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><style>{certificatePrintCss}</style></head>
      <body className={fontVars}>{children}</body>
    </html>
  );
}
```

If you skip the font step, the templates fall back to Georgia and system sans-serif. They still render, but they lose their intended look.

## Usage

Pick a template by id:

```tsx
import { Certificate } from "@/components/certificates";

<Certificate
  template="noir"
  recipient="Amara Johnson"
  description="For successfully completing the Advanced Project Management programme with distinction."
  issuer="Atlas Institute"
  date="24 November 2026"
  certificateId="AI-2026-04172"
  verifyUrl="verify.atlasinstitute.org/AI-2026-04172"
  signatories={[
    { name: "Dr. Helen Mensah", title: "Director of Programmes" },
    { name: "Samuel Cole", title: "Chief Executive" },
  ]}
  logo={<img src="/logo.svg" alt="" height={52} />}
/>
```

Or import one directly:

```tsx
import { CertificateHeritage } from "@/components/certificates";
```

The components use no hooks or browser APIs, so they work in both Server and Client Components.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `template` | `"heritage" \| "meridian" \| "noir" \| "atlas"` | Only on `<Certificate>` | |
| `recipient` | `string` | Yes | Large display name. See "Long names" below. |
| `description` | `string` | Yes | One or two sentences works best. |
| `issuer` | `string` | Yes | Organisation name. |
| `date` | `string` | Yes | Pre-formatted by you, for example `"24 November 2026"`. |
| `title` | `string` | No | Defaults differ per template, such as "Certificate of Achievement". |
| `certificateId` | `string` | No | Shown in the footer or beside the date. |
| `verifyUrl` | `string` | No | Shown as small print in `meridian` and `atlas`. |
| `signatories` | `{ name; title; signatureImage?; signatureText? }[]` | No | One or two recommended. `signatureImage` wins over `signatureText` (handwriting font). |
| `logo` | `ReactNode` | No | Pulled from the back-end per school. The slot is always reserved (52px tall, max ~220px wide). See "Multi-tenant integration TODO". |
| `showLogoPlaceholder` | `boolean` | No | Dev/preview only. Draws a dashed "School logo" box when `logo` is missing. |
| `qr` | `ReactNode` | No | About 52px square, for example `<QRCodeSVG value={verifyUrl} size={52} />`. |
| `primary` / `accent` | `string` (hex) | No | Brand colour overrides. Templates use their defaults when omitted. |
| `scale` | `number` | No | Defaults to `1`. See "Sizing" below. |

`verifyUrl` is small print under the footer, not a link. The QR code comes from the `qr` prop; the component has no QR dependency.

## Multi-tenant integration TODO

This is for the AI agent or developer wiring these into the school management system. The same checklist sits at the top of `certificates.tsx`.

1. **Logo.** Resolve the school (tenant) from the session or route and use the existing branding endpoint. Fetch on the server and pass `logo={<img src={school.logoUrl} alt="" style={{ height: "100%", width: "auto", objectFit: "contain" }} />}`. Use a plain `<img>`, not `next/image`, so screen, print and PDF match. Leave `logo` undefined if the school has none; the space stays reserved.
2. **PDF.** Load the logo fully before capture. A server-fetched base64 data URI is the safest option.
3. **Dark template.** `noir` has a dark background (see `darkLogoTemplates`). Pass the school's light or transparent logo variant, or put the logo on a light chip.
4. **Brand colours.** Pass the school's `primary` and `accent` if available, and check contrast.
5. **Signatures.** Pass `signatureImage` per signatory from tenant storage (transparent PNG or SVG, ~44px tall).
6. **QR.** Use `qrcode.react` with a tenant-aware public verification URL that looks up `certificateId`.
7. Remove `showLogoPlaceholder` from production code, and use "Educator" and "Learner" in any generated wording.

## Sizing and preview

Each certificate is a fixed canvas of **1123 × 794 px**, which is A4 landscape at 96 dpi. The `CERT_W` and `CERT_H` constants export these numbers. The `scale` prop shrinks the canvas for on-screen display, for example `scale={0.6}` in a card grid. For a fully responsive preview, wrap the certificate in a container that measures its width and passes `scale = width / CERT_W`.

## Printing and PDF

**Browser print or "Save as PDF".** Include `certificatePrintCss`, as in the layout above, then call `window.print()`. The CSS sets A4 landscape with no margins, forces background colours to print, and hides everything except elements with the `cert-print` class.

If a page shows several certificates, all of them will print. For a single certificate, give it its own route, such as `/certificates/[id]/print`.

**Server-side PDF** (emailing, bulk issuing). Render a dedicated print route and capture it with Puppeteer or Playwright:

```ts
await page.goto(`${origin}/certificates/${id}/print`, { waitUntil: "networkidle" });
await page.pdf({ width: "297mm", height: "210mm", printBackground: true });
```

Wait for fonts to load before capturing, or the PDF may use fallback fonts.

## Customising

- **Colours.** Each template declares its palette as constants at the top of its component, such as `navy`, `gold`, `ink` and `brass`. Change them there.
- **Fonts.** Swap the `next/font` imports in `fonts.ts`, keeping the CSS variable names: `--font-cormorant`, `--font-inter`, `--font-dm-serif`, `--font-dm-sans`, `--font-playfair`, `--font-manrope`, `--font-instrument` and `--font-signature`.
- **Seal.** The seal builds itself from `issuer`: the school name runs around the rim and its initials sit in the centre. Edit the rim wording inside `Seal`.
- **New template.** Add a component that takes `CertificateProps` and wraps its content in `Canvas`. Then register it in `certificateTemplates`.

## Known limitations

- **Long names.** Name size shrinks automatically down to 55% of its base size. Beyond that the name wraps, so test your longest real names.
- **Fixed format.** The layout is A4 landscape only. US Letter works with minor margin differences, but portrait is not supported.
- **Not visually tested.** The templates were written but not rendered in a browser. Check each one with your real content, logo and longest recipient name before issuing certificates.
