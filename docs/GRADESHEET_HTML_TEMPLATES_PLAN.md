# Gradesheet HTML templates plan

> **Status:** Done (2026-08-03) — three HTML designs as React print components; **17-subject dense + multi-page layout (same day)**; Puppeteer Path 2 deferred  
> **Owner:** frontend-spa (`src/features/gradesheets`, Settings appearance, GradeSheet page)  
> **Source assets:** `Gradesheet Templates/` (3 HTML files; `.docx` ignored)

## Long subject lists (10+)

When `subjects.length >= 10`, templates add `gs-dense` (tighter row/header spacing; mastery hides per-row remarks). Sheets grow beyond one page (`height: auto`); print uses repeating table headers, row-level `break-inside: avoid`, and a `closing-block` (summary / remarks / signatures) that prefers staying together on the following page. Settings preview sample uses **17 subjects** to exercise this path.

## Goal

Replace the current Tailwind grade-sheet variants (`TEMPLATE_1`…`TEMPLATE_10` in `src/components/GradeSheetTemplates.tsx`) with **faithful React ports** of the three HTML designs, preserving each template’s **print page size**. Keep Liberian / international **report cards** unchanged.

This app is **Vite + React Router**, not Next.js — Path 1 from the HTML guide applies (components + CSS + browser print / client PDF). Server Puppeteer (Path 2) is **out of scope** for this pass unless you ask for it later.

## Source templates → product IDs

| Source file | Design name | Page size | New template id | Settings label |
| :--- | :--- | :--- | :--- | :--- |
| `A4…/gradesheet-classic.html` | The Ledger | **A4** `210×297mm` (`@page size:A4`) | `TEMPLATE_1` | Classic ledger (A4) |
| `A4…/gradesheet-modern.html` | Mastery Bars | **A4** `210×297mm` | `TEMPLATE_2` | Modern mastery (A4) |
| `Legal…/gradesheet_template.html` | Official Record | **Legal** `8.5×14in` (see decision below) | `TEMPLATE_3` | Official record (Legal) |

**Page-size decision (confirm):** The Legal folder’s HTML currently sets `@page { size: letter }` and a ~850×1100px sheet (Letter-ish). Per your note (“A4 and Legal”), implementation will **correct** that template to **Legal** (`@page size: legal`, sheet `216mm × 356mm` / `8.5in × 14in`) unless you prefer keeping Letter as authored.

## Out of scope

- Report-card registry / Liberian booklet / international report cards  
- Puppeteer / serverless Chromium PDF API  
- Changing grade calculation rules on the academic service (UI maps existing grades only)  
- Shipping the `.docx` as a runtime template

## Architecture

```
src/features/gradesheets/
  types.ts                 # shared ReportData (school, term, student, subjects, summary, attendance, remarks)
  registry.ts              # id → { name, description, pageSize: 'a4' | 'legal', component }
  assembleGradeSheet.ts    # map GradeSheet API grades + school + legends → ReportData
  components/
    LedgerReport.tsx       # classic A4 (+ scoped CSS from HTML)
    MasteryBarsReport.tsx  # modern A4
    OfficialRecordReport.tsx # legal
  index.ts
src/components/GradeSheetTemplates.tsx  # thin re-export / router (keeps import paths stable)
```

Fonts: load Fraunces / IBM Plex / Space Grotesk / Inter / JetBrains Mono via Google Fonts `@import` in the template CSS modules (Vite has no `next/font`). Print relies on those `@page` rules already in the HTML.

## Data mapping (honest gaps)

HTML templates expect richer fields than today’s GradeSheet page always has. Assembler rules:

| Template field | Source |
| :--- | :--- |
| Subject name / obtained | Existing grade rows (weighted avg per subject, same as current sheets) |
| Max | Default `100` (or component max when known) |
| Grade letter | Existing `gradeLegends` / fallback bands |
| Class avg | `null` / `—` when not available (do not invent) |
| Remark | Empty or short legend label when no teacher remark |
| CA / Exam (Legal template) | Split from gradebook component codes when present (`CA`/`CW` vs `FIN`/`EX`); else put weighted avg in Total and leave CA/Exam as `—` |
| Admission no, DOB, guardian, rank, attendance, principal remark | Use real fields when on student/school payload; otherwise blank / `—` |

No fake ranks, GPA, or attendance.

## Phases

### Phase 0 — Confirm decisions (this doc)

- [x] Confirm Legal vs Letter for template 3 → **Legal**  
- [x] Confirm replace **all** current grade-sheet picks with only these 3 (legacy `TEMPLATE_4+` → remap to `TEMPLATE_1`)  
- [x] Confirm Path 2 (server PDF) stays deferred  

### Phase 1 — Feature module + ports

1. [x] Add `types`, `registry`, `assembleGradeSheet`.  
2. [x] Convert each HTML body to JSX; move CSS into scoped CSS under `styles/`.  
3. [x] Replace body of `GradeSheetTemplates.tsx` with registry router.  
4. [x] Delete old TEMPLATE_4–10 UI paths.

### Phase 2 — Settings + preview

1. [x] Shrink grade-sheet picker to 3 entries.  
2. [x] Replace `TemplatePreviewRenderer` GRADE switch with live components.  
3. [x] Widen preview modal for Legal.  
4. [x] Unknown/old ids resolve via `resolveGradeSheetTemplateKey()` → `TEMPLATE_1`.

### Phase 3 — Print / PDF page size

1. [x] `GradeSheet.tsx` jsPDF uses registry `pdfFormat`.  
2. [x] Print CSS injects `@page` from selected template.  

### Phase 4 — Docs, tests, rebuild

1. [x] Plan status + `IMPLEMENTATION_STATUS.md`  
2. [x] `docs/gradebook-architecture.md`  
3. [x] `tests/gradesheet-templates.test.ts`  
4. Rebuild `frontend-spa` after green tests.

## Key files

| File | Change |
| :--- | :--- |
| `Gradesheet Templates/**/*.html` | Source of truth for layout/CSS (keep in repo; not runtime-loaded in Phase 1) |
| `src/features/gradesheets/**` | New module |
| `src/components/GradeSheetTemplates.tsx` | Replace implementations |
| `src/pages/School/GradeSheet.tsx` | Page-size-aware PDF/print |
| `src/features/settings/components/AppearanceSettingsTab.tsx` | 3 pickers |
| `src/features/settings/components/TemplatePreviewRenderer.tsx` | GRADE previews |
| `src/features/settings/components/TemplatePreviewModal.tsx` | Legal preview width |
| `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md` | This plan |
| `IMPLEMENTATION_STATUS.md` | Companion link |

## Acceptance checks

- [ ] Settings shows exactly 3 grade-sheet options with A4 / Legal called out  
- [ ] Preview + live GradeSheet for each id match the HTML structure (masthead, subject rows, summary, signatures)  
- [ ] Print/PDF for classic & modern uses **A4**; official record uses **Legal** (if approved)  
- [ ] Schools saved as old `TEMPLATE_4`… still render (remap to classic)  
- [ ] Report-card picker / Liberian booklets untouched  
- [ ] No invented attendance/rank/GPA when data missing  
- [ ] Frontend tests green; `frontend-spa` rebuilt  

## Doc updates (same task)

- This plan → status **Done** / **Partial** when shipped  
- `IMPLEMENTATION_STATUS.md` Honest gaps: one line linking here  
- Brief note in `docs/gradebook-architecture.md` if it still cites the old 10 Tailwind sheets  

## Open questions for you

1. **Legal vs Letter** for `gradesheet_template.html` — correct to Legal as planned?  
2. **Defer Puppeteer** server PDF, or include a thin Path 2 in the same pass?  
3. Confirm **drop all 10** current grade-sheet skins in favor of these 3 only.
