# Liberian Report Card Templates — Plan

> **Status:** Phases 0–1 done; Phase 2 **partial** (client `assembleReportCardPayload` + four `LR_*` booklet pages ship; Academic `GET …/report-card` + summary upserts pending); Phases 3–5 planned (year-end promotion stamp on cards, bulk print, server PDF, more regions)  
> **Scope:** Convert Liberian paper report cards (private + public / MoE) into selectable school templates with cover + inside pages + promotion page; generate printable/PDF report cards from real grades  
> **Region:** Liberia (`LR`) only for v1. Architecture must allow later packs for US, Europe, other Africa, Asia  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `docs/ACADEMIC_GRADING_PLAN.md`, `docs/SCHOOL_SETTINGS_PLAN.md`, `docs/gradebook-architecture.md`  
> **Reference scans:** `docs/assets/report-cards/liberia/`

### 2026-08-05 — Status header corrected

- **Change:** Header now matches §8 phased delivery — Phases 0–1 done; Phase 2 partial (client booklet ships; Academic assembly API pending); Phases 3–5 planned.
- **Status:** done (documentation)
- **Verify:** Settings → Appearance → pick `LR_*` → generate report card booklet in browser

---

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Who | School Admin / Principal pick a Liberian template in Settings → Appearance; Registrar / teachers / parents generate cards from My Grades / Report Card / bulk print |
| What | Multi-page Liberian-style report cards (cover, grades matrix, optional grading-system page, promotion statement) filled from ACCEPTED / released grades |
| Calendar fit | Liberian **two-semester** cards map to Academic `SEMESTER` pattern (Periods I–VI = SEM1_P1…SEM2_P6). Three-panel private pack still uses I–VI unless school uses `THREE_TERM` |
| Honesty | No fake GPA / attendance / position / canned comments. Empty cells stay blank until grades exist |
| Future regions | Template registry keyed by `region` + `templateKey`; Liberian pack ships first; US/EU/Africa/Asia packs add later without rewriting the generator |

### 2026-07-30 — Plan authored

- **Change:** Document Liberian template inventory from school scans, page model, data contract, phased build, and regional extension model
- **Services:** academic (assembly), identity (template selection), frontend-spa (render/print), optional later PDF issuer
- **UI / API:** Settings Appearance; `/{slug}/report-card/…`; new report-card assembly API
- **Status:** draft (plan only)
- **Verify:** N/A until Phase 1+

### 2026-07-30 — Match filled class PDF (`k-2_Report_Cards.pdf`)

- **Change:** Landscape A4 bifold sheets (Promotion|Cover outer; First|Second Semester grades inside); blue pass / red fail scores; Sem Avg + Yly Avg; compact letter scale + 70% pass note; Date/STAMP + 20__/Year footer; dynamic “KINDERGARTEN PROGRESS REPORT CARD” style titles from grade label
- **Services:** frontend-spa
- **Reference:** `k-2_Report_Cards.pdf`, `docs/assets/report-cards/examples/`
- **Status:** superseded by portrait HTML reference below
- **Verify:** N/A

### 2026-07-30 — Match bifold HTML (`k-2_report_card_bifold (2).html`)

- **Change:** Portrait **A4** pages (not landscape). Page 1 outer: Promotion | Cover side-by-side bordered panels. Page 2 inside: First Semester | Second Semester — **same panel design** on both halves (grading-system box under Sem1; 70% pass note under Sem2; Sem Avg + Yly Avg; fail scores red; Average row blue). Single-student generation = one student per A4; class batch may stack two students per sheet like the HTML sample.
- **Services:** frontend-spa
- **Reference:** `k-2_report_card_bifold (2).html`
- **Status:** done
- **Verify:**
  - [ ] Preview shows **actual A4** pages (210×297mm, no scale-down); modal scrolls if needed
  - [ ] Inside halves are First|Second with matching chrome (not a single wide combined table)
  - [ ] Scores &lt; 70 render red; Average row blue when ≥ 70
  - [ ] Print uses `@page size: A4 portrait`

### 2026-07-30 — International pack (10 professional A4 templates)

- **Change:** Shipped ten distinct International single-page A4 report cards researched from common multi-curricula school practice (British/Cambridge, American transcript, IB 1–7, Nordic competence, European bulletin, Asia-Pacific exam school, Primary bands, Executive brief, plus Standard term). Settings Appearance lists all 10; preview renders **actual A4**; live `ReportCardTemplate` delegates to `InternationalReportCard`. Honest aggregates only (GPA / attendance / rank show "—" when unset).
- **Services:** frontend-spa
- **Keys:** `INTL_STANDARD_TERM` … `INTL_EXECUTIVE` (`TEMPLATE_1`–`TEMPLATE_10`)
- **Status:** done (v1) — **visual redesign required**; see `docs/INTERNATIONAL_REPORT_CARD_TEMPLATES_PLAN.md`
- **Verify:**
  - [ ] Settings → Appearance → International shows 10 cards
  - [ ] Preview each at true A4 size
  - [ ] Generate report card for a student with each selected template
  - [ ] No invented GPA / position / attendance when school has none

---

## International templates (v1)

> **Redesign:** v1 is structurally complete but visually too minimal / not document-like. Improvement plan: [`docs/INTERNATIONAL_REPORT_CARD_TEMPLATES_PLAN.md`](./INTERNATIONAL_REPORT_CARD_TEMPLATES_PLAN.md) (plan only until implemented).

| Key | Legacy | Design intent |
| :--- | :--- | :--- |
| `INTL_STANDARD_TERM` | `TEMPLATE_1` | Clean modern term report |
| `INTL_BRITISH` | `TEMPLATE_2` | Navy Cambridge-style attainment + mark |
| `INTL_AMERICAN` | `TEMPLATE_3` | US transcript grid + GPA slot |
| `INTL_IB` | `TEMPLATE_4` | IB Diploma 1–7 levels |
| `INTL_CAMBRIDGE` | `TEMPLATE_5` | Formal A*–G statement of results |
| `INTL_NORDIC` | `TEMPLATE_6` | Minimal competence / progress bars |
| `INTL_EUROPEAN` | `TEMPLATE_7` | Continental bilingual bulletin |
| `INTL_ASIA_PACIFIC` | `TEMPLATE_8` | Dense ranked exam-school table |
| `INTL_PRIMARY` | `TEMPLATE_9` | Primary skill bands (Exceeding→Beginning) |
| `INTL_EXECUTIVE` | `TEMPLATE_10` | One-page leadership brief |

Renderer: `src/features/report-cards/components/international/InternationalReportCard.tsx`

Existing report cards (`src/components/ReportCardTemplates.tsx`, `/{slug}/report-card/:examId`) are:

- Single-page modern/international layouts (`TEMPLATE_1`–`6`)
- Driven by **one exam’s** grade list, not Liberian period columns I–VI
- Settings picker lists ids that do not all match renderers (`7`, `8`, `19`)
- Defaults invent attendance / GPA / position / teacher comment
- No cover / parent-signature grid / promotion statement / MoE seals
- No Liberia-specific layouts despite Liberian school customers

Academic already has the right backbone for Liberian semester cards:

- Calendar template `SEMESTER` → S1/S2 with components **1st–6th Period + semester exams**
- `GradeEntry` + `GradeLegend` / `GradeScale`
- Schema stubs `PeriodGradeSummary` / `AnnualGradeSummary` (not yet written by the microservice path)

---

## 2. Reference inventory (Liberia v1)

Source filenames → product template keys. Scans live under `docs/assets/report-cards/liberia/`.

| Source file | Product key | Audience | Pages in scan | Promotion options |
| :--- | :--- | :--- | :--- | :--- |
| `Two_Semester_Template_1` | `LR_PRIVATE_TWO_SEM_A` | Private (Christian Martyrs–style) | Cover + Promotion | A–E (promote / probation / conditioned / repeat / do not return) |
| `Two_Semester_Template_2` | `LR_PRIVATE_TWO_SEM_B` | Private (YMCA–style) | Cover + Promotion | A–D (promote / conditioned / repeat / do not enroll) |
| `Two_Semester_Template_3_Liberian_Government_Schools` | `LR_PUBLIC_MOE_TWO_SEM` | Public / MoE senior secondary | Cover (national + MoE seals) + Promotion | A–D; Registrar + Principal |
| `Three_Semester_Template` | `LR_PRIVATE_WITH_SCALE` | Private (Christian Martyrs–style + grading chart) | Cover + **Grading System** + Promotion | A–E; Class Sponsor / Registrar / Principal + stamp |

**Naming note:** “Three_Semester” in the source filename refers to the **three-panel booklet** (cover / grading system / promotion), not a different academic calendar. Period rows remain **I–VI** (two semesters × three periods). If a school uses Academic `THREE_TERM`, inside-page columns adapt (see §5).

### 2.1 Shared Liberian page types

| Page | Purpose | Present on |
| :--- | :--- | :--- |
| **Cover** | School branding, student identity, parent/guardian period signature grid (I–VI), failure-attention note | All four |
| **Inside — Grades** | Subject × period score matrix, averages, letter, remarks, conduct/attendance | All four (**to be designed** — not in the provided cover scans) |
| **Inside — Grading system** | Letter / % / detail legend (A+…D) + policy notes | `LR_PRIVATE_WITH_SCALE` (and optional add-on for others) |
| **Back — Promotion** | Year-end certification + outcome A–D/E + official signatures / stamp / invalid-erasure note | All four |

### 2.2 Cover field map (common)

| Field | Source |
| :--- | :--- |
| School name, address, PO box, logo | Identity `School` |
| Division title (e.g. Senior High / Junior High) | Template config or grade-level band |
| Student name | Identity user |
| Class / Grade | Classroom / grade level |
| Academic year | Active calendar `schoolYearId` / label |
| Sex, County, District | Public MoE only — Identity profile / school location (county/district may need school or student fields; see open questions) |
| Period signature rows I–VI | Print blanks for wet-ink; optional digital sign-off later |

### 2.3 Promotion outcome model

Canonical enum (template config chooses which letters appear):

| Code | Meaning |
| :--- | :--- |
| `PROMOTED` | A — eligible / is promoted to grade X |
| `PROMOTED_PROBATION` | B (A-pack / scale pack) — promoted on N weeks probation |
| `CONDITIONED` | B or C — conditioned in subject(s); conditional exam next term |
| `REPEAT` | C or D — required to repeat grade |
| `DO_NOT_RETURN` | D or E — asked not to enroll / not to return |

Stored on annual summary / promotion record when registrar finalizes year-end (Phase 3). Until then, print blanks for wet-ink selection.

---

## 3. Regional template architecture (extensible)

Do **not** hard-code only Liberia forever. Introduce a **template registry** the SPA and future PDF issuer both consume.

```ts
type ReportCardRegion = "LR" | "US" | "EU" | "AFR" | "AS" | "INTL";

type ReportCardTemplateDef = {
  key: string;                 // e.g. "LR_PUBLIC_MOE_TWO_SEM"
  region: ReportCardRegion;
  label: string;
  description: string;
  audience: "PRIVATE" | "PUBLIC" | "BOTH";
  calendarAffinity: ("SEMESTER" | "TWO_TERM" | "THREE_TERM" | "ANY")[];
  pages: Array<"COVER" | "GRADES" | "GRADING_SYSTEM" | "PROMOTION">;
  promotionScheme: "A_D" | "A_E";
  branding: "SCHOOL_LOGO" | "SCHOOL_LOGO_PLUS_MOE" | "MOE_ONLY";
  // legacy bridge
  legacyId?: string;           // e.g. "TEMPLATE_1"
};
```

| Region pack | v1 | Later |
| :--- | :--- | :--- |
| `LR` Liberia | Four templates above | Elementary / JHS variants if needed |
| `US` | — | US-style semester/trimester cards |
| `EU` | — | National packs as provided |
| `AFR` | — | Other African MoE packs (GH, NG, KE, …) |
| `AS` | — | Asia packs as provided |
| `INTL` | Existing `TEMPLATE_1`… as `INTL_*` | Keep current modern cards |

**Settings UI:** group picker by region (“Liberia”, “International”, …). Persist `School.reportCardTemplate` as the **string key** (already a free string on Identity) — prefer `LR_PRIVATE_TWO_SEM_A` over opaque `TEMPLATE_19`.

**Asset convention:**

```
docs/assets/report-cards/{region}/{templateKey}_*.png   # reference scans
src/assets/report-cards/{region}/…                      # runtime seals/logos (MoE, coat of arms)
src/features/report-cards/templates/{region}/…          # React page components
```

---

## 4. Owning services

| Concern | Service | Notes |
| :--- | :--- | :--- |
| Template selection on school | **Identity** | `reportCardTemplate` string; optional `reportCardConfig` JSON later (division label, show grading page) |
| Calendar periods / components | **Academic** | Existing calendar APIs |
| Grade assembly for card | **Academic** | New `GET /api/students/:id/report-card?schoolYearId=&scope=annual\|period` |
| Period / annual summaries | **Academic** | Port compute from legacy `src/services/gradeService.ts`; upsert on accept/release |
| Grade legends | **Academic** | Existing; seed Liberian default scale option in Settings |
| Attendance % (optional) | **Lifecycle** | Soft-fail if missing |
| Branding / MoE assets | **frontend-spa** (+ Identity logo) | Public seals as static assets |
| Official PDF (Phase 4) | **Academic** or thin docs issuer | Follow Finance receipt PDF + MinIO pattern |
| SPA render / print | **frontend-spa** | Multi-page print CSS; Settings preview |

---

## 5. Data contract (report-card payload)

Assembly API returns everything a Liberian (or future) template needs — templates are dumb renderers.

```ts
type ReportCardPayload = {
  school: {
    id: string;
    name: string;
    address?: string;
    poBox?: string;
    logoUrl?: string;
    brandColor?: string;
    country?: string;
    county?: string;
    district?: string;
  };
  student: {
    id: string;
    name: string;
    sex?: string;
    classLabel: string;
    gradeLevelLabel: string;
  };
  academicYear: { id: string; label: string };
  calendar: { patternType: string; periods: Array<{ id; label; shortCode; orderIndex }> };
  // Liberian I–VI columns = flattened exam components across year, or period totals
  columns: Array<{ key: string; label: string; roman?: string }>; // I..VI (+ Exam cols if shown)
  subjects: Array<{
    subjectId: string;
    name: string;
    code: string;
    cells: Record<string, { score: number | null; letter?: string | null }>;
    average: number | null;
    letter: string | null;
    remark: string | null;
  }>;
  legend: Array<{ letter: string; min: number; max: number; detail?: string }>;
  aggregates: {
    overallAverage: number | null;
    gpa: number | null;
    classPosition: string | null;
    attendanceRate: number | null; // null if unknown
  };
  promotion: {
    outcome: string | null;
    toGrade?: string | null;
    conditionedSubjects?: string | null;
    probationWeeks?: number | null;
    remarks?: string | null;
    finalizedAt?: string | null;
  } | null;
  templateKey: string;
  generatedAt: string;
};
```

### Column mapping (Liberia semester)

| Roman | Academic component (SEMESTER template) |
| :--- | :--- |
| I | `SEM1_P1` / FIRST_PERIOD |
| II | `SEM1_P2` / SECOND_PERIOD |
| III | `SEM1_P3` / THIRD_PERIOD |
| IV | `SEM2_P4` / FOURTH_PERIOD |
| V | `SEM2_P5` / FIFTH_PERIOD |
| VI | `SEM2_P6` / SIXTH_PERIOD |

Semester exam scores may appear as extra columns on the **inside grades** page or fold into period averages — product default: show **I–VI + Sem1 Exam + Sem2 Exam + Average** on inside pages; cover signature grid stays I–VI only.

`THREE_TERM` affinity: columns become Term1 Mid/End … Term3 Mid/End (no Roman I–VI unless configured). Liberian cover copy should warn if school calendar ≠ semester.

---

## 6. Inside pages (to design — not in scans)

Provided images are **covers + promotion (+ grading chart)**. Inside subject grids are required for a usable product. Design defaults:

### 6.1 Grades matrix page

- Thick black border, serif typography (print CSS: `font-family: "Times New Roman", Times, serif`)
- Header: school name (small) + “PROGRESS REPORT” / “PERIODIC GRADES” + student/class/year
- Table:
  - Rows: subjects from offerings for student’s grade level / class
  - Columns: I–VI, (optional) Sem exams, Average, Letter, Remark
- Footer: class teacher / sponsor signature lines; “Any erasure … invalid”
- Conduct / effort row optional (blank until we have a data source)

### 6.2 Grading system page (`LR_PRIVATE_WITH_SCALE` + optional)

Default Liberian private scale from scan (editable via Grade Legends):

| Letter | % | Detail |
| :--- | :--- | :--- |
| A+ | 97–99 | Principal List |
| A | 93–96 | Honor Roll |
| A- | 90–92 | Excellent |
| B+ | 87–89 | Very Good |
| B | 83–86 | Good |
| B- | 80–82 | Satisfactory |
| C+ | 77–79 | Normal Pass |
| C | 73–76 | Fair Pass |
| C- | 70–72 | Try |
| D+ | 67–69 | Fail |
| D | 60–66 | Poor |

Policy copy: “Any grade below 70% is a failing grade.” Ship as a **seed legend** “Liberia Senior High (private)” schools can clone in Settings → Grading.

### 6.3 Public MoE cover extras

- Left: Republic of Liberia coat of arms
- Right: Ministry of Education seal (“SHOW THE LIGHT”)
- Title: `PUBLIC SENIOR SECONDARY SCHOOL REPORT CARD`
- Parent notice attributed to MoE
- Slogan footer: *Accelerated Education For Accelerated Development*
- Static SVG/PNG assets under `src/assets/report-cards/LR/` (licensed / official artwork to be supplied or redrawn)

---

## 7. UI / UX entry points

| Surface | Behavior |
| :--- | :--- |
| Settings → Appearance | Region-grouped template picker + live multi-page preview (cover / grades / promotion) |
| Settings → Grading | Optional “Apply Liberian default legend” |
| `/{slug}/report-card/:studentId` (evolve route) | Year/period scope selector → render school template (not exam-only) |
| My Grades | “Open report card” / Download PDF |
| Registrar Transcripts / Students | Bulk generate class set (Phase 3) |
| Exam details | Stop ad-hoc jsPDF; deep-link to shared generator |
| Print | `@media print` one page-break per booklet page; A4 portrait |

Keep existing International templates as `INTL_*` so non-LR schools are not broken.

---

## 8. Phased delivery

### Phase 0 — Foundations (no Liberian UI yet)

| Work | Detail |
| :--- | :--- |
| Registry | `src/features/report-cards/registry.ts` — region + keys; map legacy `TEMPLATE_n` |
| Fix Settings mismatch | Appearance list only keys that render; add Liberia group (disabled until Phase 1) |
| Honesty | Remove fake default GPA/attendance/comments from shared props (show “—” / omit) |
| Asset folder | Commit reference scans + placeholder MoE/coat-of-arms slots |
| Docs | This plan + link from `IMPLEMENTATION_STATUS.md` |

**Status:** done  
**Services:** frontend-spa

### Phase 1 — Liberian HTML templates (print-first)

| Work | Detail |
| :--- | :--- |
| Cover components | Four covers matching scans; school logo/name/address dynamic |
| Grades inside | Shared Liberian matrix page |
| Grading system | Chart page for `LR_PRIVATE_WITH_SCALE` |
| Promotion | A–D and A–E variants + signature blocks |
| Wire Settings | Select `LR_*` keys; preview all pages |
| Temporary data | Still assemble client-side from grades + calendar until Phase 2 API |

**Status:** done  
**Services:** frontend-spa (+ Identity key persistence already works)

### Phase 2 — Academic assembly API + summaries

| Work | Detail |
| :--- | :--- |
| Port summary compute | Into `services/academic`; write `PeriodGradeSummary` / `AnnualGradeSummary` on accept/release |
| `GET …/report-card` | Payload in §5; RBAC: student self, linked parent, registrar/admin/teachers of class |
| SPA switch | Report Card page consumes assembly API only |
| Calendar guard | If template affinity ≠ active pattern, show setup CTA |

**Status:** partial (client `assembleReportCardPayload` shipped; Academic `GET …/report-card` + summary upserts not yet)  
**Services:** frontend-spa (academic pending)

### Phase 3 — Year-end promotion + bulk

| Work | Detail |
| :--- | :--- |
| Promotion record | Registrar sets outcome A–E + fields; stamps card |
| Bulk PDF/print | Class / grade-level batch |
| Signatures | Optional digital `signatureUrl` (see `docs/USER_SIGNATURE_PLAN.md`) |
| Parent portal | Download issued card when released |

**Status:** planned  
**Services:** academic, identity (sigs), frontend-spa

### Phase 4 — Official server PDF (optional but recommended)

| Work | Detail |
| :--- | :--- |
| Issuer | PDFKit or Puppeteer → MinIO; SPA downloads URL |
| Snapshot | Branding + template key + payload hash like Finance receipts |
| Deprecate | html2canvas as source of truth |

**Status:** planned  
**Services:** academic (or dedicated), finance pattern reuse

### Phase 5 — Next regions

| Work | Detail |
| :--- | :--- |
| Ingest | When user supplies US / Europe / Africa / Asia scans, add `{region}` packs via same registry |
| No rewrite | New page components only; same payload + Settings grouping |

---

## 9. Roles & access

| Action | Roles |
| :--- | :--- |
| Choose template | `SCHOOL_ADMIN`, `PRINCIPAL` (Settings) |
| View / print own / child’s card | `STUDENT`, `PARENT` (linked) |
| View / print any student | `REGISTRAR`, `SCHOOL_ADMIN`, `PRINCIPAL`, academic officers, class teacher of that class |
| Finalize promotion | `REGISTRAR`, `PRINCIPAL` |
| Bulk issue | `REGISTRAR`, `SCHOOL_ADMIN` |

---

## 10. Acceptance / verify (when built)

### Phase 1

- [ ] Selecting each `LR_*` template shows cover + inside grades + promotion matching reference scans
- [ ] School logo/name/address substitute correctly; public template shows MoE + coat of arms slots
- [ ] Print produces separate pages with page breaks; serif / black-border look preserved
- [ ] International templates still selectable and render

### Phase 2

- [ ] Card columns I–VI fill from ACCEPTED / released component grades for semester calendar
- [ ] Missing grades render blank — no invented scores
- [ ] Letter/remark from school legend (or Liberian seed)
- [ ] Parent of linked student can open; unlinked parent cannot

### Phase 3+

- [ ] Promotion outcome prints only selected letter; signature lines present
- [ ] Bulk class print works for Registrar
- [ ] Server PDF (if Phase 4) verifies branding snapshot

---

## 11. Open questions (decide before / during Phase 1)

1. **Inside matrix columns:** I–VI only vs I–VI + semester exam columns?
2. **County / District / Sex** on public MoE card — store on student profile, school, or both?
3. **PO Box** — new Identity school field or free-text in `reportCardConfig`?
4. **Elementary / JHS** variants — same four layouts with different titles, or wait for more scans?
5. **Phase 4 PDF timing** — required for “official” Liberian use, or print-from-browser enough for v1?
6. **Official MoE / coat-of-arms artwork** — user-supplied high-res assets vs redrawn placeholders?

---

## 12. Explicit non-goals (v1)

- Replacing `/{slug}/reports` ops analytics hub
- Classroom assignment Marks as report-card source
- Fee-hold gating of PDF download (possible later)
- Auto-emailing cards on every period (Comms can hook later via `exam.results-released`)
- Digitizing wet-ink parent signatures on cover (print blanks first)

---

## 13. Suggested file layout (implementation)

```
src/features/report-cards/
  registry.ts
  types.ts
  api.ts
  Page.tsx                          # evolved report-card route
  components/
    ReportCardBooklet.tsx           # page-break wrapper
    pages/
      CoverPage.tsx
      GradesMatrixPage.tsx
      GradingSystemPage.tsx
      PromotionPage.tsx
  templates/LR/
    PrivateTwoSemA.tsx
    PrivateTwoSemB.tsx
    PublicMoeTwoSem.tsx
    PrivateWithScale.tsx
src/assets/report-cards/LR/
  coat-of-arms.svg
  moe-seal.svg
docs/assets/report-cards/liberia/   # reference scans (committed)
services/academic/src/services/reportCardService.ts
services/academic/src/controllers/… # GET report-card
```

Deprecate sprawl in `ReportCardTemplates.tsx` by delegating `INTL_*` there and `LR_*` to the new feature module.
