# CI PR gate vs nightly test matrix — Implementation plan

> **Status:** Partial — Phase 1–3 done (2026-08-06); tier2 nightly + full `pages.*` TM sweep ongoing  
> **Goal:** Keep PR CI **fast and reliable** (~10–15 min) while **progressively promoting** proven tests from nightly; nightly runs **full persona Playwright + expanded HTTP AuthZ matrix** without blocking every PR  
> **Companion:** `docs/TEST_COVERAGE_PLAN.md`, `tests/contracts/`, `.github/workflows/deploy.yml`, `.github/workflows/nightly-tests.yml`

---

## 0. Current state (honest, 2026-08-06)

### Pull request (`deploy.yml` → `validate-and-test`)

| Step | Runs on PR? | Notes |
| :--- | :---: | :--- |
| `npm run lint` (tsc) | ✅ | Pre-existing TS errors in unrelated files may fail — track separately |
| `inventory` + `inventory:check` | ✅ | Route drift guard |
| Compose: db, db-roles, identity, lifecycle, staff, finance, academic, api-gateway, frontend-spa | ✅ | Partial stack (no comms/campus/redis in PR job) |
| `npm run test:http-smoke` | ✅ | ~15 authZ policies |
| `npm run test:near-complete-smoke` | ✅ | Pagination, parent apps, impersonation audit, optional CAPTCHA |
| Playwright **1 test** (`--grep "school admin"`) | ✅ | `E2E_ENABLED=1`, may flake if seed/login fails |
| `npm run test:unit` | ✅ | Long suite |
| `npm run test:spa` | ✅ | Route matrix + stub honesty |

### Nightly (`nightly-tests.yml`)

| Step | Runs? | Notes |
| :--- | :---: | :--- |
| Full unit + spa + lint + inventory | ✅ | |
| Compose **full stack** (+ redis, comms, ops, classroom, campus) | ✅ | Waits for gateway |
| `test:http-smoke` only | ✅ | **Does not** run `test:near-complete-smoke` yet |
| Playwright **full** `e2e/personas/smoke.spec.ts` (7 tests) | ✅ | `CI=nightly` |
| `e2e/i18n-locale.spec.ts` | ❌ | Documented in I18N plan but not in nightly workflow |

### Gaps

| Gap | Impact |
| :--- | :--- |
| PR Playwright runs **before** unit tests and **without** waiting for SPA `:8080` | Ordering / flake risk |
| PR compose **missing comms** | Notification / document smoke policies skipped |
| Nightly missing **near-complete-smoke** | Regression gap vs PR |
| **Full persona matrix** not mapped to promotion criteria | Ad-hoc grep promotion |
| Seed login **401** in some local runs | Demo users / identity seed not idempotent after volume reuse |
| HTTP policies ≪ inventory size | AuthZ drift possible |

---

## 1. Target architecture

```text
PR (every push)                    Nightly (schedule + manual)
─────────────────                  ───────────────────────────
lint + inventory                   lint + inventory + i18n:check (critical)
unit (core)                        unit (full)
spa matrix + stubs                 spa + i18n Playwright
compose (medium stack)             compose (full stack)
http-smoke + near-complete-smoke   http-smoke + near-complete-smoke
Playwright tier-1 (2–3 tests)      Playwright tier-2 (all personas + i18n)
                                   weekly: expanded policy matrix job (optional)
```

**Rules (from TEST_COVERAGE_PLAN):**

1. **Promote only after 7 green nights** (or 14 for flaky E2E).  
2. **PR budget:** target ≤15 minutes wall time.  
3. **Fail loud:** smoke skips only when gateway down in local dev — CI must not skip seed failure silently.

---

## 2. Phases

### Phase 1 — Stabilize PR pipeline (3–5 days)

| # | Work | Files | Acceptance |
| :--- | :--- | :--- | :--- |
| 1.1 | Reorder jobs: unit + spa **before** compose; Playwright **last** | `deploy.yml` | Logical fail-fast |
| 1.2 | Add **wait-for** steps: gateway `:8081`, SPA `:8080` before HTTP/E2E | `deploy.yml` scripts | No 504 on login |
| 1.3 | Add **identity seed probe** — fail job if `schooladmin@yoursms.com` login ≠ 200 | same | No silent skip |
| 1.4 | Add `comms` to PR compose services | `deploy.yml` | Document notification policy can run |
| 1.5 | Nightly: add `npm run test:near-complete-smoke` | `nightly-tests.yml` | Parity with PR |

### Phase 2 — Playwright tier promotion (1 week)

| Tier | Tests | Gate |
| :--- | :--- | :--- |
| **Tier 1 (PR)** | school admin students, teacher classroom, parent dashboard | Required on PR after Phase 1 green |
| **Tier 2 (nightly)** | student, super admin, specialty library, negative roles | Keep nightly |
| **Tier 3 (nightly)** | `e2e/i18n-locale.spec.ts` fr/ar/zh/hi login | Add to nightly job |

| # | Work | Acceptance |
| :--- | :--- | :--- |
| 2.1 | Split `e2e/personas/smoke.spec.ts` tags: `@tier1`, `@tier2` | `npx playwright test --grep @tier1` on PR |
| 2.2 | Upload Playwright report artifact on PR failure | Debug flakes |
| 2.3 | Document promotion checklist in this plan §4 | Team process |

### Phase 3 — HTTP AuthZ matrix growth (ongoing)

| # | Work | Acceptance |
| :--- | :--- | :--- |
| 3.1 | Add policies for Phase 2 paginated endpoints (students, staff, expenses page=2) | In `tests/contracts/policies.ts` |
| 3.2 | Script: `inventory:check` diff → suggest missing policies | Optional helper script |
| 3.3 | Nightly job `test:http-smoke -- --full` or separate `test:http-authz-matrix` | Not on PR until stable |

Target: **+5 policies per sprint** until P0 routes covered (see `docs/PERMISSIONS_FIX_REPORT.md`).

### Phase 4 — Optional hardening

| # | Work |
| :--- | :--- |
| 4.1 | PR: run `npm run i18n:check` with **critical-path only** mode (exit 0 on full locale gaps) |
| 4.2 | Parallel jobs: `unit-spa` ∥ `compose-smoke` to save wall time |
| 4.3 | Cache Playwright browsers in CI |

---

## 3. Proposed `deploy.yml` job structure (sketch)

```yaml
jobs:
  static:
    steps: [lint, inventory:check]
  unit-spa:
    needs: static
    steps: [test:unit, test:spa]
  integration:
    needs: unit-spa
    if: pull_request
    steps:
      - compose up (db, db-roles, identity, lifecycle, staff, finance, comms, academic, api-gateway, frontend-spa)
      - wait gateway + spa
      - seed login probe
      - test:http-smoke
      - test:near-complete-smoke
  e2e-tier1:
    needs: integration
    steps:
      - playwright install
      - playwright test --grep @tier1
```

---

## 4. Promotion checklist (Playwright PR gate)

Before moving a test from nightly → PR:

- [ ] Passed nightly **7 consecutive days**  
- [ ] No dependency on comms/campus unless those services in PR compose  
- [ ] Runtime < 60s per test  
- [ ] Stable selectors (role/label, not brittle CSS)  
- [ ] Documented owner in `e2e/personas/smoke.spec.ts` header comment  

---

## 5. Verification commands (local)

```bash
docker compose up -d db db-roles identity lifecycle staff finance comms academic api-gateway frontend-spa
# wait…
GATEWAY_URL=http://localhost:8081 npm run test:http-smoke
GATEWAY_URL=http://localhost:8081 npm run test:near-complete-smoke
E2E_ENABLED=1 E2E_BASE_URL=http://localhost:8080 npm run test:e2e -- e2e/personas/smoke.spec.ts --grep @tier1
```

---

## 6. Documentation updates

| When | Update |
| :--- | :--- |
| Phase 1 | `docs/TEST_COVERAGE_PLAN.md` § CI table; `IMPLEMENTATION_STATUS.md` item 0d |
| Phase 2 | This plan status → Partial |
| Phase 4 | Mark test maturity ~85% → ~92% |

---

## 7. Change log

| Date | Note |
| :--- | :--- |
| 2026-08-06 | Plan authored — PR vs nightly promotion strategy |
