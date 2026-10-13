# Test run report — 2026-07-31

> **When:** 2026-07-31 ~14:54 UTC  
> **How:** Docker `node:20-alpine` + host network + `DATABASE_URL=postgresql://sms:sms@127.0.0.1:5432/sms_db`  
> **Log:** `docs/generated/test-run-full-20260731-145426.log`

## Verdict

| Metric | Count |
| :--- | ---: |
| Suites run | 47 |
| **PASS** | **43** |
| **FAIL** | **4** |
| E2E cases executed | **0 / 20** (all skipped — gate off) |

`npm test` (`test:unit` + `test:spa`) is **not fully green** until the 4 failing suites below are fixed. Most domain unit/SPA/HTTP smoke suites **passed**.

---

## Suite status (this run)

### PASS (43)

| Suite | Script / command |
| :--- | :--- |
| security | `test:security` |
| onboarding | `test:onboarding` |
| enroll | `test:enroll` |
| country-tz | `test:country-tz` |
| db-roles | `test:db-roles` (SQL contract; live Postgres optional) |
| signature | `test:signature` |
| settings | `test:settings` |
| profile-security | `test:profile-security` |
| password-reset | `test:password-reset` |
| super-admin-directory | `test:super-admin-directory` |
| super-admin-platform | `test:super-admin-platform` |
| fee-scope | `test:fee-scope` |
| fee-partial | `test:fee-partial` |
| bulk-import | `test:bulk-import` |
| i18n (resolve) | `test:i18n` |
| guide | `test:guide` |
| email-i18n | `test:email-i18n` |
| gradebook | `test:gradebook` |
| classroom | `test:classroom` |
| schedules | `test:schedules` |
| ui-primitives | `test:ui-primitives` |
| parent-grades | `test:parent-grades` |
| online-exam | `test:online-exam` |
| exam-paper | `test:exam-paper` |
| permissions-fix | `test:permissions-fix` |
| role-access | `test:role-access` |
| public-apply | `test:public-apply` |
| gateway | `test:gateway` |
| identity-capabilities | `test:identity-capabilities` |
| school-unavailable | `test:school-unavailable` |
| error-pages | `test:error-pages` |
| list-filters | `test:list-filters` |
| global-search | `test:global-search` |
| spa-route-matrix | `test:spa-route-matrix` |
| spa-stub | `test:spa-stub` |
| http-smoke | `test:http-smoke` |
| inventory-check | `inventory:check` |
| profile-route-access | `tsx tests/profile-route-access.test.ts` |
| avatar-photo-sync | `tsx tests/avatar-photo-sync.test.ts` |
| report-card-liberia | `tsx tests/report-card-liberia.test.ts` |
| subject-offering-links | `tsx tests/subject-offering-links.test.ts` |
| receipt-pdf-i18n | `tsx tests/receipt-pdf-i18n.test.ts` |
| e2e (exit 0) | `playwright test` — **all 20 skipped** |

### FAIL (4)

| Suite | Why |
| :--- | :--- |
| **lesson-plans** | Status label assertions: `SUBMITTED` / `APPROVED` labels mismatch current copy |
| **ui-drift** | `shadow-sm` drift **4 > 0**; `text-[10px]` drift **14 > 0** |
| **responsive** | Bare `grid-cols-2..6` outside allowlist (5 hits: landing Hero/Footer/previews + `Login.tsx`) |
| **i18n:check** | 6 locales each leave English on critical keys: `common.platformGuide`, `nav.items.plans`, `nav.items.operators` |

---

## Still remaining (not green / not really run / not yet built)

### A. Fix failing suites (blocking green CI)

1. **`test:lesson-plans`** — align status labels with i18n / domain enum display strings.  
2. **`test:ui-drift`** — remove or allowlist remaining `shadow-sm` / `text-[10px]` (see `docs/UI_VISUAL_BASELINES.md`).  
3. **`test:responsive`** — fix or allowlist grid classes on landing + Login.  
4. **`i18n:check`** — translate `platformGuide`, `nav.items.plans`, `nav.items.operators` in fr/es/de/ar/zh-Hans/hi (or rebuild locale packs).

### B. E2E not actually executed (20 skipped)

Playwright suites require `E2E_ENABLED=1` (or CI nightly). This run exited PASS with **0 assertions**.

Remaining to run for real:

```bash
E2E_ENABLED=1 E2E_BASE_URL=http://localhost:8080 npx playwright test
```

| Spec file | Cases (approx.) |
| :--- | :--- |
| `e2e/i18n-locale.spec.ts` | Login locale FR/AR/ZH/HI |
| `e2e/landing.spec.ts` | Landing + locale switch |
| `e2e/personas/smoke.spec.ts` | Admin/teacher/student/parent/SA + negative roles + library stub |
| `e2e/platform-guide.spec.ts` | Guide hub / deep link / personas |
| `e2e/sidebar.spec.ts` | Sidebar expand/collapse |

### C. Orphan unit files (exist, not in `npm test` / `test:unit`)

These **passed** when run manually, but are easy to forget in CI:

| File | Suggested script |
| :--- | :--- |
| `tests/list-filters.test.ts` | has `test:list-filters` — **not** in `test:unit` |
| `tests/global-search-labels.test.ts` | has `test:global-search` — **not** in `test:unit` |
| `tests/profile-route-access.test.ts` | no npm script |
| `tests/avatar-photo-sync.test.ts` | no npm script |
| `tests/report-card-liberia.test.ts` | no npm script |
| `tests/subject-offering-links.test.ts` | no npm script |
| `tests/receipt-pdf-i18n.test.ts` | no npm script |

### D. Coverage gaps still open (from `docs/TEST_COVERAGE_PLAN.md`)

Not missing *files* — missing **depth**:

| Gap | Status |
| :--- | :--- |
| Full gateway endpoint × role authZ matrix vs inventory | Smoke policies only (`test:http-smoke`) |
| Specialty persona E2E beyond library stub | Partial / gated |
| Live DB role isolation inside CI container | Optional (`docker compose exec`); skipped without Docker CLI in test container |
| Chromatic / visual regression | Out of scope by plan |
| Load / perf | Out of scope |
| Error-page / 500 runtime E2E | Unit wiring only (`test:error-pages`); no Playwright coverage |
| Suspended-school login E2E | Unit helpers only |

---

## How to reproduce

```bash
# Unit + SPA (needs DATABASE_URL if anything imports src/lib/prisma)
DATABASE_URL='postgresql://sms:sms@127.0.0.1:5432/sms_db?schema=public' npm test

# Extras not always in npm test
npm run test:list-filters
npm run test:global-search
npm run test:http-smoke
npm run i18n:check
npm run inventory:check

# Real E2E
E2E_ENABLED=1 npm run test:e2e
```

---

## Note on first attempt

A run **without** `DATABASE_URL` failed immediately on `test:security` (`src/lib/prisma.ts` FATAL). Always set a Postgres URL when running the suite from a clean Node container.
