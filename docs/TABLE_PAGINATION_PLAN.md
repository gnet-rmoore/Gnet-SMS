# Table pagination — Implementation plan

> **Status:** Phase 0–1 shipped (2026-07-31) — shared `ListPagination` + Fees History/Ledger, SA Logs, Role Access, Grade Review, Notifications. Phase 2+ (Students/Staff/Registrar/…) remaining.  
> **Goal:** Every list/table loads data **in segments** (server `page` + `pageSize` + `total`), not fetch-all then render.  
> **Non-goals:** Gradebook matrices, report-card PDFs, calendars/timetables, landing, tiny self-scoped portal lists (parent children, own payroll stub).  
> **Companion:** `docs/ADVANCED_TABLE_FILTERS_PLAN.md` (filters already ship `page`/`pageSize` in URL; pagination UI still missing on most surfaces)  
> **Owning surfaces:** SPA `ListPagination` + `useListFilters`; identity / staff / finance / lifecycle / ops / academic / classroom / comms; gateway pass-through  
> **Default page size:** `50` (existing `DEFAULT_PAGE_SIZE`); options `25` / `50` / `100` (`MAX_PAGE_SIZE`)

---

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-07-31 | Plan authored from inventory — no implementation yet |
| 2026-07-31 | **Phase 0–1 shipped:** `ListPagination` + `paginate.ts`; History/Logs refactored; Fees Ledger `useFeesLedgerQuery`; Role Access limit/offset pager; Grade Review page/limit; Notifications envelope (`page`/`offset` + total) on comms |

---

## 0. Product intent

Today only a few surfaces truly page on the server (Fees History, SA Logs, SA SchoolDetail tabs). Most directories **download the full school list**, then filter in the browser. That fails at scale and matches the user’s ask: load **segments**, not everything in one go.

**Definition of done:** For each in-scope table:

1. API returns `{ items, total, page, pageSize }` (or equivalent `limit`/`offset` + `total`).
2. UI requests only the current page.
3. Shared pager (Prev / Next / “Showing X–Y of Z” / optional page-size) under the table.
4. URL keeps `page` + `pageSize` via existing `useListFilters` where the page already uses it.
5. Changing search/filters resets to page 1.

---

## 1. Shared contract

### API (preferred)

```
GET …?q=&…filters&page=1&pageSize=50
→ { items: T[], total: number, page: number, pageSize: number }
```

Alternate already used: `limit` + `offset` + `total` (Roles & Access). SPA normalizes either shape.

### SPA primitive (new)

| Piece | Path | Role |
| :--- | :--- | :--- |
| `ListPagination` | `src/components/ui/ListPagination.tsx` | Prev/Next, range label, optional page-size select; i18n `pages:listFilters.*` |
| Helper | `src/features/list-filters/paginate.ts` | `sliceClient` (fallback only), `pageRangeLabel(total, page, pageSize)` |
| Export | `src/components/ui/index.ts` | Re-export |

Reuse Fees History / SA Logs footer pattern — one component, no one-off bars.

---

## 2. Phases

### Phase 0 — Shared UI + tests (1 pass)

- [x] `ListPagination` + unit tests (`tests/list-filters.test.ts` paginate helpers)
- [x] Refactor Fees History + SA Logs to use it (behavior unchanged)

### Phase 1 — Wire APIs that already page (server, UI only)

| Surface | Files | Notes |
| :--- | :--- | :--- |
| Fees Ledger | `useFeesLedgerQuery` + `LedgerTab` | **Done** — `page` always sent; classroom filter still client on current page |
| Role Access users | `role-access/Page.tsx` | **Done** — `limit`/`offset` + pager |
| Grade review queues | `grade-review/Page.tsx` | **Done** — honors `page`/`limit` + pager |
| Notifications | `notifications` + `comms` | **Done** — paged envelope when `page`/`offset`/`paged` set |

### Phase 2 — High-growth school directories (server + UI)

| Surface | Service | Work |
| :--- | :--- | :--- |
| Students | identity / lifecycle (confirm owning list endpoint) | Add `page`/`pageSize`/`total` to list students; SPA slice request |
| Staff | staff / identity | Same |
| Registrar directory + admissions | identity / lifecycle | Same for students + applications |
| Student records / Transcripts / Enrollment pickers | same student list API | Reuse paged student list (no duplicate full fetch) |
| Expenses transactions | finance | Add pagination envelope |
| Payroll records | staff / finance | Add pagination envelope |
| Attendance sessions | classroom / academic | Add pagination envelope |
| SA Schools / Users / Registrations | identity | Honor `page`/`pageSize`; SA Users currently ignores and `take: 200` |

### Phase 3 — Medium queues (server or justified client)

Announcements, documents, exams, classrooms, lesson plans, online exams, leave, work orders, maintenance inventory, procurement, security logs, PTA, curriculum subjects, SA Operators / Plans school lists.

- Prefer **server** if count can exceed ~150 per school.
- Allow **client-slice only** when the domain is small by design (e.g. classrooms per school) — still show `ListPagination` so UX is consistent; document the exception in this plan.

### Phase 4 — Docs + inventory

- [ ] Update this plan status + `IMPLEMENTATION_STATUS.md`
- [ ] Cross-link from `ADVANCED_TABLE_FILTERS_PLAN.md` § pagination polish → Done/Partial
- [ ] Regenerate SPA/API inventories if routes/contracts change

---

## 3. Explicit exclusions

- Gradebook / period sheets, report-card templates, print/PDF layouts
- Calendar month grids, class schedule grids, landing
- Parent “Children” (tiny), staff-portal self attendance/payroll when already self-scoped to one user
- Modal wizards with short option lists

---

## 4. Acceptance checks

- [ ] Opening Students / Staff / Fees Ledger / SA Schools never downloads the entire unpaged collection when totals exceed `pageSize`
- [ ] Network tab shows `page`/`pageSize` (or `limit`/`offset`) changing on Next
- [ ] Empty state distinguishes no data vs no matches vs empty page (clamp page if filters shrink total)
- [ ] i18n: showing / prev / next work in en + existing locale keys
- [ ] Relevant unit/contract tests green; rebuild only touched services + `frontend-spa`

---

## 5. Recommended first ship (after approval)

**Approve → implement Phase 0 + Phase 1 in one PR**, then Phase 2 directories in follow-up PRs (students → staff → fees ledger → SA lists).

Do **not** ship client-slice-only for Students/Staff/Fees/SA Users — that would still load all data and contradict “segments.”

---

## 6. Verify

```bash
# After Phase 0–1
npm run test   # or scoped list-filters / fees / role-access tests
docker compose up --build -d frontend-spa finance identity staff   # as touched

# Manual
# Fees Ledger / History / Role Access / Grade Review: change page, confirm request params + row count ≤ pageSize
```
