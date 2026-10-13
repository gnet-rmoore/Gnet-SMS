# International Report Card Templates — Improvement Plan

> **Status:** Plan authored (2026-07-30) — **not implemented**  
> **Problem:** Current International (`INTL_*`) A4 cards feel too minimal and do not read as official school report-card documents  
> **Goal:** Redesign all 10 International templates so each fills A4 like a real printed report (dense, formal, curriculum-authentic) while staying honest about missing data  
> **Companion:** `docs/LIBERIAN_REPORT_CARD_TEMPLATES_PLAN.md`, `IMPLEMENTATION_STATUS.md`, `FRONTEND_GUIDELINES.md`  
> **Code today:** `src/features/report-cards/components/international/`

---

## 0. Summary

| Area | Decision |
| :--- | :--- |
| Who | School Admin picks template in Settings → Appearance; families/staff see it on generate/print |
| What | Redesign 10 International single-page (or light multi-section) **A4 portrait** report cards |
| Why now | v1 shipped structure + registry; visual fidelity failed review (“too minimal”, “not a professional document”) |
| Honesty | Still no invented GPA / attendance / rank / canned praise. Empty → `—` or ruled blank lines for wet ink |
| Out of scope (this plan) | Liberian bifold redesign; server PDF issuer; new region packs (US/EU-only keys) |

### 2026-07-30 — Plan authored

- **Change:** Document gaps in v1 International designs and a phased redesign to document-grade fidelity
- **Services:** frontend-spa (primary); academic assembly only if new real fields are needed later
- **Status:** draft (plan only)
- **Verify:** N/A until Phase 1+

### 2026-07-30 — Visual references added

- **Change:** Stakeholder supplied 9 professional report-card / transcript samples; filed under `docs/assets/report-cards/international/` and mapped to design patterns + template assignments below (§1.4–§1.5)
- **Status:** plan enriched (still not implemented)
- **Verify:** N/A until redesign phases

### 2026-08-03 — Wisteria quarterly templates added

- **Change:** Shipped `INTL_WISTERIA_GREEN` + `INTL_WISTERIA_NAVY` (A4 quarterly layouts from stakeholder PDFs); Academic Calendar period columns + `brandColor` chrome tint; Q1–Q4 fallback when no calendar — see `docs/WISTERIA_REPORT_CARD_TEMPLATES_PLAN.md`
- **Status:** done (additive; full 10-template redesign still outstanding)
- **Verify:** Settings → Appearance → Report card → preview Green academic / Navy bordered; live Report Card uses calendar period labels when configured

---

## 1. What’s wrong with v1

### 1.1 Too minimal

Current layouts leave large empty regions on A4:

- Sparse padding (`px-9`–`px-12`) and short subject lists with no filler rows
- Few document sections (often only header + table + one comment)
- Large decorative whitespace (especially Nordic / Primary / Executive)
- Signature blocks float with unused mid-page space when subject count is low

A real school report card is **information-dense**: identity block, period meta, grade table, scale legend, attendance grid, conduct, comments, signatures, and often a footer legal line — even when some cells are blank.

### 1.2 Does not look like a professional report-card document

v1 reads more like a **modern web card / dashboard widget** than an institutional print document:

| Anti-pattern in v1 | What real reports do |
| :--- | :--- |
| Soft rounded “app” tiles | Hard rules, boxed tables, double borders, letterhead |
| Sparse sans UI chrome | Formal letterhead + document title + serial/ref line |
| Missing grading-scale legend | Printed legend on every card (A–F, A*–G, 1–7, etc.) |
| Missing attendance / conduct panels | Small grids even if blank for ink |
| One short comment | Labeled teacher / tutor / principal comment boxes with ruled lines |
| Weak school identity | Logo + full address + phone/email + academic year + form/class |
| Generic “web” hierarchy | Clear document hierarchy: masthead → student ID strip → body tables → certification footer |

### 1.3 Curriculum authenticity is thin

Names are right (British, IB, Cambridge…) but body content does not match what those schools issue:

| Template | Expected document cues (research / industry practice) | v1 gap |
| :--- | :--- | :--- |
| British / Cambridge | Attainment + effort (or target), form tutor comment, house/year group, A*–G or 9–1 note | Effort often derived casually; no house/tutor block |
| American transcript | Weighted/unweighted GPA slots, credits, term/YTD, counselor endorsement | Fake-looking credit columns avoided → table too empty |
| IB | Criterion A–D or subject level + ATL skills + learner profile with room for notes | Chips only; no criterion columns |
| European bulletin | Dual-language labels, moyenne, appreciation column, stamped footer | Closer, but still light |
| Asia-Pacific | Class rank, subject rank vs mean, attendance days, exam series code | Partial; not dense enough |
| Primary | Learning areas + continuum + next steps + parent reply | Bands only |
| Executive | Still a **document**, not a slide — denser KPI strip + full subject appendix | Too much whitespace |

## 1.4 Visual inspiration gallery (stakeholder references)

Files live in `docs/assets/report-cards/international/`.

| # | File | Style family | What to steal |
| :---: | :--- | :--- | :--- |
| 1 | `01-color-block-report-card.png` | **Modern color-block term report** | Navy / gold / teal masthead blocks; 8-cell student identity grid; section bars (`ACADEMIC PERFORMANCE`, `TEACHER COMMENTS`, `BEHAVIOUR`); zebra subject table with highlighted average column; gold “overall average” callout; behaviour checkbox matrix; 4 signature columns |
| 2 | `02-west-river-transcript.png` | **Minimal serif transcript** | “OFFICIAL TRANSCRIPT” wordmark; dual-column course lists; thin rules (not heavy boxes); YR / CR / GR columns; GPA + grading scale + principal signature footer on one line band |
| 3 | `03-heritage-transcript.png` | **Boxed multi-year transcript** | Logo + seal; 3 equal info boxes (student / parent / enrollment); full-width grading-scale strip; **2×2 year quadrants** (Gr 9–12); NHS / GPA / testing boxes; signature lines |
| 4 | `04-oakland-term-end.png` | **Nested term table report** | Teal header bars; date badge; **nested Term 1 / Term 2** column groups (FA/SA/Total); co-scholastic table; grade-boundary strip; promotion banner; 3 signature columns with names |
| 5 | `05-st-augustin-term-marks.png` | **Classic mark sheet** | Bordered letterhead (logo + red school identity); gray title band; underlined student fields; Sr/Subject/Max/Obtained/Grade/Remarks table; total row; rank/% summary; compact grading-system table; boxed signature stamps |
| 6 | `06-evaluation-grid.png` | **Utilitarian evaluation form** | Strict black grid; student/school info boxes; attendance box; grading-scale + evaluation-code legends side by side; quartered subject matrix with comments column |
| 7 | `07-east-high-transcript.png` | **Two-column official transcript** | Crest-centered header; left: year-grouped learning experience; right stacked boxes (academic summary, grading system, graduation requirements); thin black cell borders |
| 8 | `08-matriculation-marks-sheet.png` | **Board certificate / DMS** | Serial + set codes; bilingual board title; photo slot; seal; subject marks + grade table; result/grand total; grade description legend; QR / digital-sign / verification footer (use as **visual trust markers**, not live DigiLocker) |
| 9 | `09-maclay-transcript.png` | **Dense counselor transcript** | Student \| school split info box; multi-year course table with S1/S2/Y1; watermark seal; weighted/unweighted GPA; abbreviations legend; counselor signature |

### Patterns distilled (apply across the pack)

1. **Section header bars** — solid dark strip + white caps title (refs 1, 4) beat sparse web headings.
2. **Identity as a grid, not three floating cards** — 6–8 labeled cells (refs 1, 3, 5, 9).
3. **Every card needs a printed grading scale** — strip or boxed legend (refs 3, 5, 6, 7, 8, 9).
4. **Tables with real document chrome** — thin black borders, optional zebra, highlighted total/average column (refs 1, 4, 5).
5. **Nested / multi-period headers when the calendar supports it** — Term groups or period columns (ref 4); for single-exam INTL v1, show Mark + Grade + Remark and reserve nested headers when multi-period data exists.
6. **Behaviour / co-scholastic / attendance panels** — checkbox or letter grids even if blank (refs 1, 4, 6).
7. **Transcript family ≠ term-report family** — dual-column or quadrant course layout + GPA band (refs 2, 3, 7, 9) vs full-width subject table + comments (refs 1, 4, 5).
8. **Official trust cues** — seal/crest, serial/ref line, stamp box, optional QR placeholder (refs 3, 7, 8, 9) — decorative/honest placeholders only until a real issuer exists.
9. **Signatures as a formal band** — 3–4 columns with line + role label (refs 1, 4, 5); transcripts use principal/counselor (refs 2, 9).
10. **Density without clutter** — fill A4 with structured boxes; avoid large empty canvas (all refs).

### Honesty when copying these samples

| Sample shows | Our rule |
| :--- | :--- |
| Filled GPA, rank, attendance, credits, SAT | Show labeled fields; print `—` or blank until real data exists |
| DigiLocker / live QR verify | Optional **non-functional** QR/ref placeholder or omit until PDF issuer |
| Student photo | Optional slot if photo URL exists; otherwise empty framed box or omit |
| Fake “Outstanding” on every row | Derive remark from letter/score bands or leave blank |

---

## 1.5 Map references → our 10 templates

| Our key | Primary refs | Secondary refs | Design takeaway |
| :--- | :--- | :--- | :--- |
| `INTL_STANDARD_TERM` | **1**, **5** | 4 | Color-block or classic letterhead + full subject table + behaviour + comments + 3–4 signatures |
| `INTL_BRITISH` | **4**, **5** | 1 | Teal/navy section bars; attainment table; co-scholastic or effort; grade boundaries; promotion/form tutor |
| `INTL_AMERICAN` | **3**, **9**, **2** | 7 | Official transcript: info boxes, grading scale strip, course/credit/grade density, GPA band, counselor/principal sign |
| `INTL_IB` | **7**, **6** | 1 | Boxed summary + skills/ATL side panel; criterion or level table; profile/standards checklist |
| `INTL_CAMBRIDGE` | **8**, **5** | 2 | Certificate/statement feel: serial/ref, formal table, grade legend, centre certification footer |
| `INTL_NORDIC` | **2**, **6** | 7 | Calm but **boxed** — thin rules, legends, attendance; not empty whitespace |
| `INTL_EUROPEAN` | **5**, **8** | 4 | Bulletin/mark-sheet: bilingual labels optional, totals, appreciation, stamp/sign band |
| `INTL_ASIA_PACIFIC` | **5**, **8**, **4** | 1 | High-density marks table, rank/%, grading system table, result line |
| `INTL_PRIMARY` | **1**, **6** | 4 | Warm color blocks OK; behaviour matrix; continuum/comments; parent signature |
| `INTL_EXECUTIVE` | **7**, **3** | 1 | Summary KPI boxes **plus** full academic table on same A4 (never summary-only) |

---

---

## 2. Design principles (target state)

1. **Document, not dashboard** — match reference gallery: letterhead/masthead blocks, section bars, bordered tables, legends, signature bands (see §1.4).
2. **Fill the A4** — vertical density like refs 3–9; blank subject rows and ruled comment lines when data is short.
3. **Two families** — **Term reports** (01, 04, 05) vs **Transcripts** (02, 03, 07, 09); do not force one layout on all 10.
4. **Distinct but consistent system** — shared document kit; per-template accent + column model from §1.5.
5. **Honest blanks** — never invent GPA/rank/attendance; show labeled `—` or empty cells.
6. **Print-first** — true `210×297mm`; `@page A4 portrait`; high-contrast text; no soft UI shadows in print.
7. **School branding** — logo, name, address, contacts; optional `brandColor` for header bars only; optional crest/seal slot.
8. **Trust markers (light)** — serial/ref line and stamp box where template warrants (Cambridge / Asia-Pacific); QR only as non-functional placeholder until issuer exists.

### Shared document anatomy (all 10)

Every redesigned International card **must** include, in order:

1. **Masthead** — logo, school name, address, phone/email, optional motto line  
2. **Document title** — e.g. “END OF TERM REPORT”, “STATEMENT OF RESULTS”, “OFFICIAL TRANSCRIPT”  
3. **Student identity strip** — name, ID, class/form, academic year, term/exam title, issue date  
4. **Primary academic table** — subjects + marks + letter/level (+ template-specific columns)  
5. **Grading scale legend** — compact footer-of-table or side box matching that curriculum  
6. **Secondary panels** — attendance and/or conduct (blank-ready); optional effort/ATL  
7. **Comment block(s)** — teacher; optional principal — with ruled lines if empty  
8. **Certification / signatures** — 2–3 signature lines + date; optional “official use” stamp box  
9. **Document footer** — school ref, “Page 1 of 1”, honesty note where scales are indicative  

---

## 3. Per-template redesign brief

| # | Key | Document title | Primary refs | Density / visual direction | Must-add vs v1 |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `INTL_STANDARD_TERM` | Student Report Card | 01, 05 | Navy/gold or classic letterhead; section bars; full-width bordered table | 8-cell identity grid; scale legend; behaviour matrix; gold/overall average callout; 4 sig columns |
| 2 | `INTL_BRITISH` | Term End / Academic Report | 04, 05 | Teal section bars; nested period headers when data allows | Form tutor; effort/co-scholastic; grade-boundary strip; promotion line |
| 3 | `INTL_AMERICAN` | Official Transcript | 03, 09, 02 | Boxed transcript; scale strip; course + CR + GR density | Student/school info boxes; GPA slots (`—` ok); counselor/principal; abbreviations note |
| 4 | `INTL_IB` | IB Programme Report | 07, 06 | Two-column: levels table + ATL/profile boxes | Criterion/level columns; learner profile checklist; coordinator sign |
| 5 | `INTL_CAMBRIDGE` | Statement of Results | 08, 05 | Certificate/DMS formal table; serial/ref | Centre/candidate fields; A*–G legend; certification + stamp/QR placeholder |
| 6 | `INTL_NORDIC` | Competence Progress Report | 02, 06 | Thin-rule boxes; still dense | Attendance box; evaluation codes; guardian comment — **no large empty canvas** |
| 7 | `INTL_EUROPEAN` | Bulletin / Academic bulletin | 05, 08 | Mark sheet + totals + stamp | Dual-language labels; moyenne box; appreciation; director stamp |
| 8 | `INTL_ASIA_PACIFIC` | Academic Performance Report | 05, 08, 04 | Max density marks + rank/% | Result line; grading-system mini-table; days present; dual seals |
| 9 | `INTL_PRIMARY` | Primary Progress Report | 01, 06 | Color-block but institutional | Behaviour/attitude checkboxes; next steps; parent reply |
| 10 | `INTL_EXECUTIVE` | Academic Executive Summary | 07, 03 | KPI strip **and** full subject table | Strengths/focus + complete marks + scale + sign-off |

---

## 4. Technical approach

### 4.1 Shared document kit

Extend `international/shared.tsx` (or split `documentChrome.tsx`) with reusable primitives:

- `DocMasthead`, `DocTitleBanner`, `StudentIdGrid` (6–8 cells — refs 01/03/05)
- `SectionBar` (solid dark strip + white caps — refs 01/04)
- `GradeTable` (min rows, zebra optional, highlighted avg column)
- `ScaleLegend` / `GradeBoundaryStrip` (variants: letter, Cambridge A*–G, IB 1–7, primary bands)
- `AttendanceGrid`, `BehaviourMatrix` (checkbox Excellent→Needs improvement — ref 01)
- `CommentBox` (ruled lines when empty)
- `CertFooter` / `SignatureStampRow` (3–4 columns; boxed stamps for mark-sheet family)
- `TrustStrip` optional (serial/ref, seal slot, non-functional QR placeholder)

Keep honesty helpers (`dash`, `avgScore`, band mappers).

### 4.2 File layout

```
src/features/report-cards/components/international/
  shared.tsx                 # sizes, math, honesty helpers
  documentChrome.tsx         # NEW shared document primitives
  InternationalReportCard.tsx  # switcher only
  templates/
    StandardTerm.tsx
    British.tsx
    American.tsx
    Ib.tsx
    Cambridge.tsx
    Nordic.tsx
    European.tsx
    AsiaPacific.tsx
    Primary.tsx
    Executive.tsx
```

### 4.3 Preview & print

- Keep **actual A4** preview (no scale-down).
- Settings preview mock data: **≥ 8–10 subjects** so density is visible in QA.
- Print CSS: kill shadows; force black borders; `@page { size: A4 portrait; margin: 0 }`.
- PDF download already targets `.intl-a4-page` — keep that selector.

### 4.4 Data (honesty boundary)

| Field | Source now | Plan |
| :--- | :--- | :--- |
| Subject marks / letters | Released grades | Keep |
| Average | Computed | Keep |
| GPA / rank / attendance | Optional props | Show slots; `—` if null |
| Effort / ATL / credits | Rarely in payload | Blank columns or omit numbers; do **not** invent “Exceptional” |
| Indicative IB/Cambridge maps | Client mapping from % | Keep with visible “indicative” footnote |

Phase later (optional): Academic API fields for effort, credits, attendance days — out of Phase 1–2 visual work.

---

## 5. Phased delivery

### Phase 0 — Spec lock (½ day)

- [x] Confirm anatomy checklist (§2) with stakeholder *(via reference gallery)*
- [x] Capture reference screenshots/PDFs into `docs/assets/report-cards/international/` (§1.4)
- [x] Freeze per-template column lists + primary refs (§1.5, §3)
- [ ] Optional: stakeholder picks “hero” ref per template if any conflict (e.g. American: Heritage vs Maclay)

### Phase 1 — Document chrome + Standard / British / American (2–3 days)

- [ ] Build `documentChrome.tsx` primitives
- [ ] Redesign `INTL_STANDARD_TERM`, `INTL_BRITISH`, `INTL_AMERICAN`
- [ ] Preview mocks with 10 subjects
- [ ] Visual QA: print preview + PDF download
- [ ] Tests: registry unchanged; smoke that each key still resolves

### Phase 2 — IB / Cambridge / European / Asia-Pacific (2–3 days)

- [ ] Redesign remaining secondary/exam-school templates
- [ ] Curriculum footnotes (indicative scales) consistent
- [ ] QA against §3 briefs

### Phase 3 — Nordic / Primary / Executive (1–2 days)

- [ ] Redesign without reintroducing sparse “marketing” whitespace
- [ ] Executive must include full subject table on the same A4
- [ ] Primary: continuum + parent reply; still professional (no emoji)

### Phase 4 — Polish & docs (½–1 day)

- [ ] Update Settings descriptions if labels need clarifying
- [ ] Update this plan status → done; patch `IMPLEMENTATION_STATUS.md`
- [ ] Cross-check Liberian plan International section points here for redesign status

---

## 6. Acceptance criteria

A template passes only if **all** are true:

1. On screen and print, page is recognizably an **official school report** (letterhead + tables + legend + signatures), not a UI card.
2. A4 height is substantially filled with document content (or intentional blank **ruled** areas), not large empty regions.
3. Distinct from the other nine at a glance (title, columns, chrome), but shares the document kit.
4. Missing GPA / attendance / rank never show fabricated numbers.
5. Settings preview and live report card match.
6. PDF download yields one A4 portrait page per card without clipping masthead/footer.

---

## 7. Risks & non-goals

| Risk | Mitigation |
| :--- | :--- |
| Overstuffing until unreadable | Cap font sizes; use 9–11pt body; keep 10–12mm margins |
| Reintroducing fake effort/GPA | Code review checklist; tests for “—” when null |
| Templates looking identical | Per-template title + column set + chrome accent required in QA |
| Scope creep into Liberian bifold | Explicitly out of scope |

**Non-goals:** Multi-page International booklets (unless a later plan); live IB criterion entry UI; changing Identity template keys.

---

## 8. Implementation order (recommended)

1. Chrome kit  
2. Standard → British → American (sets the bar)  
3. Cambridge → IB → European → Asia-Pacific  
4. Nordic → Primary → Executive  
5. Docs + regenerate SPA  

---

## 9. Done means

- All 10 `INTL_*` templates redesigned per §3  
- Shared document chrome in use  
- Preview/print/PDF verified on A4  
- This plan status banner → **done**; `IMPLEMENTATION_STATUS.md` updated  
- No honesty regressions
