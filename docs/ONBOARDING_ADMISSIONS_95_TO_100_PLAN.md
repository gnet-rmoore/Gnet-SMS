# Onboarding & admissions — 95% → 100% plan

> **Status:** In progress (2026-08-06) — Phase A–D partial; ClamAV compose sidecar documented via env  
> **Goal:** Close the remaining onboarding/admission polish gaps without re-litigating shipped v1 flows  
> **Companion:** `ONBOARDING_AND_ADMISSION_PLAN.md`, `docs/TABLE_PAGINATION_PLAN.md`, `docs/NEAR_COMPLETE_TO_100_PLAN.md`, `IMPLEMENTATION_STATUS.md`

---

## 0. Honest baseline (code audit 2026-08-06)

Several items in older gap tables are **already shipped** or **partially shipped**. This plan targets only what is still missing.

| Area | Claimed ~% | Already shipped (verified) | Still open |
| :--- | ---: | :--- | :--- |
| **Public register school + apply** | 95 | Turnstile widget on `/register-school` + `/apply/:slug`; backend `assertCaptcha` on both Identity + Lifecycle; public apply status token page | ClamAV **service** in compose + scan adapter contract; optional fail-closed when scan unavailable; prod Stripe keys runbook |
| **Registrar admissions hub** | 95 | `notifyAdmissionStatusChange` on status transitions; parent read-only list on `/{slug}/children` via `GET …/my-applications` | i18n + nav polish; optional dedicated `/{slug}/my-applications` route; richer status copy / deep links |
| **SA registration queue** | 95 | `savedViewsScope="platform:registrations"`; API `{ items, total, page, pageSize }`; approve toast footer link to school | `ListPagination` UI; wire `total` from API (not `rows.length`); persistent **Open school** CTA in credentials banner + drawer |
| **Enrollment / student records** | 95 | Students directory server-paged (`useStudentsQuery` + `ListPagination`) | Enrollment + classroom member pickers still `GET …/students` full list; registrar pipeline still fetch-all applications |

**Out of scope:** operator email invite, logged-in parent editing applications, new admission state machine rules, live Stripe checkout implementation (env/ops only).

---

## 1. Scope by workstream

### 1.1 Public onboarding hardening (Identity + Lifecycle + compose)

| # | Deliverable | Owning service(s) | Key files |
| :--- | :--- | :--- | :--- |
| P1 | **ClamAV sidecar** — optional `clamav` service in `docker-compose.yml`; REST adapter documented (`CLAMAV_URL`, `POST /scan { key }`) | lifecycle, ops/infra | `services/lifecycle/src/lib/storage.ts`, `docker-compose.yml`, `.env.example` |
| P2 | **Scan policy** — env `VIRUS_SCAN_FAIL_OPEN=false` (default dev true) → reject upload when ClamAV unreachable; keep `VIRUS_SCAN_FORCE_INFECTED` for tests | lifecycle | `storage.ts`, `admissionService.ts` confirm path |
| P3 | **CAPTCHA env parity doc** — document paired `CAPTCHA_SECRET` + `VITE_TURNSTILE_SITE_KEY`; CI contract already covers register-school | identity, lifecycle, frontend-spa | `.env.example`, `README.md`, `tests/contracts/near-complete-smoke.test.ts` |
| P4 | **Live Stripe (ops)** — document that school fee checkout uses mock/console until `STRIPE_*` set; no code change required for “100% onboarding” | finance, docs | `docs/FEE_*` or `ONBOARDING_AND_ADMISSION_PLAN.md` §ops |

**Acceptance**

- [ ] With `CLAMAV_URL` set + infected fixture → confirm returns `INFECTED` and application doc rejected
- [ ] With `VIRUS_SCAN_FAIL_OPEN=false` and ClamAV down → upload blocked with honest error (not silent CLEAN)
- [ ] Register-school + apply show Turnstile when site key set; backend rejects missing token when secret set
- [ ] Contract tests green: `npm run test:near-complete-smoke`

---

### 1.2 Registrar hub + parent visibility (Lifecycle + SPA)

| # | Deliverable | Owning service(s) | Key files |
| :--- | :--- | :--- | :--- |
| R1 | **Parent applications UX** — i18n keys for Children hub section; status labels map to `admissionStates`; optional link to public status page when token exists | frontend-spa | `src/pages/School/Children.tsx`, `src/i18n/catalogs/en.ts` |
| R2 | **Optional route** — `/{slug}/my-applications` (Parent) reusing same API; nav item under My Children or cross-link from Children | frontend-spa, `navByRole.ts` | `src/App.tsx`, `src/constants/navByRole.ts` |
| R3 | **Registrar pipeline paging** — use existing `admissionService.getApplications({ page, pageSize, status, q })`; stop fetch-all in `useRegistrarQuery` | lifecycle, frontend-spa | `services/lifecycle/src/services/admissionService.ts`, `src/features/registrar/hooks/useRegistrarQuery.ts`, Pipeline tab |
| R4 | **Notification smoke** — contract or unit: status transition → `notifyInAppMany` called with `ADMISSION_STATUS` when pref enabled | lifecycle, comms | `services/lifecycle/src/lib/admissionNotifications.ts`, `tests/` |

**Acceptance**

- [ ] Parent on Children sees localized application cards when API returns items
- [ ] Registrar Pipeline requests `page`/`pageSize`; network tab never loads full school application set when total > 50
- [ ] Status change APPROVED → parent with linked account receives in-app notification (manual or contract)

---

### 1.3 Super Admin registration queue (Identity + SPA)

| # | Deliverable | Owning service(s) | Key files |
| :--- | :--- | :--- | :--- |
| S1 | **Server total + pager** — store `total` from list API; render `ListPagination`; remove client `filteredRows` slice when q is server-side | identity, frontend-spa | `SchoolRegistrations.tsx`, `schoolRegistrationService.list` |
| S2 | **Post-approve school link** — primary button in credentials banner + drawer: `Link` to `/super-admin/schools/:id` (toast footer already exists) | frontend-spa | `SchoolRegistrations.tsx`, `RegistrationDetailDrawer.tsx` |
| S3 | **Saved views** — already scoped; verify save/load with status + q + page in URL | frontend-spa | `ListFilterBar`, `useListFilters` |

**Acceptance**

- [ ] Queue shows “Showing X–Y of Z” with Next/Prev; Z matches server `total`
- [ ] After approve, operator can open provisioned school in one click from banner (not only toast)
- [ ] Saved view restores filters + page

---

### 1.4 Enrollment + shared student list (Identity + Classroom + SPA)

| # | Deliverable | Owning service(s) | Key files |
| :--- | :--- | :--- | :--- |
| E1 | **Paged student picker hook** — extract `useStudentsQuery` pattern for `{ q, gradeLevelId, page, pageSize }` | frontend-spa | `src/features/students/hooks/useStudentsQuery.ts` → shared `usePagedStudents` |
| E2 | **Enrollment page** — replace `enrollmentApi.fetchStudents` full fetch with paged search in assign modals | frontend-spa | `src/features/enrollment/Page.tsx`, `enrollment/api.ts` |
| E3 | **Classrooms roster add** — replace `fetchAllStudents` with searchable paged picker (same hook) | frontend-spa | `src/features/classrooms/Page.tsx` |
| E4 | **Other pickers audit** — bulk import modal, manual admission student search: reuse hook where list can exceed ~150 | frontend-spa | `ImportRosterModal`, `ManualAdmissionTab` |

**Acceptance**

- [ ] Enrollment assign flow: typing search triggers paged API; never downloads entire student roster for large schools
- [ ] Classrooms “add member” uses same pattern
- [ ] Students list behavior unchanged (regression)

---

## 2. Phased delivery

| Phase | Focus | Est. (1 dev) |
| :--- | :--- | :---: |
| **A** | SA queue pager + approve→school CTA + registrar applications paging | 3–5 days |
| **B** | Enrollment/classroom paged pickers + shared hook | 3–5 days |
| **C** | ClamAV compose + fail-closed policy + tests | 3–5 days |
| **D** | Parent hub i18n + optional route + notification contract | 2–3 days |

Recommended order: **A → B → D → C** (user-visible scale first; infra hardening last).

---

## 3. Verification

```bash
npm run test:near-complete-smoke
npm run test:enroll          # if enrollment contracts exist
npm run test:unit            # registrar/admission helpers
docker compose up --build -d identity lifecycle frontend-spa
```

**Manual**

1. SA → Registrations → page 2 with status filter; saved view round-trip  
2. Approve registration → **Open school** → lands on school detail  
3. Registrar → Pipeline with 100+ apps → pager visible  
4. Enrollment → search student → only one page loaded  
5. Parent → My Children → applications section localized  
6. (Optional) ClamAV sidecar → upload EICAR test file → rejected  

**Rebuild map:** `identity`, `lifecycle`, `frontend-spa`; add `clamav` image only if Dockerfile added.

---

## 4. Documentation updates (same PR as code)

| Doc | Update |
| :--- | :--- |
| `ONBOARDING_AND_ADMISSION_PLAN.md` | Refresh §1.1–1.2 “remaining gaps” to point here |
| `docs/TABLE_PAGINATION_PLAN.md` | Mark Phase 2 registrar + enrollment pickers done when shipped |
| `IMPLEMENTATION_STATUS.md` | Item 6 onboarding row → link this plan; status Partial → Done per phase |

---

## 5. Change log

| Date | Note |
| :--- | :--- |
| 2026-08-06 | Plan authored from product gap table + code audit (CAPTCHA/Turnstile, notifications, partial SA paging already shipped) |
