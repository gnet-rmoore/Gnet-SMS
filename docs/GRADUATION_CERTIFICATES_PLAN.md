# Graduation certificate templates plan

> **Status:** Done — supplied A4 template set integrated
> **Owner:** frontend-spa (`src/features/certificates`), Settings appearance, Certificates page; identity `School.certificateTemplate` + `certificateDefaults`
> **Source assets:** `docs/SMS Certificcate Templates/` and `docs/SMS Certificcate Templates/certificates/` (`certificates.tsx`, `fonts-and-demo.tsx`, `preview.html`, `README.md`)
> **Confirmed:** A4 landscape; roles School Admin / Principal / VPI / Registrar; persist `certificateTemplate` on school
> **Branding:** per-tenant logo, name/text, address line, saved signatory defaults; template colors stay fixed to the supplied designs

## Goal

Eight printable graduation / completion certificate templates that schools pick in Settings and issue for graduating students (preview, print, PDF). The supplied inline CSS/styling is preserved; only data wiring, fonts, page size, and app organization are adapted.

## Template map

| # | Supplied design | Persisted template id | Supplied id alias | Settings label | Page size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Ivory, navy and gold; triple frame, flourished corners | `CERT_CLASSIC_BROWN` | `heritage` | Heritage | A4 landscape |
| 2 | White, emerald and brass; chamfered double frame | `CERT_GOLD_LAURELS` | `meridian` | Meridian | A4 landscape |
| 3 | Charcoal with champagne-gold gradient title; corner brackets | `CERT_RED_SEAL` | `noir` | Noir | A4 landscape |
| 4 | Editorial indigo frame with ruler-tick edges | `CERT_HERITAGE_TAN` | `atlas` | Atlas | A4 landscape |
| 5 | Ivory, burgundy, gold studs, and laurel divider | `CERT_SOVEREIGN` | `sovereign` | Sovereign | A4 landscape |
| 6 | Navy page, ivory notched panel, gold lattice | `CERT_REGENT` | `regent` | Regent | A4 landscape |
| 7 | Emerald-black, stepped gold frame, sunburst fan | `CERT_DECO` | `deco` | Deco | A4 landscape |
| 8 | Royal purple lace border, gold accents, laurels | `CERT_IMPERIAL` | `imperial` | Imperial | A4 landscape |

Persisted ids stay stable so existing school settings keep working; the supplied lowercase ids are accepted aliases in `resolveCertificateTemplateKey`.

## Shared certificate data

```ts
type CertificateData = {
  school: { name: string; logoUrl?: string | null; address?: string | null };
  title: string;
  leadIn: string;
  studentName: string;
  body: string;
  certificateId?: string | null;
  issueDate: string;
  academicYear: string;
  signatories: [CertificateSignatory, CertificateSignatory];
};
```

Assembler fills from school settings + selected student + optional overrides. Tenant logo comes from `school.logoUrl`, name/text/address come from the school profile, and official signature images come from `signatureUrl`. Template palettes stay fixed to the supplied colors; missing signatory names stay as blank lines.

## Architecture

```
src/features/certificates/
  types.ts
  registry.ts              # id → label, description, page size, supplied palette
  assembleCertificate.ts   # school + student → CertificateData
  sampleData.ts            # Settings preview sample
  components/
    CertificateView.tsx        # registry router + shared print/font CSS imports
    CertificatePrimitives.tsx  # supplied Canvas/Texture/seal/signature building blocks
    HeritageCert.tsx
    MeridianCert.tsx
    NoirCert.tsx
    AtlasCert.tsx
    SovereignCert.tsx
    RegentCert.tsx
    DecoCert.tsx
    ImperialCert.tsx
  styles/
    fonts.css                # supplied thirteen Google Fonts
  lib/
    exportCertificate.ts     # scoped print + ref-based PDF capture
  index.ts
src/pages/School/Certificates.tsx   # roster → generate → preview / print / PDF
src/components/CertificateTemplates.tsx  # thin re-export
```

- Print: scoped `@page { size: A4 landscape; margin: 0; }` injected only while printing certificates.
- PDF: html2canvas captures per-certificate refs; jsPDF emits A4 landscape `297 × 210 mm`.
- Design: original inline styles, SVG seals, grain, guilloche, gradients, frames, and font variables are kept from the supplied React components.

## Product wiring

1. **Settings → Appearance** — “Graduation certificate template” picker and modal preview use the new registry labels/descriptions.
2. **School field** — `certificateTemplate` remains the persisted field; default still resolves to Heritage.
3. **Page** — `/{slug}/certificates` renders the active supplied design with real school/student/signatory data.
4. **Nav** — unchanged (role-gated under Academics).

## Acceptance checks

- [x] All eight supplied designs render in Settings and print at A4 landscape without clipping.
- [x] Changing Settings template changes Certificates page output for that school.
- [x] Student name / school name / signatories come from real data; blanks when missing.
- [x] School logo, name/text, address, and official signature images feed the supplied slots; supplied colors are unchanged.
- [x] PDF download uses the A4 landscape canvas.
- [x] Old four template components and scoped CSS files are removed.
- [x] Fonts and print CSS mirror the supplied setup without `next/font`.
