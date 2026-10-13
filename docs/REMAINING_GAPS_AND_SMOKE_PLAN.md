# Remaining gaps + manual smoke automation — Implementation plan

> **Status:** Done (2026-08-06)  
> **Goal:** Close the honest deferred items from `docs/NEAR_COMPLETE_TO_100_PLAN.md` and automate the manual smoke checklist as HTTP/contract tests (+ one Playwright PR gate).  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `docs/NEAR_COMPLETE_TO_100_PLAN.md`, `docs/TABLE_PAGINATION_PLAN.md`, `docs/TEST_COVERAGE_PLAN.md`

---

## 1. Scope

| # | Gap / checklist item | Owning service(s) | Deliverable |
| :--- | :--- | :--- | :--- |
| G1 | SPA `ListPagination` on Expenses ledger, Payroll records, SA Schools/Users | frontend-spa | Server-paged fetch + pager UI |
| G2 | Entitlement/quota override audit on `assignPlan` | identity | `entitlement_override` system log with before/after |
| G3 | Delete monolith `src/server/` + root dev scripts | platform | Vite-only dev; security tests import identity middleware |
| G4 | i18n leaf sweep | frontend-spa | `npm run i18n:check` green on critical paths |
| G5 | Playwright on PR gate | CI | One lightweight persona smoke after compose |
| S1 | Public apply/register CAPTCHA gate | identity, lifecycle | Contract: 400 without token when secret set (skip when unset) |
| S2 | Parent my-applications | lifecycle | HTTP 200 + `{ items }` envelope for parent role |
| S3 | Students/Staff page-2 pagination envelope | identity | HTTP `page=2&pageSize=1` returns ≤1 item + total |
| S4 | SA end impersonation audit | identity | POST `/impersonation/end` → log row `impersonation_end` |
| S5 | Year transition finance handoff | academic | Unit assert `financeHandoff.feesPath` contains `feeCohort=RETURNING` |
| S6 | Admission notification producer | lifecycle | Contract or unit: status transition calls notify helper (existing unit path) |

**Out of scope:** gradesheets, report cards, full Playwright matrix on every PR.

---

## 2. Phases

### Phase A — SPA pagination (G1)

**Files:** `src/features/expenses/*`, `src/features/payroll/*`, `src/pages/SuperAdmin/Schools.tsx`, `Users.tsx`

**Acceptance**

- [x] Expenses ledger requests `page`/`pageSize`; `ListPagination` visible when total > pageSize
- [x] Payroll records pass month/year/status + page to API; client q-search removed (server q if supported)
- [x] SA Schools/Users use envelope `{ items, total }`; filters reset page 1; URL sync via `useListFilters`

### Phase B — Audit + smoke (G2, S1–S6)

**Files:** `services/identity/src/services/platformOpsService.ts`, `tests/contracts/near-complete-smoke.test.ts`, `tests/contracts/policies.ts`, `tests/promotion-statement.test.ts`

**Acceptance**

- [x] `assignPlan` with entitlement/quota override logs `entitlement_override` with JSON diff
- [x] `npm run test:near-complete-smoke` passes against compose gateway
- [x] PR job runs near-complete smoke after http-smoke

### Phase C — Monolith removal + CI (G3, G5)

**Files:** delete `src/server/**`, `server.ts`, root `Dockerfile`; update `package.json`, `vite.config.ts`, `tests/security.test.ts`, `README.md`, `IMPLEMENTATION_STATUS.md`, `.github/workflows/deploy.yml`

**Acceptance**

- [x] No imports from `src/server` in repo
- [x] `npm run dev` → Vite with `/api` proxy to `:8081`
- [x] PR Playwright: school admin students page (when `E2E_ENABLED=1` in CI step)

### Phase D — i18n + docs (G4)

**Acceptance**

- [x] Critical-path EN leftovers fixed (`platformGuide`, `nav.items.plans`, `nav.items.operators` in es/fr/hi/zh-Hans); full locale parity — see `docs/I18N_LOCALE_PARITY_PLAN.md`
- [x] `IMPLEMENTATION_STATUS.md` + this plan status → Done

---

## 3. Verification

```bash
npm run test:unit
npm run test:spa
npm run i18n:check
docker compose up -d --build db db-roles identity lifecycle staff finance academic api-gateway frontend-spa
npm run test:http-smoke
npm run test:near-complete-smoke
docker compose up --build -d frontend-spa identity
```

---

## 4. Change log

### 2026-08-06 — Implemented

- **Change:** Closed remaining near-complete gaps; automated manual smoke checklist; removed monolith source.
- **Status:** Done
- **Verify:** `npm run test:near-complete-smoke` with compose; `npm run i18n:check`
