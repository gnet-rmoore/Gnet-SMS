# Full-stack test coverage by account type & service — Plan

> **Status:** Implemented (Phases 0–5 scaffold) — 2026-07-24; **PR gate expansion** — see `docs/CI_PR_NIGHTLY_TEST_GATE_PLAN.md` (draft 2026-08-06)  
> **Goal:** Systematic tests for **all school account types**, **all domain services**, **backend endpoints** (authZ + happy path), and **frontend** (route/nav + critical flows)  
> **Non-goals (this plan):** 100% line coverage vanity; Chromatic visual review; load/perf testing  
> **Companions:** `docs/PERMISSIONS_FIX_REPORT.md`, `docs/APP_FEATURES_OVERVIEW.md`, `ROLES_DOCUMENTATION.md`, `docs/UI_VISUAL_BASELINES.md`, `IMPLEMENTATION_STATUS.md`

### 2026-07-24 — Implementation landed

- **Change:** Inventories, harness, unit gaps (gateway/identity), HTTP smoke policies, SPA route/stub tests, Playwright persona scaffold, CI PR + nightly scripts.
- **Status:** done (smoke subset; full endpoint×role matrix still grows toward inventory)
- **Verify:** `npm run inventory && npm run test` ; with compose: `npm run test:http-smoke` ; E2E: `E2E_ENABLED=1 npm run test:e2e`

---

## 0. Product intent

Today’s suite (`npm run test`) is mostly **pure TypeScript rule tests** (`tsx tests/*.test.ts`) — excellent for domain logic, **weak** for:

| Gap | Reality |
| :--- | :--- |
| Live HTTP against gateway/services | Almost none (enroll/onboarding mock clients or unit-only) |
| Every role × every route | No matrix; `ROUTE_ROLES` / `ProtectedRoute` / API `requireRoles` can drift |
| Frontend behavior | `test:ui-primitives` / `test:ui-drift` only; Playwright mentioned but **not installed** |
| Specialty stubs | Pages exist; should assert empty state, not fake data regressions |

We need a **layered** program that *covers* all account types and services without pretending one E2E can hit every endpoint for every role on every PR.

### Hard rules

1. **Inventory before volume.** Generate a machine-readable list of routes/endpoints; tests map to that list (no orphan endpoints).
2. **AuthZ first.** For each endpoint: who gets **2xx**, who gets **403/401**, who gets **404** (tenant). Prefer deny tests over only happy paths.
3. **Persona smoke, not persona encyclopedia.** Full flows for ~6 primary personas; specialty roles get nav/route + one health check.
4. **Gateway is the contract.** External clients (SPA) only talk to `api-gateway` — HTTP tests hit gateway (or service-direct only for internal APIs).
5. **Honest stubs.** Library/clinic/etc. assert **StubFeaturePage** / empty copy — never assert fake KPIs.
6. **CI budget.** PR CI stays under ~10–15 minutes; nightly can run full matrix + Playwright.
7. **Match existing style** until Playwright lands: `tsx` + `assert()` harness is fine for Phases 0–2; introduce Vitest/Playwright only when justified.

---

## 1. Current state (honest)

| Layer | What exists | What’s missing |
| :--- | :--- | :--- |
| Unit / rules | security middleware, fee-scope, exam-paper, schedules, lesson-plans, role-access, permissions-fix, parent-grades, ui-drift, gateway-suffix, identity-capabilities, … | Move under `tests/unit/` later |
| HTTP / integration | `tests/contracts/http-smoke.test.ts` (skips if gateway down) | Full policy file vs 100% inventory |
| Role matrix | `tests/spa/route-matrix.test.ts` | — |
| Frontend | UI density + stub honesty + Playwright scaffold (`e2e/`) | Promote E2E to PR after nightly green |
| CI | PR: inventory + unit + spa; Nightly: + http-smoke + Playwright | Compose in PR optional later |

### Account types in scope (21+)

From `navByRole` / assignable roles:

`SUPER_ADMIN`, `SCHOOL_ADMIN`, `PRINCIPAL`, `REGISTRAR`, `VPI`, `VPA`, `TEACHER`, `STUDENT`, `PARENT`, `ACCOUNTANT`, `TRANSPORTATION`, `MAINTENANCE`, `LIBRARIAN`, `NURSE`, `COUNSELOR`, `SECURITY`, `IT_ADMIN`, `PROCUREMENT`, `ATHLETICS_DIRECTOR`, `HOSTEL_WARDEN`, `CAFETERIA_MANAGER`

### Services in scope

| Service | Port (local) | Owns |
| :--- | :--- | :--- |
| identity | 3011 | Auth, users, schools, capabilities, super-admin |
| ops | 3012 | Security logs, inventory, work orders, procurement |
| staff | 3013 | Leave, tasks, payroll hooks |
| classroom | 3014 | Rooms, posts, submissions, Socket.IO |
| academic | 3015 | Exams, grades, calendar, schedules, lesson plans |
| finance | 3016 | Fees, expenses, receipts |
| lifecycle | (compose) | Admissions, attendance, enroll saga |
| comms | (compose) | Announcements, documents, PTA, in-app notifications |
| api-gateway | 3001/8080 proxy | Path routing + auth forward |
| frontend-spa | 8080 | Role nav + ProtectedRoute |

---

## 2. Target architecture (test pyramid)

```text
                    ┌─────────────────────────┐
                    │  E2E persona smoke       │  Playwright · nightly / main
                    │  (6–8 journeys)          │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  SPA route & nav matrix │  Node · every PR
                    │  (role × path)           │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  HTTP contract + authZ   │  Compose stack · PR (smoke) / nightly (full)
                    │  gateway × roles         │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  Domain unit / rules     │  Existing tsx · every PR (expand)
                    └─────────────────────────┘
```

---

## 3. Phases

### Phase 0 — Inventory & harness (foundation) ✅

**Deliverables**

1. `scripts/inventory-api-routes.ts` → `docs/generated/api-endpoint-inventory.json`
2. `scripts/inventory-spa-routes.ts` → `docs/generated/spa-route-inventory.json`
3. `tests/helpers/` — `assert.ts`, `http.ts`, `auth.ts`, `fixtures.ts`
4. Counts live in generated JSON (byService / navEntryCount)

**Acceptance**

- [x] Inventory scripts run in CI (`inventory` + `inventory:check`)
- [x] Harness can login as seeded roles when gateway is up (`test:http-smoke`)

### Phase 1 — Backend unit coverage by service (fill gaps) ✅ (starter)

| Service | File |
| :--- | :--- |
| gateway | `tests/gateway-suffix.test.ts` |
| identity | `tests/identity-capabilities.test.ts` (+ existing role-access) |
| others | Existing domain tests remain; expand over time |

**Acceptance**

- [x] Gateway + identity dedicated scripts; wired into `test:unit`
- [x] No new runtime dependency required for unit layer

### Phase 2 — HTTP contract & authZ matrix ✅ (smoke)

- `tests/contracts/policies.ts` + `http-smoke.test.ts`
- P0: documents create deny for Teacher/Student; leave `userId` spoof; internal without JWT; auth me

**Acceptance**

- [x] P0 permission regressions over HTTP (when compose up)
- [x] `npm run test:http-smoke` documented
- [ ] ≥90% inventory endpoints in policy file — **follow-up** (smoke subset today)

### Phase 3 — Frontend: route/nav matrix + component guards ✅

- `tests/spa/route-matrix.test.ts` — nav ⊆ App roles; Counselor/calendar/onboarding regressions
- `tests/spa/stub-honesty.test.ts` — Live campus specialist pages + no fake KPI strings

**Acceptance**

- [x] `npm run test:spa` / `test:spa-route-matrix`
- [x] Stub honesty guard

### Phase 4 — Playwright persona smoke ✅ (scaffold)

- `e2e/personas/smoke.spec.ts` + `playwright.config.ts`
- Nightly / `E2E_ENABLED=1` only

**Acceptance**

- [x] Persona specs scaffolded; artifacts on failure in nightly workflow
- [x] Noted in `docs/UI_VISUAL_BASELINES.md`

### Phase 5 — Harden CI & ownership ✅

1. Scripts: `test:unit`, `test:http-smoke`, `test:spa`, `test:e2e`, `inventory*`
2. PR (`deploy.yml`): lint + inventory + unit + spa
3. Nightly (`.github/workflows/nightly-tests.yml`): + http-smoke + Playwright
4. Ownership: this plan + generated inventories

---

## 4. Commands

```bash
npm run inventory          # regenerate docs/generated/*.json
npm run inventory:check    # fail on drift
npm run test               # unit + spa
npm run test:http-smoke    # needs gateway :8081
E2E_ENABLED=1 npm run test:e2e
```

Seed users: see `services/identity/prisma/seed.ts` (`*@yoursms.com` / `admin123`, slug `demo-school`).

---

## 5. Suggested repo layout (shipped)

```text
tests/
  helpers/
  contracts/
    policies.ts
    http-smoke.test.ts
  spa/
    route-matrix.test.ts
    stub-honesty.test.ts
e2e/
  personas/smoke.spec.ts
scripts/
  inventory-api-routes.ts
  inventory-spa-routes.ts
docs/generated/
```

---

## 6. Decisions locked

| # | Decision |
| :--- | :--- |
| 1 | Commit generated inventories; CI fails on drift |
| 2 | Playwright nightly first |
| 3 | HTTP smoke needs compose; unit never |
| 4 | Specialty modules = live feature pages + nav matrix; stub guard for fake KPIs |
| 5 | Move existing tests under `tests/unit/` later |

---

## Change log

### 2026-08-04 — Campus specialist hardening (Phase 8)

- **Change:** Identity internal entitlements endpoint; `requireFeature` on Campus/Ops routes; inventory `?category=` + role-scoped UI; nav badges (library overdue, clinic today, transport drivers); CSV export on all specialist pages; platform guide + stub-honesty test updated.
- **Services:** identity, campus, ops, frontend-spa
- **Status:** done (parent/student read-only views deferred v1)
- **Verify:** `npm run test:spa-stub`; Premium-plan school can use specialist APIs; Standard plan gets `403 FEATURE_NOT_ENTITLED`

### 2026-07-24 — Implementation (Phases 0–5 scaffold)

- **Change:** Inventories, harness, gateway/identity unit tests, HTTP smoke + P0 authZ, SPA matrix/stubs, Playwright scaffold, PR + nightly CI.
- **Services:** test/docs/CI only (no domain business behavior change)
- **Status:** done (full policy coverage = follow-up)
- **Verify:** `npm run inventory && npm run test`

### 2026-07-24 — Plan created

- **Change:** Drafted full-stack test coverage plan.
- **Status:** superseded by implementation above
