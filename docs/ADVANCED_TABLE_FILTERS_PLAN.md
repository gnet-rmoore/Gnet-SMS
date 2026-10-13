# Advanced table & list filters — Implementation plan

> **Status:** Phases 0–5 shipped (2026-07-31) — shared filter system + domain waves + SA polish + saved views + AND/OR logic (Logs) + ColumnFilterButton. Pagination: see `docs/TABLE_PAGINATION_PLAN.md` (Phase 0–1 done; more server paging remaining).  
> **Scope:** Ship one advanced, reusable filtering system for **every** data table and list surface in the SPA (school + Super Admin), backed by a **standard list-query contract** on domain APIs.  
> **Non-goals (v1):** Replacing matrices (gradebook / timetable) with filtered ledgers; inventing fake facets; building a separate BI tool; translating user-authored content.  
> **Companion:** `FRONTEND_GUIDELINES.md`, `docs/UI_CONSISTENCY_PLAN.md`, `docs/RESPONSIVE_UI_PLAN.md`, `docs/I18N_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **Owning surfaces:** SPA `src/components/ui` + `src/features/list-filters/**`; domain services identity / lifecycle / staff / finance / ops / academic / classroom / comms; gateway (pass-through only)  
> **Best live blueprint:** Fees Transaction history (`HistoryTab` + `listSchoolPaymentTxns`) and Roles & Access user list (`q` / `role` / `limit` / `offset`)

---

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-07-31 | Plan authored from codebase audit — no implementation yet |
| 2026-07-31 | **Phase 0 + Phase 1 partial:** `ListFilterBar`, `useListFilters`, URL serializer; Fees History/Ledger UI; Students; Role Access; Super Admin Logs; `tests/list-filters.test.ts` |
| 2026-07-31 | **Phases 2–5:** Ops/registrar/expenses/payroll/leave/WO/security; academic/comms/notifications/grade-review; SA Schools/Users/Registrations; saved views (localStorage); AND/OR logic on Logs; `ColumnFilterButton`; backend filters on staff/admissions/expenses/payroll/`getStudents`/`getFees`/`getLogs` |

---

## 0. Product intent (plain English)

Staff and Super Admins currently get **inconsistent, shallow filters**: a local search box here, a status `<select>` there, occasional date inputs, and many lists with **no filters at all** (or stub buttons that do nothing). Almost all filtering happens **in the browser after fetching the full school list**, so large campuses will hit performance and honesty walls.

**Definition of done:** On every table and every card/list queue that behaves like a table (admissions, leave, announcements, documents, exams, work orders, etc.), the user can:

1. **Find** rows with a fast search + typed advanced filters.
2. **Narrow** by status, dates, relations (classroom, grade, role, category, method…), and numeric ranges where the domain has those fields.
3. **See** active filters as removable chips, a clear match count, and an empty state that distinguishes “no data” vs “no matches.”
4. **Share / restore** the view via URL query params (and optional named presets later).
5. **Trust** that pagination, CSV export, and KPIs on that page respect the same filter set (server-side for large domains).

The UI must look Executive Slate, work in **all 7 locales including Arabic RTL**, and meet WCAG 2.2 AA for the filter chrome.

---

## 1. Current state (audit summary)

| Area | Today | Gap |
| :--- | :--- | :--- |
| Shared table kit | Hand-rolled `<table>` everywhere; `TableScroll` exists but **unused** | No `DataTable`, no TanStack Table, no shared FilterBar |
| Filter UX | Copy-pasted Search + optional `<select>` / chips; mostly **client-side** | No column filters, no URL sync, stubs on Super Admin Schools/Users |
| Server list APIs | Ad hoc `req.query`; strongest on fee txns + role-access users + payroll period | No shared list-query helper; many unused or missing params |
| Pagination | Rare (`page`/`pageSize` or `limit`/`offset`) | Most pages render entire arrays |
| Card lists | Announcements, documents, leave, exams, classrooms, work orders | Same filter *contract* needed, not only HTML tables |
| RTL / a11y | Physical `left-4` / `pl-11` / `text-left` on search rows; placeholder-only inputs | Shared bar must use logical props + real labels |

**Inventory highlights (representative):**

| Surface | Filter mode today |
| :--- | :--- |
| Students, Staff, Attendance sessions, Registrar admissions/directory | Client search (+ some status/grade) |
| Fees ledger | Client search/status/type/class |
| Fees **history** | **Server** `q` / dates / method / kind / type + page — **extend this pattern** |
| Expenses | Client (API already has `category`/`status` unused by UI) |
| Payroll | Hybrid: period server; status/name client |
| Super Admin Schools / Users / Logs | Stubs or ignored backend params |
| School registrations | Server `?status=` |

---

## 2. Design principles

1. **One contract, many domains** — same filter state shape, URL encoding, chip UI, and API query serializer everywhere; domain only supplies a **filter schema** (field defs + option loaders).
2. **Server-first for scale** — any list that can grow beyond ~100–200 rows must filter/paginate on the owning service. Client-only filtering is allowed only for tiny, already-scoped payloads (explicit allowlist).
3. **Progressive disclosure** — always-visible: search + 1–3 primary filters. Advanced panel: remaining fields, ranges, multi-selects, “Add filter.”
4. **Filters = truth** — exports, print, and page KPIs that claim to describe “this list” must use the same query. Never show a filtered table under unfiltered totals without labeling the totals “All (unfiltered).”
5. **Honesty** — no stub “Filters” buttons; no sending query params the API ignores; facet counts only when the API returns them.
6. **Executive Slate + landing-adjacent polish** — `Surface` / compact `Field` / indigo focus rings; `TableScroll` for overflow; logical Tailwind for RTL.
7. **Do not boil the ocean** — ship primitives + 2–3 reference migrations first, then wave through domains. Matrices (gradebook grids) get **row/column finders**, not full ledger filters, in a later phase.

---

## 3. Target UX (advanced)

### 3.1 Anatomy of a list toolbar

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [🔍 Search…………………]   [Status ▾] [Classroom ▾]   [Filters 3 ▾]  [Reset] │
│  Active:  Status: Paid  ×   Due: Last 30 days  ×   Class: Form 2A  ×     │
│  Showing 24 of 186 · Sorted by Due date ↓                                │
└─────────────────────────────────────────────────────────────────────────┘
│  table / card list …                                                     │
│  [← Prev]  Page 2 of 8  [Next →]   Page size [25 ▾]                      │
```

| Element | Behavior |
| :--- | :--- |
| **Search** | Debounced (250–400ms); searches configured text fields; `aria-label` + visible label (sr-only OK on dense toolbars) |
| **Primary filters** | 1–3 high-frequency fields always visible (status, period, classroom…) |
| **Filters drawer / popover** | All schema fields; sections by group; Apply + Cancel on mobile; live-apply on desktop optional (prefer Apply for multi-field to avoid thrash) |
| **Active chips** | One chip per active clause; × removes that clause; “Clear all” |
| **Result meta** | “Showing X of Y” when total known; live region `aria-live="polite"` on count change |
| **Empty** | Two copy paths: zero records in school vs zero matches (with Clear filters CTA) |
| **Sort** | Column header click or sort select; synced to URL + API `sort`/`order` |
| **Density** | Toolbar controls `compact`; table body comfortable |

### 3.2 Filter field types (schema-driven)

| Type | UI | Example domains |
| :--- | :--- | :--- |
| `text` | Search / single field | Name, email, receipt # |
| `enum` / `multiEnum` | Select or chips | Fee status, leave status, WO priority |
| `boolean` | Tri-state or Yes/No/Any | Unread only, unassigned only |
| `date` / `dateRange` | Friendly date fields + presets (Today, Last 7d, This month, This term) | Fee history, expenses, attendance, logs |
| `numberRange` | Min/max | Amount, balance |
| `relation` | Async combobox (search API) | Student, staff, classroom, grade level |
| `presence` | Is empty / is not empty | Missing photo, no classroom |

### 3.3 Advanced (Phase C+) capabilities

| Capability | Description |
| :--- | :--- |
| **Column filters** | Optional funnel icon in `thead`; opens same field control bound to that column |
| **Saved views / presets** | Named filter+sort sets per user+page (`localStorage` first; server prefs later via Identity user prefs) |
| **Facet counts** | Optional `facets: { status: { PAID: 12, … } }` from list API for chip badges |
| **Filter DSL (power users)** | Nested AND/OR groups for Super Admin Logs / finance audit only — **not** required on every school page |
| **Export with filters** | CSV/PDF endpoints accept identical query object; button disabled while filters dirty/unapplied if Apply mode |
| **Keyboard** | `/` focuses search; `Esc` closes panel; chip focus order; no mouse-only traps |

### 3.4 Surfaces in scope (“every table”)

**HTML tables (must):** Students, Staff, Fees ledger, Fees history, Expenses (transactions/budgets/ledger), Payroll records, Registrar directory, Super Admin Schools / Users / Logs / School registrations, Security logs, Attendance session lists, Ops inventory lists, any other `src/**` `<table>` list.

**Card / queue lists (must use same FilterBar):** Registrar admissions, Leave approvals, Announcements, Documents, Exams index, Classrooms index, Work orders, Notifications (where listed as a feed).

**Deferred / special:** Gradebook spreadsheet, timetable matrices, report-card layout editors, landing marketing — not “tables” in this program (optional lightweight find later).

---

## 4. Technical architecture

### 4.1 Frontend modules

| Module | Path (proposed) | Responsibility |
| :--- | :--- | :--- |
| Filter schema types | `src/features/list-filters/types.ts` | `FilterField`, `FilterState`, `ListQuery`, operators |
| URL sync | `src/features/list-filters/urlState.ts` | Encode/decode `q`, `f.*`, `sort`, `page`, `pageSize` |
| Hooks | `src/features/list-filters/useListFilters.ts` | State, debounce, dirty/apply, reset, chip model |
| Serializer | `src/features/list-filters/toSearchParams.ts` | Build `URLSearchParams` for API clients |
| UI | `src/components/ui/ListFilterBar.tsx` (+ `FilterChipRow`, `FilterPanel`, `ActiveFilterChips`) | Shared chrome |
| Table shell | `src/components/ui/DataTableShell.tsx` | Optional wrapper: `TableScroll` + sticky header + empty/loading slots |
| Domain schemas | `src/features/<domain>/listFilterSchema.ts` | Per-page field definitions + option sources |

**Dependency choice (recommend):**

- Prefer **schema-driven custom UI** (no heavy grid license) aligned with Executive Slate.
- Optionally adopt `@tanstack/react-table` **only** for headless sort/column visibility later (Phase D) — not required to ship FilterBar.
- Do **not** introduce AG Grid / MUI DataGrid.

### 4.2 Standard list query contract (backend)

Shared helper (new) in each service or a tiny shared package util (if pure TS, no React):

```ts
// Conceptual shape — implement as zod/parse helpers per service
{
  q?: string;              // free text
  filters?: Record<string, string | string[] | { min?: number; max?: number; from?: string; to?: string }>;
  sort?: string;           // field key allowlist
  order?: "asc" | "desc";
  page?: number;           // 1-based
  pageSize?: number;       // capped (e.g. 25/50/100, max 100)
}
```

**Response envelope (target):**

```ts
{
  items: T[];
  page: number;
  pageSize: number;
  total: number;           // required for “X of Y”
  facets?: Record<string, Record<string, number>>; // optional
}
```

Migrate endpoints gradually: keep backward-compatible query params (`status=`, `from=`, `to=`) as aliases of `filters` during rollout.

### 4.3 URL sync convention

Example: `/{slug}/fees?tab=history&q=ama&status=PAID&from=2026-07-01&to=2026-07-31&page=2&sort=paidAt&order=desc`

Rules:

- Filters live in the URL for shareable deep links.
- Tab keys (`tab=`) remain orthogonal.
- Replace history on debounce for `q`; push on Apply for multi-field panels (product choice: document per page).
- Ignore unknown keys (forward compatible).

### 4.4 Client vs server decision matrix

| Condition | Strategy |
| :--- | :--- |
| Typical school list > ~150 rows OR already paginated | **Server filter + pagination** |
| Tiny scoped list (e.g. one classroom roster already fetched) | Client filter OK; still use `ListFilterBar` for UX consistency |
| API already supports params UI ignores (expenses, students grade) | **Wire UI first**, then enrich |
| Stub filters (SA Schools/Users) or ignored params (SA Logs) | Fix backend + UI in same phase — no half measures |

---

## 5. Phased delivery

### Phase 0 — Foundations (primitives + contract)

| Work | Detail |
| :--- | :--- |
| Types + URL + `useListFilters` | Stable API for all pages |
| `ListFilterBar` UI | Search, primary slots, panel, chips, clear, result meta; RTL logical classes; labeled controls |
| `TableScroll` adoption | Wire into migrated tables |
| Docs | This plan + short `FRONTEND_GUIDELINES.md` § on list filters |
| i18n | `pages:filters.*` keys (search, clear, apply, filters, showingOf, noMatches, presets…) in EN then fill 7 locales |
| Tests | Unit tests for URL encode/decode + serializer; `test:ui-primitives` for FilterBar tokens |

**Exit:** Storybook-less but Story-like demo page or Fees History migrated as the **reference implementation**.

### Phase 1 — Reference migrations (prove the stack)

| Page | Service | Notes |
| :--- | :--- | :--- |
| Fees → Transaction history | finance | Already closest; refactor UI onto `ListFilterBar`; keep server query |
| Fees → Ledger | finance | Promote client filters to server (`q`, status, type, classroomId, sort, page) |
| Roles & Access users | identity | Align UI to shared bar; already has `q`/`role`/paging |
| Students | identity | Wire existing `gradeLevelId` / `feeCohort`; add `q`, status/active, page |
| Super Admin Logs | identity (or owning svc) | Implement real `level`/`module`/`q`/`from`/`to` server filters (today ignored) |

**Exit:** Five surfaces share one chrome; exports on fees history still match filters.

### Phase 2 — School operational wave

| Domain | Service | Priority filters |
| :--- | :--- | :--- |
| Staff management | identity / staff | `q`, role, active, department if any |
| Registrar admissions | lifecycle | `q`, status, grade, date range, fee cohort |
| Registrar directory | identity / lifecycle | `q`, grade, classroom, status |
| Expenses | finance | Wire existing category/status + `q`, date, amount range, page |
| Payroll records | staff | Keep period; add status + `q` server-side |
| Leave approvals | staff | `q`, status, leave type, date range |
| Work orders | ops | `q`, status, priority, assignee, date |
| Security / facility logs (school) | ops | type, severity, `q`, date |

### Phase 3 — Academic & comms wave

| Domain | Service | Priority filters |
| :--- | :--- | :--- |
| Attendance sessions / history | lifecycle | date range, classroom, status |
| Exams index | academic | `q`, status, term/period, delivery mode |
| Grade review queues | academic | status, page (extend) |
| Lesson plans | academic | Already has status/from/to — adopt shared bar |
| Announcements | comms | `q`, target role, date, pinned |
| Documents | comms | `q`, category, date, uploader |
| Classrooms | classroom / academic | `q`, grade level, teacher |
| Notifications page | comms | unread, category, date |

### Phase 4 — Super Admin + stubs + polish

| Work | Detail |
| :--- | :--- |
| SA Schools | Real `q`, status, country, plan/tier if fields exist |
| SA Users | Real role filter (remove stub button) |
| SA School registrations | Extend beyond status (`q`, date) |
| Column filters | Opt-in on dense ledgers (fees, expenses, logs) |
| Saved views | `localStorage` presets per `schoolId+path` |
| Facets | Add to fee history + admissions first |
| A11y pass | Labels, `aria-pressed` chips, focus trap in panel, live regions |
| Perf | Composite DB indexes for common filter+sort pairs per service |

### Phase 5 — Advanced power features (optional)

- AND/OR filter builder (audit/logs/finance only)
- Server-stored presets in Identity user preferences
- Bulk actions “apply to filtered selection” with explicit confirm
- CSV async export for very large filtered sets
- TanStack headless columns (visibility, pin) if product asks

---

## 6. Per-service backend checklist (template)

For each list endpoint migration:

1. **Allowlist** filter keys + sort fields (reject unknown → 400).
2. **Parse** with shared helper; clamp `pageSize`.
3. **Authorize** school scope / role (existing guards); filters must not widen access.
4. **Query** with indexes; avoid `LIKE '%q%'` full scans without limits — prefer prefix / trigram where needed.
5. **Return** `{ items, page, pageSize, total }` (+ optional `facets`).
6. **Export** route accepts same filters.
7. **Tests** — unit/integration for filter combinations + IDOR (cannot filter into another school).
8. **Gateway** — no special work if path already routed.

---

## 7. Frontend migration checklist (per page)

1. Define `listFilterSchema` (fields, primary keys, default sort).
2. Replace ad-hoc toolbar with `ListFilterBar`.
3. Wire API client to `toSearchParams(state)`.
4. Sync URL; restore on mount.
5. Wrap table in `TableScroll` / `DataTableShell`.
6. Empty + loading + error states; match count live region.
7. Ensure CSV/export uses same state.
8. Remove stub buttons / dead controls.
9. i18n keys; RTL spot-check (ar).
10. Playwright smoke: apply filter → URL updates → reload preserves → clear resets.

---

## 8. i18n / RTL / a11y requirements

| Concern | Requirement |
| :--- | :--- |
| i18n | All chrome via `pages:filters.*` (+ domain option labels existing keys); `npm run i18n:check` green |
| RTL | `ps`/`pe`/`start`/`end`/`text-start`; icon in search uses `start-3` not `left-4` |
| Labels | Every control has accessible name; chips announce removal |
| Keyboard | Full panel operable; `/` shortcut documented in UI hint once |
| Motion | Chip enter/exit subtle; respect `prefers-reduced-motion` |
| Brand | Focus rings use school brand tokens inside Layout |

---

## 9. Testing & verification

| Layer | What |
| :--- | :--- |
| Unit | URL state round-trip; serializer; pageSize clamp; schema defaults |
| UI contracts | FilterBar density/focus tokens in `test:ui-primitives` or sibling |
| Service | Filter + pagination + school isolation per migrated endpoint |
| E2E | Fees history + Students + one Super Admin list: filter, reload, clear, export |
| Manual | Arabic RTL toolbar; mobile Filter panel; 1k-row school smoke on fees |

**Verify (when Phase 1 done):**

1. Open `/{slug}/fees` → Transaction history — apply status + date range — URL + results + export agree.  
2. Students — search + grade filter survive refresh.  
3. Super Admin Logs — changing level actually changes rows (not cosmetic).  
4. `npm run i18n:check` + scoped service tests + `frontend-spa` rebuild.

---

## 10. Rollout risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Big-bang rewrite of 40 tables | Phased waves; primitives first; leave unmigrated pages on old UI until their wave |
| Breaking bookmarks | Keep alias query params for one release |
| Slow `ILIKE` search | Cap pageSize; add indexes; require min 2 chars for `q` on huge tables |
| Filter/KPI mismatch | Document “totals follow filters” or label unfiltered KPIs |
| Duplicate mobile/desktop markup debt | Single `ListFilterBar` responsive layout |
| Competing rebuilds / stale SPA | Per project rule: test → rebuild only `frontend-spa` + touched services |

---

## 11. Suggested ownership & effort (rough)

| Phase | Primary owners | Rough effort |
| :--- | :--- | :--- |
| 0 Foundations | Frontend + thin shared util | 3–5 days |
| 1 References | Frontend + Finance + Identity | 5–8 days |
| 2 Ops wave | Frontend + Finance/Staff/Ops/Lifecycle | 1.5–2.5 weeks |
| 3 Academic/Comms | Frontend + Academic/Comms/Classroom | 1–2 weeks |
| 4 SA + polish | Frontend + Identity | 4–7 days |
| 5 Power features | Optional | backlog |

---

## 12. Explicit non-goals / defer

- Rewriting gradebook cell editing into a filtered DataTable.
- Cross-school federated search for Super Admin beyond existing list endpoints.
- Natural-language “AI filter” parsing.
- Storing filters in Redis or analytics warehouses.

---

## 13. Acceptance criteria (program-level)

- [x] `ListFilterBar` + `useListFilters` + URL sync shipped and documented in `FRONTEND_GUIDELINES.md`.
- [x] Inventory tables/lists in §3.4 migrated onto shared bar (remaining polish: a few niche queues still client-only after fetch).
- [x] No Super Admin / school “Filters” stub buttons remain on migrated surfaces.
- [~] Large-list domains use server filter + `total` + pagination — **partial**: fees history, staff, students, admissions, expenses, payroll, logs strongest; many academic/comms lists still client-filter after fetch.
- [x] Exports honor filters on migrated finance history (and matching client exports where filters apply).
- [x] i18n keys for shared chrome in `en` + locale fill; RTL-safe layout tokens on bar.
- [x] Phase notes + verify steps updated in this doc when each phase ships.

---

## 14. First implementation slice (when execution starts)

1. Phase 0 primitives.  
2. Refactor Fees **HistoryTab** onto `ListFilterBar` (no behavior regression).  
3. Promote Fees **Ledger** to server filters + pagination.  
4. Fix Super Admin **Logs** backend to honor UI params.  
5. Update this plan status banner + `IMPLEMENTATION_STATUS.md` companion line to Partial/Done per phase.
