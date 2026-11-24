# Certificate settings and generation implementation plan

## Audit findings to fix first

- Global certificate print CSS leaks to unrelated print jobs: `certificate-print.css:1-6` sets a global A4 page and hides all body content whenever the chunk is loaded. Replace with scoped print markup/CSS injected only while printing a certificate.
- PDF export is brittle: `src/pages/School/Certificates.tsx:180-199` uses a global `.cert-sheet` selector and does not wait for fonts/images; html2canvas also mishandles `color-mix()` and `background-clip: text` used by Noir/Meridian. Use refs per generated certificate, await `document.fonts.ready` and image decode, and add capture-safe fallbacks for unsupported CSS.
- Stale signatory names: selecting a different staff member only fills a blank name at `Certificates.tsx:303-310,339-346`; a stale name can sit above a different signature. Always sync name/title from the selected staff unless the user later overrides them.
- Malformed persisted template IDs can resolve to inherited object properties (`registry.ts:42-65`). Use own-property checks/`Map` and always return a valid template definition.
- Empty state used a duplicate i18n key `pages:certificates.pickHint` (`Certificates.tsx:397`); catalogs now define both `selectHint` and `pickHint`.
- Assembled fields are ignored by templates: `leadIn`, `body`, `address`, `academicYear`, and `certificateId` are assembled but several are hardcoded or hidden in all four designs. Render all certificate fields in the templates.
- Settings preview uses sample signatories instead of configured signatories; pass real defaults/signatures into the preview.
- Clearing a document-signatory slot leaves stale certificate defaults in `AppearanceSettingsTab.tsx`; clear matching `sig*UserId` values too.
- SVG/canvas IDs are static (`CertificatePrimitives.tsx:46,169-179`), so multiple certificates on one page can cross-reference gradients. Use `React.useId()`.
- Compact previews print shrunk because the inner `.sheet` transform is not reset; print stylesheet must neutralize it.
- Long names can clip; improve `fitName` and add wrapping/truncation guard rails.
- Certificate page strings are untranslated in non-English catalogs; add translations.
- Tests only string-match source and assert the leaking print CSS. Extend them to cover safe resolution, defaults/roster serialization, generated certificate ids, print isolation, and i18n keys.

## Data model

- No DB migration for wording: extend the existing `certificateDefaults` JSON string in both frontend and identity service parsers/serializers with:
  - `title`, `leadIn`, `body`, `certificateIdPrefix`, `issueDateDefault`, `academicYearDefault`, `certificateRoster`
- `certificateRoster` shape: `{ enabled: boolean; studentIds: string[] }`. When disabled or empty, the certificates page keeps showing all students; when enabled, only listed students can be selected/generated.
- Keep legacy JSON backward compatible: missing keys resolve to current defaults and an empty/disabled roster.
- Add a dedicated identity endpoint `PATCH /api/schools/:schoolId/certificate-settings` restricted to `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, so VPI can edit certificate settings without gaining broad school-settings rights. It merges template, defaults, and roster into the same JSON fields.
- Extend auth store `School.certificateDefaults` types to mirror the new shape.

## Settings UI

- Add a `CERTIFICATES` settings tab rendered only for `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`.
- Add VPI to the settings route/nav role maps, but in `certificateOnly` mode VPI sees only the `CERTIFICATES` tab.
- In the new tab provide editable fields for:
  - template selection and preview
  - title, lead-in, body text
  - certificate ID prefix and preview/serial override
  - default issue date and academic year
  - signatory names, titles, staff/signature slots
  - school logo, brand color, address, and school name (with note that school profile is the source)
  - student roster: searchable selectable list, add/remove, clear, enable/disable restriction
- Save through `settingsApi.updateCertificateSettings`; SCHOOL_ADMIN/PRINCIPAL/VPI all use this endpoint. Keep existing appearance fields working for other roles.
- Pass saved wording/defaults/signatories into `TemplatePreviewModal` so preview matches issuance.

## Generation UI

- Keep `/:slug/certificates` as the canonical page for `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI` (REGISTRAR remains allowed).
- Load the roster from school defaults and filter the student picker when the roster is enabled.
- Add multi-select student list with “Generate certificates”; generated items are stored per-school in component state with stable ids.
- Each generated certificate gets:
  - live A4 preview
  - `Download PDF`
  - `Print`
- Add batch actions: `Download all PDFs` (single multi-page jsPDF) and `Print all`.
- Allow per-generation overrides for title/lead-in/body/certificate id/date/year/signatories while defaulting from settings.
- Use a ref map keyed by generated certificate id for capture/print; never use a global `.cert-sheet` query.

## PDF/print implementation

- Add `src/features/certificates/lib/exportCertificate.ts`:
  - `printCertificates()` injects a unique `<style>` with `@page { size: A4 landscape; margin: 0 }` and scoped visibility rules only for a temporary certificate print root, then removes the style/root after printing
  - neutralizes compact `.sheet` transforms and page breaks between certificates
  - `exportCertificatesPdf()` resolves refs, awaits `document.fonts.ready` and all `<img>` load events
  - uses html2canvas with `scale: 2`, `useCORS: true`, `backgroundColor: "#ffffff"`, then jsPDF A4 landscape
  - supports one or many elements into one PDF
- Add capture-safe style fallback for Noir gradient and Meridian radial-gradient backgrounds so PDF output does not lose text/background.
- Validate long names/content before capture and shrink/wrap instead of clipping.

## Verification

- Update `tests/certificate-templates.test.ts` for new field rendering, safe registry lookups, scoped print CSS, and capture-safe CSS.
- Add tests for certificate defaults/roster parse+serialize, endpoint role shape, i18n keys, and generated certificate id/filename helpers.
- Run `npm.cmd run test:certificates`, `npm.cmd run test:i18n`, `npm.cmd run test:settings`, `npm.cmd run lint`, and Vite build.
- Manually verify all four templates, settings preview, roster filtering, generated list, single/batch PDF, and single/batch print.

## Implementation status

- Implemented: identity certificate-settings endpoint, expanded defaults/roster parsing, settings API/store/route/nav wiring, certificate settings tab, roster-controlled generation page, scoped print helper, ref-based PDF export, unique SVG ids, rendered configurable fields, capture-safe fallbacks, and expanded regression tests.
- Verification run: `test:certificates`, `test:settings`, `test:i18n`, `test:signature`, `test:ux-wiring`, `test:responsive`, Vite build.
- Known unrelated pre-existing failures: `lint` (api-docs/online-exam), `i18n:check` (critical-path English leftovers), `test:ui-drift`.
