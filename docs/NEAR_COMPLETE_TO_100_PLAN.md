# Near-complete features → 100% — Implementation plan

> **Status:** Done (2026-08-06) — Phases 1–6 implemented (excl. gradesheets + report cards per plan)  
> **Goal:** Close every documented gap in features already **~90–99% shipped**, so each domain meets its **v1 plan acceptance criteria**  
> **Explicit exclusions (complete later):** **Grade sheets** (`docs/GRADESHEET_HTML_TEMPLATES_PLAN.md` — server Puppeteer PDF, further layout work) and **all report cards** (Liberian Phases 2–5, International redesign, Wisteria polish, year-end promotion stamp on cards, server PDF issuer)  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `docs/APP_FEATURES_OVERVIEW.md`, domain `docs/*_PLAN.md`

---

## 0. Summary

| Metric | Today | After this plan |
| :--- | :--- | :--- |
| Near-complete domains (~90%+) | ~18 areas with small gaps | **100% v1 acceptance** per domain plan |
| Overall product (excl. gradesheet/report cards) | ~90% | **~97%** |
| Out of scope here | Gradesheets + report cards | Unchanged — separate epics |

**Definition of done (this plan):** Each in-scope domain passes its existing plan § acceptance checks; no decorative UI; no fetch-all on high-growth lists; docs + tests updated same session.

---

## 1. In scope vs excluded

### 1.1 In scope (near-complete → 100%)

| Domain | Current ~% | Gap to close |
| :--- | ---: | :--- |
| Auth, roles, entitlements | 98 | Legacy SA route caps; honest SA security UI |
| Admissions & onboarding polish | 85→100 | CAPTCHA UI, ClamAV hook, notifications, SA queue polish, parent hub |
| Attendance | 95 | Server pagination on session/history lists |
| Exams / online exams | 95 | Document browser lockdown limits; optional violation email |
| Class schedules + lesson plans | 95 | Pagination on long lists where applicable |
| Finance (fees, expenses, payroll) | 92 | Server pagination; optional live Stripe config path |
| Staff & HR | 95 | Server pagination on staff directory |
| Comms & notifications | 92 | Admission status producers; optional digest prefs |
| Settings | 90 | Remove or wire SA decorative toggles; inline calendar deferred stays out |
| Campus specialists v1 | 85→100 | Confirm v1 acceptance only (v2 GPS/fines/crypto = out) |
| Ops & facilities | 90→100 | Pagination on work-order/inventory lists at scale |
| Super Admin platform | 90 | Operator email invite; `requireCap` on legacy routes; impersonation-end audit |
| UI / list infrastructure | 95 | Pagination Phases 2–3 (critical directories) |
| Test & CI maturity | 50 | CI builds all domain images; HTTP smoke on PR |
| Bulk import | 75 | Phase 3 classroom column (best-effort) |
| Year transition (non–report-card) | 85→100 | Finance handoff automation; exclude report-card stamp |
| Platform / monolith | 90 | Optional `src/server` removal after one release |
| i18n SPA | 95 | Remaining EN `localeFill` leaves (not print layouts) |
| Graduation certificates v1 | 100 | **No work** — v1 plan done; bulk ZIP/server PDF stay out of scope |

### 1.2 Explicitly excluded

| Area | Reason |
| :--- | :--- |
| Grade sheet templates / dense layout / server PDF | User deferral |
| Liberian report cards Phases 2–5 | User deferral |
| International report card redesign | User deferral |
| Wisteria / quarterly report card polish | User deferral |
| Promotion outcome stamp **on report cards** | Report-card deferral |
| Server PDF issuer shared with report cards | Tied to deferred work |
| School-wide TOTP/SMS 2FA | Separate security epic (not required for v1 “honest complete”) |
| Campus v2 (GPS, library fines, E2E counselor crypto) | Post–v1 product |
| Phase C separate Postgres instances | Architecture optional |
| Historical `public` schema migration | Data migration project |
| Fee **installment schedules** (fixed tranches) | Product decision — track as optional Phase 6 |

---

## 2. Phased delivery

Recommended order: **quick wins → scale → platform → optional**.

### Phase 1 — Honest UX & admission hardening (1–2 weeks)

**Goal:** Close “looks done but isn’t” gaps without large schema work.

| # | Work | Owning service(s) | Key files / routes |
| :--- | :--- | :--- | :--- |
| 1.1 | **CAPTCHA end-to-end** — Turnstile/hCaptcha widget on `/register-school` + `/apply/:slug`; send `captchaToken`; keep existing Identity gate | identity, frontend-spa | `RegisterSchool.tsx`, `PublicApply.tsx`, `publicOnboardingController.ts` |
| 1.2 | **ClamAV async scan** — Replace `runVirusScanStub` with queue job + env `CLAMAV_URL`; block INFECTED uploads; dev fallback CLEAN | lifecycle, comms or lifecycle worker | `services/lifecycle/src/lib/storage.ts`, admission upload path |
| 1.3 | **Admission in-app notifications** — On application status transitions, call Comms internal notify when school pref `ADMISSION_STATUS` enabled | lifecycle, comms | `admissionService.ts`, notification producers pattern from attendance |
| 1.4 | **Public parent applications hub (minimal)** — Parent role: list linked students’ applications (read-only); keep token status page for anonymous | lifecycle, identity, frontend-spa | New `/{slug}/my-applications` or section under `children` |
| 1.5 | **SA registration queue polish** — `savedViewsScope` on registrations; post-approve link to `/super-admin/schools/:id` | frontend-spa, identity | `SchoolRegistrations.tsx` |
| 1.6 | **SA operator email invite** — `createOperator` sends transactional mail with temp password + login link (reuse Identity mailer) | identity | `platformOpsService.ts`, `Operators.tsx` |
| 1.7 | **SA Settings honesty** — Remove decorative 2FA/session toggles **or** wire to `PlatformSettings` with “coming soon” disabled state + docs | frontend-spa, identity | `SuperAdmin/Settings.tsx` |

**Acceptance**

- [x] Register school + public apply require CAPTCHA when `CAPTCHA_SECRET` set
- [x] Upload infected test file → rejected (`VIRUS_SCAN_FORCE_INFECTED` / ClamAV hook)
- [x] Registrar changes application status → parent/registrar sees in-app notification when pref on
- [x] Parent sees family applications when logged in (`/api/schools/:id/my-applications` on Children hub)
- [x] SA approve registration → link opens provisioned school detail
- [x] New operator receives email; can log in with temp password
- [x] SA Security tab has no fake “on” toggles

**Tests:** extend `test:onboarding`, `test:email-auth`, `test:notification-email`; new admission notification test.

**Docs:** `ONBOARDING_AND_ADMISSION_PLAN.md`, `IMPLEMENTATION_STATUS.md` §6.

---

### Phase 2 — Server pagination Phase 2 (critical directories) (2–3 weeks)

**Goal:** High-growth lists never fetch-all. Follow `docs/TABLE_PAGINATION_PLAN.md`.

| # | Surface | API change | SPA |
| :--- | :--- | :--- | :--- |
| 2.1 | **Students** | `GET …/students?page&pageSize&total` | `features/students`, `ListPagination` |
| 2.2 | **Staff** | Same envelope on staff list | `StaffManagement.tsx` |
| 2.3 | **Admissions / applications** | Lifecycle list paged | `features/registrar` |
| 2.4 | **Student records / enrollment pickers** | Reuse paged student API | enrollment, student-records |
| 2.5 | **Expenses transactions** | Finance paged ledger | `features/expenses` |
| 2.6 | **Payroll records** | Staff/finance paged | `features/payroll` |
| 2.7 | **SA Schools / Users / Registrations** | Honor `page`/`pageSize`; remove hard `take: 200` | Super Admin pages |

**Contract (all):**

```http
GET …?page=1&pageSize=50&q=…
→ { items: T[], total, page, pageSize }
```

**Acceptance**

- [ ] Network tab: Students page 2 requests only 50 rows
- [ ] Filters reset to page 1
- [ ] URL sync via existing `useListFilters`
- [ ] `npm run test:list-filters` + new contract tests per service

**Docs:** `TABLE_PAGINATION_PLAN.md` Phase 2 checkboxes; `IMPLEMENTATION_STATUS.md`.

**Rebuild:** identity, lifecycle, staff, finance, frontend-spa, api-gateway (if route passthrough changes).

---

### Phase 3 — Super Admin & audit wave 2 (1 week)

**Goal:** Platform control plane fully enforced and audited.

| # | Work | Detail |
| :--- | :--- | :--- |
| 3.1 | **`requireCap` on legacy SA routes** | `getSchools`, `getUsers`, registrations list, etc. — route through `platformOpsService` or add cap middleware |
| 3.2 | **Impersonation end audit** | `POST /api/super-admin/impersonation/end` or log on `endImpersonation` session restore | 
| 3.3 | **Capability override audit** | Log school entitlement/quota override changes (may partially exist — verify + fill gaps) |
| 3.4 | **enforce `audit.read`** | ANALYST role read-only on logs; deny others without cap |

**Acceptance**

- [ ] ANALYST cannot PATCH plans
- [ ] End impersonation → `impersonation_end` in System Logs
- [ ] `npm run test:audit-logs`, `test:super-admin-platform`

**Docs:** `SA_SYSTEM_AUDIT_LOGS_PLAN.md` Wave 2; `SUPER_ADMIN_PLATFORM_PLAN.md`.

**Rebuild:** identity, frontend-spa.

---

### Phase 4 — Comms, bulk import, year transition (1–2 weeks)

**Goal:** Close remaining ~90% domain gaps unrelated to report cards.

| # | Work | Owning | Acceptance |
| :--- | :--- | :--- | :--- |
| 4.1 | **Bulk import Phase 3** — Optional `classroomCode` column → best-effort Classroom assign post-import | identity, classroom, frontend-spa | Import with valid code assigns; invalid code warns, user still created |
| 4.2 | **Year transition finance handoff** — After commit run, deep-link or internal API to pre-filter fee batch (not just URL) | academic, finance, frontend-spa | Promoted count → fee template apply CTA with cohort pre-selected |
| 4.3 | **Attendance history pagination** | lifecycle or academic | Attendance admin views paged |
| 4.4 | **Ops WO / inventory pagination** | ops | Work orders + inventory lists paged when >50 |
| 4.5 | **Settings notification digests (optional v1)** — Per-user mute OR defer with honest “not available” copy | comms, identity | If deferred: document in Settings; no fake toggles |

**Exclude:** report-card promotion stamp (Phase 4.2 of `YEAR_TRANSITION_PLAN.md`).

**Tests:** `test:bulk-import`, `test:promotion-statement`, pagination tests.

**Docs:** `BULK_IMPORT_PLAN.md`, `YEAR_TRANSITION_PLAN.md`, `OPS_FACILITIES_PLAN.md`.

---

### Phase 5 — CI/CD & test matrix promotion (1 week)

**Goal:** Production deploy path matches runtime architecture.

| # | Work | Detail |
| :--- | :--- | :--- |
| 5.1 | **CI multi-image build** | Extend `.github/workflows/deploy.yml` to build/push all domain services + campus |
| 5.2 | **PR HTTP smoke** | Run `test:http-smoke` against compose in CI (or smoke job on main) |
| 5.3 | **Playwright promotion** | Move 1–2 persona smokes to PR gate after green nightly |
| 5.4 | **AuthZ matrix growth** | Add contract tests for Phase 2 paginated endpoints × roles |

**Acceptance**

- [ ] `deploy.yml` builds identity, lifecycle, staff, classroom, academic, finance, ops, comms, campus, gateway, frontend
- [ ] PR fails if gateway smoke fails
- [ ] Inventory check still green

**Docs:** `TEST_COVERAGE_PLAN.md`, `IMPLEMENTATION_STATUS.md` item 4.

---

### Phase 6 — Platform cleanup & optional finance (0.5–1 week)

| # | Work | Notes |
| :--- | :--- | :--- |
| 6.1 | **Monolith source removal** | Delete `src/server/`, root API Dockerfile references, `k8s/base/sms-api.yaml` after backup tag; update `MICROSERVICES_ROADMAP.md` |
| 6.2 | **Live Stripe documentation + env** | Document production keys in `docs/FINANCE_BILLING_PLAN.md` + `.env.example`; no code if console checkout sufficient for v1 |
| 6.3 | **Fee installment schedules** | **Optional** — only if product approves; otherwise mark permanently deferred in finance plan |
| 6.4 | **i18n leaf cleanup** | Run `i18n:check`; fix remaining EN leftovers in comms/settings (not print layouts) |
| 6.5 | **Campus v1 sign-off** | Re-run `test:spa-stub`, `test:parent-my-campus-auth`; close `CAMPUS_SPECIALISTS_PLAN.md` v1 acceptance |

---

## 3. Domain completion checklist (target 100%)

Use this to track after all phases:

| Domain | v1 100% criteria | Phase |
| :--- | :--- | :--- |
| Auth & entitlements | Caps on all SA routes; honest security UI | 1, 3 |
| Admissions | CAPTCHA, scan, notify, parent hub, SA polish | 1 |
| Students / staff lists | Server pagination | 2 |
| Finance lists | Expenses + payroll paged; Stripe documented | 2, 6 |
| Attendance | History paged | 4 |
| Ops | WO + inventory paged | 4 |
| Comms | Admission producers | 1 |
| Bulk import | Classroom column | 4 |
| Year transition | Finance handoff (no report-card stamp) | 4 |
| Super Admin | Invite email, audit wave 2 | 1, 3 |
| UI infrastructure | Pagination Phase 2 complete | 2 |
| CI / tests | All images + PR smoke | 5 |
| Platform | Monolith removed | 6 |
| **Grade sheets** | — | **Deferred** |
| **Report cards** | — | **Deferred** |

---

## 4. Effort estimate

| Phase | Calendar (1 dev) | Risk |
| :--- | :--- | :--- |
| 1 Admission + SA polish | 5–8 days | Low–medium (CAPTCHA provider choice) |
| 2 Pagination Phase 2 | 8–12 days | Medium (many endpoints) |
| 3 SA audit + caps | 3–5 days | Low |
| 4 Bulk import + YT + ops paging | 5–8 days | Medium |
| 5 CI + tests | 3–5 days | Medium (CI secrets) |
| 6 Cleanup + optional | 2–4 days | Low |
| **Total** | **~6–8 weeks** | Parallelizable by service |

---

## 5. Verification (full plan)

```bash
# After each phase
npm run test:unit
npm run test:spa
npm run inventory:check

# After Phase 2+
npm run test:http-smoke   # compose up

# After Phase 5
# CI green on PR

# Manual smoke
# Demo: schooladmin@yoursms.com / admin123 @ :8080
# - Students page 2 loads without full roster fetch
# - Public apply with CAPTCHA
# - SA operator invite email in console provider
# - End impersonation → log row
```

---

## 6. Documentation updates (same PRs as code)

| When | Update |
| :--- | :--- |
| Phase 1 | `ONBOARDING_AND_ADMISSION_PLAN.md`, `SUPER_ADMIN_PLATFORM_PLAN.md` |
| Phase 2 | `TABLE_PAGINATION_PLAN.md`, `IMPLEMENTATION_STATUS.md` |
| Phase 3 | `SA_SYSTEM_AUDIT_LOGS_PLAN.md` |
| Phase 4 | `BULK_IMPORT_PLAN.md`, `YEAR_TRANSITION_PLAN.md`, `OPS_FACILITIES_PLAN.md` |
| Phase 5 | `TEST_COVERAGE_PLAN.md`, `IMPLEMENTATION_STATUS.md` §4 |
| Phase 6 | `MICROSERVICES_ROADMAP.md`, `IMPLEMENTATION_STATUS.md` monolith section |
| Plan complete | This file status → **Done**; `IMPLEMENTATION_STATUS.md` item 0u refreshed; addendum `docs/REMAINING_GAPS_AND_SMOKE_PLAN.md` |

---

## 7. Change log

### 2026-08-06 — Plan authored

- **Change:** Consolidated near-complete gaps (excl. gradesheets + report cards) into six phases with acceptance, tests, and doc map.
- **Status:** draft — **awaiting user confirmation before implementation**
- **Verify:** N/A until Phase 1 lands
