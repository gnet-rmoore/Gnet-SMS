# Graduation certificate templates plan

> **Status:** Done (2026-08-03) — Phase 4 tenant branding  
> **Owner:** frontend-spa (`src/features/certificates`), Settings appearance, Certificates page; identity `School.certificateTemplate` + `certificateDefaults`  
> **Source assets:** four diploma PNGs in Cursor assets (brown classic, gold laurels, red seal, beige heritage)  
> **Confirmed:** Landscape Letter; roles School Admin / Principal / VPI / Registrar; persist `certificateTemplate` on school  
> **Phase 4:** Per-tenant logo, brand color accents, address line, saved signatory defaults — **done**

## Goal

Add **four printable graduation / completion certificate templates** that schools can pick in Settings and issue for graduating students (preview, print, PDF). Designs follow the attached samples; content uses real school / student / signatory fields — no fake seals-as-logos beyond decorative SVG chrome.

## Template map

| # | Design (from asset) | Template id | Settings label | Page size |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Brown double frame + beige scroll + scalloped seal | `CERT_CLASSIC_BROWN` | Classic brown frame | Landscape Letter `11×8.5 in` |
| 2 | Gold vertical side rules + faint laurel watermark + gold seal | `CERT_GOLD_LAURELS` | Gold laurels | Landscape Letter |
| 3 | Dark grey top/bottom bands + red scalloped seal with wreath | `CERT_RED_SEAL` | Red seal diploma | Landscape Letter |
| 4 | Tan border + art-deco corner fans + medal seal | `CERT_HERITAGE_TAN` | Heritage diploma | Landscape Letter |

All four are **landscape** completion/diploma layouts (not grade matrices).

## Shared certificate data

```ts
type CertificateData = {
  school: { name: string; logoUrl?: string | null };
  title: string;                 // e.g. "CERTIFICATE OF COMPLETION" / "HIGH SCHOOL GRADUATION DIPLOMA"
  leadIn: string;                // e.g. "THIS CERTIFIES THAT"
  studentName: string;
  body: string;                  // completion sentence (school name interpolated)
  issueDate: string;
  academicYear: string;
  signatories: [
    { name: string; title: string },
    { name: string; title: string },
  ];
};
```

Assembler fills from school settings + selected student + optional overrides (custom title/body). Missing signatory names stay as blank lines (honest empty — do not invent). **Official signature images** come from Settings document-signatory slots / certificate staff pickers (`docs/DOCUMENT_SIGNATURES_PLAN.md`).

## Architecture

```
src/features/certificates/
  types.ts
  registry.ts              # id → label, description, pageSize, component
  assembleCertificate.ts   # school + student → CertificateData
  sampleData.ts            # Settings preview sample
  components/
    CertificateView.tsx    # registry router
    ClassicBrownCert.tsx
    GoldLaurelsCert.tsx
    RedSealCert.tsx
    HeritageTanCert.tsx
  styles/
    classic-brown.css
    gold-laurels.css
    red-seal.css
    heritage-tan.css
  index.ts
src/pages/School/Certificates.tsx   # pick student(s) → preview / print / PDF
src/components/CertificateTemplates.tsx  # thin re-export
```

- Print: scoped CSS + `@page { size: letter landscape }` (same Path 1 as gradesheets; browser print / html2canvas+jsPDF).
- Decorative seals/borders: inline SVG (no dependency on the PNG assets at runtime; PNGs are design reference only).
- Fonts: Google Fonts serif + sans via CSS `@import` (Playfair / Cormorant + Source Sans or similar), matching each design’s contrast.

## Product wiring

1. **Settings → Appearance** — new “Graduation certificate template” picker (same pattern as grade sheet / report card), with modal preview using `sampleData`.
2. **School field** — `certificateTemplate` on Identity `School` (default `CERT_CLASSIC_BROWN`); patch via existing school settings save; expose on auth `school` object.
3. **Page** — `/{slug}/certificates` for School Admin / Principal / VPI (and TEACHER if already allowed similar academic docs). Select graduating student → render school’s chosen template → Print / Download PDF.
4. **Nav** — under Academics next to transcripts / gradebook (role-gated).

## Out of scope (this pass)

- Bulk cohort ZIP / mail-merge
- Digital signature / blockchain verification / QR authenticity
- Server Puppeteer PDF
- Changing graduation eligibility rules (page does not auto-decide who graduated; staff pick the student)

## Phases

### Phase 0 — Confirm (this doc)

- [x] Confirm landscape **Letter** for all four (vs A4 landscape)
- [x] Confirm roles for Certificates page: School Admin, Principal, VPI, Registrar
- [x] Confirm persist `certificateTemplate` on school

### Phase 1 — Feature module + four ports

1. [x] Types, registry, sample data, assembler.
2. [x] Four React + scoped CSS ports matching the reference designs.
3. [x] `CertificateView` router + thin re-export.

### Phase 2 — Settings + school field

1. [x] Identity schema + API accept `certificateTemplate`.
2. [x] Appearance picker + preview modal.
3. [x] i18n keys (EN + leaf locales).

### Phase 3 — Issue page + nav

1. [x] `Certificates` page: student search/select, live preview, print/PDF.
2. [x] Route in `App.tsx` + `navByRole`.
3. [x] Unit test: registry resolve + assembler mapping.
4. [x] Rebuild `frontend-spa` (+ `identity` if schema/API changed).

### Phase 4 — Per-tenant branding & defaults

1. [x] Extend `CertificateData` with `address`, `brandColor`; render **logo** on all four templates.
2. [x] Drive accents via CSS `--cert-brand` from school `brandColor` (design fallbacks when unset).
3. [x] Identity `certificateDefaults` JSON; Settings Appearance editors; Certificates page pre-fills.
4. [x] Settings preview uses live school name / logo / brand / address when available.
5. [x] Tests + rebuild identity + frontend-spa; update this plan + IMPLEMENTATION_STATUS.

## Acceptance checks

- [x] All four designs preview in Settings and print at landscape Letter without clipping.
- [x] Changing Settings template changes Certificates page output for that school.
- [x] Student name / school name / signatories from real data; blanks when missing.
- [x] PDF download works for the active template.
- [x] Docs: this plan status + `IMPLEMENTATION_STATUS.md` companion note.
- [x] Logo + brand color + address appear from the logged-in school’s Settings.
- [x] Signatory defaults persist per school and pre-fill the Certificates page.

## Doc updates

- This plan → Done when shipped.
- `IMPLEMENTATION_STATUS.md` Honest gaps: graduation certificates entry linking here.
- `FRONTEND_GUIDELINES.md` only if a new shared print pattern needs a one-liner (optional).
