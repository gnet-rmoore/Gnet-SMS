# Wisteria-style report card templates plan

> **Status:** Done (2026-08-03) — Wisteria INTL templates + **calendar periods + tenant brandColor**  
> **Owner:** frontend-spa (`src/features/report-cards`, `ReportCard.tsx`)

## Calendar + branding (done)

| Gap | Fix |
| :--- | :--- |
| Hard-coded 1st–4th | Columns from active Academic Calendar `periods` via `useAcademicCalendarQuery` on Report Card page → `calendarPeriods` prop |
| Score mapping | `buildPeriodSubjectRows` matches `examComponent.shortCode` to period / nested component codes; title fallback against period labels |
| No calendar → preview | `FALLBACK_QUARTER_COLUMNS` (1st–4th / Q1–Q4) when calendar empty; Settings preview passes sample Fall–Summer periods |
| Brand color | `applyTenantBrand` tints side bars + table headers from `school.brandColor`; else PDF green/navy defaults |
| Year label | `academicYearLabel={calendar?.name}` on Report Card page |

Liberian booklets unchanged in this pass (still semester column pack).

**Verify:** `npm run test:report-card` · Settings Wisteria preview shows Fall/Winter/… headers + teal brand tint · live Report Card uses calendar period labels when configured.


## Templates

| Key | Label | Visual | Page size |
| :--- | :--- | :--- | :--- |
| `INTL_WISTERIA_GREEN` | Green academic quarterly | Dark green side bars, crest “W”, mint zebra subject rows, grading-system panel + comments | **A4** (same as other INTL packs) |
| `INTL_WISTERIA_NAVY` | Navy bordered quarterly | Navy side bars, scalloped “WHS” mark, navy “REPORT CARD” banner, sage/gray tables | **A4** |

Both share the same **document structure** from the PDFs:

1. Letterhead (school logo/crest + school name + “Report Card” title)  
2. Identity strip: Student name, Year/Section, Class adviser · Grading period, School year  
3. Left: **Subjects** table with columns **1st / 2nd / 3rd / 4th** · **Attendance** grid · **Grade** (Quarterly / Average)  
4. Right: **Grading system** legend (A+…F with score bands) · **Teacher’s comments** box  

## Data mapping (honest)

Current report-card props are mostly **one mark per subject** (exam release). For quarterly columns:

| Cell | Rule |
| :--- | :--- |
| Subject name | From released grades |
| 1st–4th | Prefer component shortCodes `Q1`/`P1`/`SEM1_P1` … `Q4`/`P4`; if only one score exists, place it in the period inferred from exam title / optional `gradingPeriod` (1–4), else **1st**; other quarters `—` |
| Attendance days | Real fields when passed; else `—` (do not invent) |
| Quarterly / Average grade | Average of filled subject marks for that period / overall; `—` when empty |
| Comments | `teacherComment` or blank ruled area |
| School name / logo | Live school branding (not locked to “Wisteria”) |
| Crest fallback | Initials from school name when no logo |

**17 subjects:** dense row padding on both layouts; sheet `height: auto` with print page-break rules (same approach as grade sheets) so long subject lists do not clip.

## Out of scope

- Replacing / redesigning the existing 10 INTL templates  
- Liberian booklet changes  
- Server PDF / Puppeteer  
- Inventing quarterly history the academic API does not provide  

## Architecture

```
src/features/report-cards/
  registry.ts                          # +2 defs (region INTL, pages: [GRADES])
  components/international/
    InternationalReportCard.tsx        # switch cases
    WisteriaGreenCard.tsx              # NEW
    WisteriaNavyCard.tsx               # NEW
    quarterlyHelpers.ts                # NEW — map grades → Q1–Q4 cells
    shared.tsx                         # reuse A4Page, SchoolMark, dash, letterOf
```

Settings: no picker code change — `reportCardPickerGroups()` already lists all `region: "INTL"` defs.  
Preview: `TemplatePreviewRenderer` already routes non-LR keys to `InternationalReportCard`.  
Persist: keys stored as `INTL_WISTERIA_GREEN` / `INTL_WISTERIA_NAVY` (no `legacyId`).

## Phases

### Phase 0 — Confirm

- [ ] Confirm A4 (not Letter) for both  
- [ ] Confirm school branding replaces sample “Wisteria” / “WHS” at runtime  
- [ ] Confirm quarterly columns use honest `—` when multi-period data is missing  

### Phase 1 — Registry + helpers + two components

1. Register both template defs.  
2. Implement `quarterlyHelpers` + green/navy React ports matching PDF chrome (side bars, colors, table chrome).  
3. Wire switch in `InternationalReportCard`.  
4. Dense styling for 10+ / 17 subjects.  

### Phase 2 — Preview sample + docs + tests + rebuild

1. Ensure Settings preview shows sample rows (existing mock grades enough; optionally expand mock to ~12–17 for these keys).  
2. Update `docs/INTERNATIONAL_REPORT_CARD_TEMPLATES_PLAN.md` companion note + this plan status.  
3. Link from `IMPLEMENTATION_STATUS.md` §9b.  
4. Unit test: registry includes both keys; quarterly mapper places single score correctly.  
5. `docker compose up --build -d frontend-spa`.  

## Acceptance checks

- [ ] Settings → Appearance → Report card shows both new options under International  
- [ ] Preview matches PDF structure (side bars, subjects 1–4, attendance, grade panel, grading system, comments)  
- [ ] Live school name/logo used; no invented attendance/GPA  
- [ ] 17-subject list renders without clipping (dense + multi-page print OK)  
- [ ] Existing INTL + LR templates unchanged  
- [ ] Tests green; frontend-spa rebuilt  

## Open questions for you

1. Keep **A4** (consistent with other INTL cards), or **Letter** to match the Canva PDFs more closely?  
2. OK to use **school brand color** as an optional accent override, or lock exact green / navy from the PDFs?
