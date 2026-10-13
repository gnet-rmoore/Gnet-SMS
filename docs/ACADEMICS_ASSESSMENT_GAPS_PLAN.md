# Academics & assessment — gap closure plan

> **Status:** In progress (2026-08-06) — Sprint A shipped (exams/lesson plans paging, proctor email, lockdown callout, year-transition grades link)  
> **Goal:** Close **95% → 100%** items in daily academic ops; treat **grade sheets (~75%)** and **report cards (~55%)** as **separate deferred epics** with their own phases (not blocking “core academics 100%”)  
> **Companion:** `docs/TABLE_PAGINATION_PLAN.md`, `docs/YEAR_TRANSITION_PLAN.md`, `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md`, `docs/LIBERIAN_REPORT_CARD_TEMPLATES_PLAN.md`, `docs/INTERNATIONAL_REPORT_CARD_TEMPLATES_PLAN.md`, `docs/ONLINE_EXAMS_PLAN.md`, `IMPLEMENTATION_STATUS.md`

---

## 0. Executive map

| Area | ~% | Category | Plan section |
| :--- | ---: | :--- | :--- |
| Curriculum, classrooms, schedules, lesson plans | 95 | **Ship in this plan** — Phase 3 pagination | §1 |
| Gradebook + grade review + edit grants | 95 | **No code** — confirm mature; matrix unpaged by design | §2 |
| Exams + online exams + paper approval | 95 | **Small ship** — proctor email + lockdown doc | §3 |
| Year transition + promotion statement | 95 | **Small ship** — promotion stamp deferred to report-card epic | §4 |
| Graduation certificates v1 | 100 | **Done** — bulk ZIP / server PDF out of scope | §5 |
| Grade sheets | ~75 | **Deferred epic** — server Puppeteer PDF + polish | §6 |
| Report cards (all templates) | ~55 | **Deferred epic** — redesign + server issuer + LR Phases 2–5 | §7 |

---

## 1. Phase 3 pagination — long academic lists (95% → 100%)

**Problem:** `docs/TABLE_PAGINATION_PLAN.md` Phase 3 lists exams, lesson plans, classrooms, curriculum subjects, online exams. Students/Staff/Exams filter bars exist on some surfaces, but **server paging + `ListPagination`** is inconsistent; several pages still fetch full collections.

### 1.1 Inventory (current)

| Surface | API paging today | SPA paging today | Priority |
| :--- | :--- | :--- | :---: |
| **Exams** | Confirm academic list endpoint | `savedViewsScope` only; no `ListPagination` | P1 |
| **Lesson plans** | Confirm staff/academic route | Full fetch | P1 |
| **Classrooms** | Full list per school (often <150) | Full fetch + full student fetch for roster | P2 |
| **Curriculum subjects / syllabi** | Full fetch | Full fetch | P2 |
| **Online exams (school list)** | Confirm | Results/take excluded | P3 |
| **Class schedules** | Grid-first; list export secondary | Document exception | P4 |

**Rule:** Prefer **server** `{ items, total, page, pageSize }` when count can exceed ~150/school. For classrooms (typically small), allowed exception: client pager on fetched page **only if** documented + student picker uses paged API (see onboarding plan §1.4).

### 1.2 Work packages

| # | Deliverable | Service | Key files |
| :--- | :--- | :--- | :--- |
| L1 | **Exams list API + UI** — add/confirm `page`/`pageSize` on `GET /api/schools/:id/exams`; wire `ListPagination` | academic, frontend-spa | `services/academic/...`, `src/features/exams/Page.tsx` |
| L2 | **Lesson plans** — same envelope on list endpoint; SPA pager | staff or academic, frontend-spa | `src/features/lesson-plans/Page.tsx` |
| L3 | **Curriculum** — paged subjects/syllabi queues where list > 50 | academic, frontend-spa | `src/features/curriculum/Page.tsx` |
| L4 | **Classrooms** — if API unchanged, at minimum paged **student pickers**; optional classroom pager when API adds paging | classroom, frontend-spa | `src/features/classrooms/Page.tsx` |
| L5 | **Docs** — update `TABLE_PAGINATION_PLAN.md` Phase 3 checkboxes | docs | |

**Acceptance**

- [ ] Exams + lesson plans: network tab shows `page` changing; row count ≤ `pageSize`
- [ ] No regression on exam detail / online take / gradebook matrices
- [ ] Phase 3 rows marked Partial/Done in pagination plan

**Estimate:** 1–2 weeks (1 dev), surface-by-surface PRs.

---

## 2. Gradebook + grade review + edit grants (95% — confirmation only)

**Status:** Mature for v1. Period sheets and review queues already honor paging where needed (`grade-review/Page.tsx`).

| Item | Decision |
| :--- | :--- |
| Gradebook matrix | **Intentionally not paged** — one class × period grid; scroll/matrix hint UX only |
| Grade review | Done per pagination plan Phase 1 |
| Grade edit access grants | Done — `docs/GRADE_EDIT_ACCESS_GRANT_PLAN.md` |

**This plan:** No implementation phase. Update `IMPLEMENTATION_STATUS.md` to mark “95% → 100%” as **done (by design)** unless product requests alternate mobile layout.

---

## 3. Exams + online exams + paper approval (95% → 100%)

### 3.1 Shipped (do not redo)

- Exam paper approval workflow — `docs/EXAM_PAPER_APPROVAL_PLAN.md`
- Online exam kiosk — `docs/ONLINE_EXAMS_PLAN.md` (fullscreen, violations, auto-submit, parent notify on submit)

### 3.2 Still open

| # | Deliverable | Service | Key files |
| :--- | :--- | :--- | :--- |
| O1 | **Proctor violation email (optional)** — when `violationCount` reaches threshold or auto-submit fires, email exam author / school admin (env-gated, console provider OK) | academic, comms via identity mail | violation handler in online exam attempt service, `notify` helper |
| O2 | **Lockdown limits doc** — honest “browser best-effort” section in help/API docs: no OS kiosk, clipboard/OS screenshot not blocked, accessibility tradeoffs | docs, optional SPA help | `docs/ONLINE_EXAMS_PLAN.md` §limitations, `src/features/online-exam/` take screen footer |

**Acceptance**

- [ ] Violation auto-submit triggers optional email when `ONLINE_EXAM_PROCTOR_EMAIL=1`
- [ ] Online exam take UI links to limitations doc (or inline callout)

**Estimate:** 2–4 days.

---

## 4. Year transition + promotion statement (95% → 100%)

### 4.1 Shipped

- Opening census, promotion runs, draft/commit, printable promotion statement — `docs/YEAR_TRANSITION_PLAN.md`
- Finance handoff deep-link with `feeCohort=RETURNING` — done (near-complete smoke)

### 4.2 Still open (cross-epic)

| # | Deliverable | Owner | Notes |
| :--- | :--- | :--- | :--- |
| Y1 | **Promotion outcome on report cards** — stamp pass/repeat/graduate on LR/INTL booklet `PromotionPage` from year-transition data | frontend-spa + academic API | **Deferred to §7** (report-card epic); do not block year-transition “100%” for ops users |
| Y2 | **Statement ↔ report card cross-link** — optional UI link from promotion statement row to student report card (read-only) | frontend-spa | Small; can ship independently |

**Acceptance (Y2 only in this plan)**

- [ ] Promotion statement row links to existing report card route when student + year known

**Estimate:** 1–2 days for Y2; Y1 bundled with report-card epic.

---

## 5. Graduation certificates v1 (100%)

**Status:** Done — `docs/GRADUATION_CERTIFICATES_PLAN.md`.

**Explicitly out of scope:** bulk cohort ZIP export, server Puppeteer PDF, digital signature/QR authenticity.

No work in this plan unless product reopens scope.

---

## 6. Grade sheets deferred epic (~75% → target 100%)

**Shipped today:** HTML print templates (classic A4, mastery A4, official Legal), dense multi-page layout, Settings picker — `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md` (status Done for HTML pass).

### 6.1 Remaining for “100% gradesheets”

| Phase | Work | Acceptance |
| :--- | :--- | :--- |
| **GS-A** | **Server PDF issuer** — Puppeteer/Chromium service (or reuse finance receipt PDF pattern) for `GET …/gradesheet.pdf` | Download matches browser print; tenant branding |
| **GS-B** | **Batch print** — select class/year → queue PDFs (ZIP optional) | Registrar can print cohort without N clicks |
| **GS-C** | **Template polish** — Legal template `@page` audit; accessibility of dense mode | Stakeholder sign-off on 17-subject sample |

**Estimate:** 2–4 weeks (separate epic PR series).

**Companion doc:** extend `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md` §“Path 2 server PDF” into phased checklist when epic starts.

---

## 7. Report cards deferred epic (~55% → target 100%)

**Shipped today:** LR booklet (4 pages client-side), 10 INTL A4 packs + 2 Wisteria quarterly layouts, client print/PDF via browser.

### 7.1 Remaining work (consolidated)

| Phase | Work | Primary doc |
| :--- | :--- | :--- |
| **RC-A** | **International visual redesign** — all 10 `INTL_*` templates document-grade fidelity | `docs/INTERNATIONAL_REPORT_CARD_TEMPLATES_PLAN.md` |
| **RC-B** | **Liberian Phases 2–5** — Academic `GET …/report-card` assembly; server summary upserts; batch print | `docs/LIBERIAN_REPORT_CARD_TEMPLATES_PLAN.md` |
| **RC-C** | **Promotion stamp** — year-end outcome on report card ( ties §4.2 Y1 ) | `YEAR_TRANSITION_PLAN.md` + LR booklet |
| **RC-D** | **Server PDF issuer** — unified with gradesheet PDF service | New `docs/REPORT_CARD_PDF_ISSUER_PLAN.md` (create when epic starts) |

**Estimate:** 4–8 weeks (design + implementation); not part of “core academics 95→100” sprint.

---

## 8. Recommended execution order

### Sprint A — “Core academics 100%” (2–3 weeks)

1. §1 Pagination Phase 3 (exams, lesson plans, curriculum)  
2. §3 Online exam proctor email + lockdown doc  
3. §4.2 Y2 promotion statement → report card link  

### Sprint B — Deferred epics (parallel tracks)

- **Track GS:** §6 grade sheet server PDF  
- **Track RC:** §7 report card redesign + server issuer (RC-A before RC-D)

---

## 9. Verification

```bash
npm run test:unit
npm run test:http-smoke
# After pagination:
npm run test:near-complete-smoke
docker compose up --build -d academic staff classroom frontend-spa
```

**Manual**

- Exams / lesson plans: pager + filters + URL sync  
- Online exam: trigger violations → optional email; read limitations callout  
- Promotion statement: link opens report card for student  
- Gradebook: unchanged matrix behavior  

---

## 10. Documentation updates (when coding starts)

| Doc | When |
| :--- | :--- |
| `docs/TABLE_PAGINATION_PLAN.md` | After §1 |
| `docs/ONLINE_EXAMS_PLAN.md` | After §3 |
| `docs/YEAR_TRANSITION_PLAN.md` | After §4.2 Y2 (Y1 with RC epic) |
| `IMPLEMENTATION_STATUS.md` | Link this plan under honest gaps |
| `docs/APP_FEATURES_OVERVIEW.md` | Note pagination + deferred epics split |

---

## 11. Change log

| Date | Note |
| :--- | :--- |
| 2026-08-06 | Plan authored — splits 95% polish vs gradesheet/report-card deferred epics |
