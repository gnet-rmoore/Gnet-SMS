# Microservices Implementation Status

> Companion to [`MICROSERVICES_ROADMAP.md`](./MICROSERVICES_ROADMAP.md).
> **Phases 0–6 complete:** domain services own traffic; gateway has no monolith fallback; Socket.IO lives on Classroom; `sms-api` is optional emergency only.

| Roadmap phase | Status | Evidence |
| :--- | :--- | :--- |
| **0 — Harden monolith** | **Done** | `/health/live` + `/health/ready`; JSON logs + `x-request-id`; login rate limit; prod CSP; Docker `HEALTHCHECK` + K8s probes |
| **1 — Schema-per-service** | **Done** | Schemas + **per-service LOGIN roles** (`sms_identity`, …) with grants only on own schema; compose `db-roles` job; K8s `*-db-secret` templates. Still **one** Postgres cluster (not Phase C). |
| **2 — Gateway in front** | **Done** | [`services/gateway`](./services/gateway) `resolveUpstream` suffix-aware routing; SPA [`nginx.conf`](./nginx.conf) proxies `/api` → `api-gateway:8081` |
| **3 — Extract Lifecycle** | **Done** | [`services/lifecycle`](./services/lifecycle) real admission/attendance APIs; port **3010**; compose + `LIFECYCLE_URL` |
| **4 — Extract Comms + events** | **Done** | [`services/comms`](./services/comms) announcements/documents; BullMQ workers; [`packages/event-bus`](./packages/event-bus); port **3017** |
| **5 — Remaining services** | **Done** | identity **3011**, ops **3012**, staff **3013**, classroom **3014**, academic **3015**, finance **3016**, **campus** (specialists); K8s under `k8s/base/*-service.yaml` + `api-gateway.yaml` |
| **6 — Decommission** | **Done** | Gateway `DISABLE_MONOLITH=true`; Socket.IO on classroom; compose `sms-api` behind `profiles: [monolith]` only; **`src/server/` removed (2026-08-06)**; local dev = `vite` + `/api` proxy → gateway |

## Services & databases (schema-per-service, one Postgres cluster)

| Service | Port | Postgres schema | Compose service |
| :--- | ---: | :--- | :--- |
| Identity & Platform | 3011 | `identity` | `identity` |
| Student Lifecycle | 3010 | `lifecycle` | `lifecycle` |
| Operations & Facilities | 3012 | `ops` | `ops` |
| Staff & Workforce | 3013 | `staff` | `staff` |
| Classroom & Collaboration | 3014 | `classroom` | `classroom` |
| Academic & Grading | 3015 | `academic` | `academic` |
| Finance & Billing | 3016 | `finance` | `finance` |
| Communications & Documents | 3017 | `comms` | `comms` |
| Campus specialists | — | `campus` | `campus` |
| API Gateway | 8081 | — | `api-gateway` |
| Frontend SPA | 8080 | — | `frontend-spa` |
| Redis (BullMQ / Socket.IO) | 6379 | — | `redis` |
| Monolith (optional) | 3000 | `public` | `sms-api` (`--profile monolith`) |

> Not Phase C: there are **not** nine separate Postgres instances — one `sms_db` with domain schemas + per-service runtime roles (roadmap §4 Phase A).
>
> **Production cost posture:** buy **HA on this one Postgres** (Multi-AZ / regional standby). Separate DB instances only later if a domain (usually Finance) needs compliance or independent scale — that costs more and is optional.

## How to run (Phase 6 — no monolith)

> **Portable setup (other machines):** step-by-step clone → build → run → login → ops — see [`docs/DOCKER_SETUP.md`](./docs/DOCKER_SETUP.md).

```bash
docker compose up --build
```

On first Postgres volume create, schemas are applied from `docker/postgres/init-schemas.sql`.  
Each domain container runs `prisma db push` on start; identity also seeds demo users (`admin123`).

| URL | Purpose |
| :--- | :--- |
| http://localhost:8080 | SPA (API via gateway; Socket.IO via classroom) |
| http://localhost:8081 | API gateway (`DISABLE_MONOLITH=true`) |
| http://localhost:3010–3017 | Domain services directly |

Demo login: `schooladmin@yoursms.com` / `admin123` (identity seed).

### Emergency monolith (optional)

```bash
docker compose --profile monolith up -d sms-api
# Then set on api-gateway: DISABLE_MONOLITH=false MONOLITH_URL=http://sms-api:3000
```

K8s: `kubectl apply -f k8s/base/sms-api.yaml` only if you need an emergency fallback.

## Phase 6 checklist

- [x] Socket.IO moved to Classroom (+ Redis adapter when `REDIS_URL` set)
- [x] SPA nginx `/socket.io/` → `classroom:3014`; K8s Ingress `/socket.io/` → `classroom-service`
- [x] Gateway never falls back to monolith when `DISABLE_MONOLITH=true` (default); unmatched → `503`
- [x] All domain `*_URL` set on gateway; `/health/ready` fails if any missing
- [x] Compose default path excludes `sms-api` (`profiles: [monolith]`)
- [x] K8s production overlay no longer deploys `sms-api`
- [x] Smoke: login + representative GETs via gateway without `sms-api`
- [x] **`src/server/` deleted (2026-08-06)** — see `docs/REMAINING_GAPS_AND_SMOKE_PLAN.md`
- [ ] Optional: retire root `Dockerfile` (legacy sms-api image) + `k8s/base/sms-api.yaml` when emergency profile is dropped

## Safe to delete the monolith?

| Layer | Ready? |
| :--- | :--- |
| **Runtime (compose / K8s default)** | **Yes** — traffic does not use `sms-api` |
| **Source `src/server`** | **Deleted (2026-08-06)** — emergency rollback = git tag + `profiles: [monolith]` compose only if image still built |
| **Historical `public` schema data** | Migrate/copy into domain schemas before dropping monolith DB usage |

## Shared packages

| Package | Status |
| :--- | :--- |
| `@sms/event-bus` | Catalog + BullMQ `createEventBus` / `publishEvent` / `createWorker` |
| `@sms/service-client` | Timeout + retry-with-jitter + `getJson` / `postJson` |

## Verification (Phase 6, 2026-07-22)

| Check | Result |
| :--- | :--- |
| `sms-api` not in default compose | ✅ `NO_SMS_API` |
| Gateway `/health/*` + `/api/health` | ✅ `disableMonolith: true` |
| Login via gateway → identity | ✅ |
| Representative GETs (15 school routes across all domains) | ✅ all `200` |
| Socket.IO via nginx + classroom | ✅ `200` handshake; Redis adapter enabled |
| Unmatched `/api/*` | ✅ `503` (no monolith fallback) |

Demo: http://localhost:8080 — `schooladmin@yoursms.com` / `admin123`

## Honest gaps / follow-ups

0x. **Implementation plans (2026-08-06)** — companions for remaining platform gaps:
| Topic | Plan | Status |
| :--- | :--- | :--- |
| Grade-level subject auto-inherit + section codes | `docs/CURRICULUM_CLASSROOMS_PLAN.md` §2026-08-06 | **Done** — all class groups inherit offerings; unique `sectionSubjectCode` per section |
| School-wide TOTP/SMS 2FA | `docs/SCHOOL_MFA_2FA_PLAN.md` | **Done (v1)** — TOTP + SMS enroll/login, school policy UI, Comms OTP |
| SA platform security UI + cross-service activity | `docs/SA_PLATFORM_SECURITY_AND_ACTIVITY_PLAN.md` | **Done (v1)** — operator MFA login, 5-domain activity feed + CSV |
| PR vs nightly CI / Playwright promotion | `docs/CI_PR_NIGHTLY_TEST_GATE_PLAN.md` | **Partial** — PR `@tier1` + nightly `@tier2`; full tier promotion process ongoing |
| fr / hi / zh-Hans locale parity (print layouts stay EN) | `docs/I18N_LOCALE_PARITY_PLAN.md` | **Partial** — critical-path complete; ~1500 non-critical leaves still EN fallback |
| Receipt HTML templates (Settings picker + HTML→PDF) | `docs/RECEIPTS_TEMPLATES_INTEGRATION_PLAN.md` | **Partial** — 6 templates (PDFKit + 5 HTML), Settings picker, preview API, Chromium in Finance Docker; legacy mock HTML files remain on disk |
| Onboarding & admissions 95→100 | `docs/ONBOARDING_ADMISSIONS_95_TO_100_PLAN.md` | **Plan** — SA queue pager, registrar paging, paged enrollment pickers, ClamAV sidecar |
| Academics & assessment gaps | `docs/ACADEMICS_ASSESSMENT_GAPS_PLAN.md` | **Plan** — Phase 3 pagination + online exam polish; gradesheet/report-card epics deferred |
0w. **Remaining gaps + smoke automation (2026-08-06):** Done — SPA pagination (Expenses, Payroll, SA Schools/Users); `entitlement_override` audit; `src/server` removed; `test:near-complete-smoke` + PR Playwright gate — see `docs/REMAINING_GAPS_AND_SMOKE_PLAN.md`.
0v. **Near-complete → 100% (2026-08-06):** Phases 1–6 implemented (excludes gradesheets + report cards) — see `docs/NEAR_COMPLETE_TO_100_PLAN.md`.
0u. **Documentation accuracy pass (2026-08-05):** Synced stale plan headers and role docs with code audit — `ROLES_DOCUMENTATION.md` (campus live), `docs/APP_FEATURES_OVERVIEW.md`, `ONBOARDING_AND_ADMISSION_PLAN.md` §1.1–1.2, `RECEIPTS_PLATFORM_PLAN.md`, `STAFF_PORTAL_COMPLETION_PLAN.md`, `STAFF_WORKFORCE_PLAN.md`, `OPS_FACILITIES_PLAN.md`, `LIBERIAN_REPORT_CARD_TEMPLATES_PLAN.md`. **Verified remaining (P0):** server pagination Phase 2+ (Students/Staff/Admissions); CI multi-image builds; INTL report-card redesign; admission notification producers; CAPTCHA SPA widget; ClamAV; operator email invite; impersonation-end audit.
0t. **School API keys UI + IT Admin security (2026-08-05):** Dedicated Settings **API keys** tab with in-page guide; infinite-loading fix; IT Admin nav (Roles & Access read-only, Security policies, API keys); in-app **API documentation** page at `/{slug}/api-docs` (dashboard quick action for School Admin + IT Admin only) — see `docs/SCHOOL_API_KEYS_PLAN.md`.
0q. **Role-customized dashboards (2026-08-04):** Done — per-role registry + homes (Student/Teacher/Leadership/Specialty hub cards); Parent + Accountant kept; fake KPI/chart path removed — see `docs/ROLE_DASHBOARDS_PLAN.md`.
0s. **Email providers + verification (2026-08-04):** **Phases 0–3 done** — Identity mailer supports `console`, `smtp`, `sendgrid`, `ses`, `mailgun`, `resend`; register-school confirm SPA; forgot/reset password; optional user verify (`REQUIRE_EMAIL_VERIFICATION`); gateway `/api/auth/*`; Comms notification email via Identity internal mail API; **Super Admin System Credentials UI** for provider/API keys — see `docs/EMAIL_VERIFICATION_PLAN.md`.
0r. **Campus specialists (7 modules):** **Done (2026-08-04)** — `campus` microservice + Ops transport; Executive Slate UIs; landing Live; Phase 8 hardening; **family portal** at `/{slug}/my-campus` for parents/students (transport, library loans, clinic summary, hostel; counseling excluded) — see `docs/CAMPUS_SPECIALISTS_PLAN.md`.
0p. **Graduation certificates (2026-08-03):** Four landscape Letter print templates; school `certificateTemplate` + **tenant branding** (logo, `brandColor` accents, address) + `certificateDefaults` signatories; Settings appearance picker; page `/{slug}/certificates` (Admin / Principal / VPI / Registrar) — see `docs/GRADUATION_CERTIFICATES_PLAN.md`. Out of scope: bulk cohort ZIP, digital signature / QR authenticity, server Puppeteer PDF.
0o. **Year Transition + school-wide Promotion Statement (2026-08-03):** Opening census, promote/repeat/graduate/exit runs, printable statement (gender / division / class / pass-fail); roles School Admin, Principal, VPI, VPA, Registrar — see `docs/YEAR_TRANSITION_PLAN.md`. Deferred: per-student report-card promotion stamp, auto pass/fail from annual averages.
0n. **Grade sheet HTML templates (2026-08-03):** Replaced Tailwind grade-sheet skins with 3 print ports (classic A4, mastery A4, official Legal); legacy `TEMPLATE_4+` remap to classic; Settings picker + page-size PDF/print; **dense + multi-page layout for 10+ / 17 subjects** — see `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md`. Server Puppeteer PDF deferred.
0m. **Canvas vs surface contrast (2026-08-03):** **Option A done** — page canvas `slate-100`, white surfaces `border-slate-200` + stronger soft shadow; tokens + Layout/landing/public shells + drift guard — see `docs/CANVAS_SURFACE_CONTRAST_PLAN.md`.
0j. **Grade edit access grants (2026-07-31):** School Admin / Principal / VPI grant time-boxed CA / Incomplete edit rights to teachers; Incomplete marker + report-card “I”; page `/{slug}/grade-access` — see `docs/GRADE_EDIT_ACCESS_GRANT_PLAN.md`.
0h. **Custom error pages (2026-07-31):** 404 / 403 / 500 / offline + ErrorBoundary + OfflineGate; suspended school page unchanged — see `docs/ERROR_PAGES_PLAN.md`.
0. **Product feature map (by role & school domain):** `docs/APP_FEATURES_OVERVIEW.md` (2026-08-05 accuracy pass).
0g. **Super Admin platform console (2026-07-31):** **Phases A–F done** — directory counts/detail/password reset; filters/CSV/disable; plans/entitlements/quotas; impersonation + health + diagnostics; SA RBAC + dual-control delete + DSR; **ledger MRR + Stripe/console checkout**; **real broadcast + MailDeliveryLog**; **custom domain TXT verify + resolve-host + edge TLS ask / optional Caddy profile** — see `docs/SUPER_ADMIN_PLATFORM_PLAN.md`, `docs/CUSTOM_DOMAIN_EDGE.md`. Out of scope: storing cert private keys in DB, Connect take-rate.
0l. **Super Admin Help glossary (2026-07-31):** `/super-admin/help` searchable term definitions for all SA accounts — see `docs/SA_HELP_GLOSSARY_PLAN.md`.
0i. **SA editable Plans + operator provisioning (2026-07-31):** **Wave 1–2 shipped** — DB plan catalog CRUD, school entitlement/quota overrides, add/deactivate/reset platform operators (temp password in UI — **no email invite yet**); **public** `GET /api/public/plans` + dedicated **`/pricing`** page (3-up cards) — see `docs/SA_PLANS_EDITOR_AND_OPERATORS_PROVISIONING_PLAN.md`, `docs/LANDING_PAGE_OVERHAUL_PLAN.md`. **Runtime enforcement (2026-08-04):** all domain APIs + SPA nav/route guards + seat quotas + trial auto-lock + API keys + document storage quota — see `docs/PLANS_ENTITLEMENTS_ENFORCEMENT_PLAN.md`. **Operator MFA (2026-08-06):** optional `requireOperatorMfa` on SA login — see `docs/SA_PLATFORM_SECURITY_AND_ACTIVITY_PLAN.md`. Remaining: operator **email invite**; `requireCap` on legacy SA list routes.
0k. **SA System Logs audit wave 1 (2026-07-31):** Expanded `SystemLog` metadata + auth/user/role/tenant writers; Logs UI categories, detail drawer, date range, CSV — see `docs/SA_SYSTEM_AUDIT_LOGS_PLAN.md`. Remaining: impersonation end, cross-service activity aggregator, MFA/OAuth when product supports them.
0a. **Public marketing landing overhaul (2026-07-30):** **Phases 0–5 done** — slim hero, 8 pillars, interactive tour, full module catalog, FAQ, SEO/i18n, sticky mobile CTA; **modules → `/modules`**, **pricing → `/pricing` (2026-07-31)**; **comprehensive modules/pricing pages (2026-07-31)** — heroes, search/filter catalog, plan comparison matrix, entitlements FAQ — see `docs/LANDING_PAGE_OVERHAUL_PLAN.md`.
0e. **App sidebar chrome (CodingLab-style) (2026-07-31):** **Phases 0–4 done** — dark rounded rail, icon-rail collapse, section accordion + collapsed flyout, bottom profile card — see `docs/SIDEBAR_NAV_OVERHAUL_PLAN.md`. **Global search (same day):** page results use translated `labelKey` + section subtitle (blank-label regression after i18n `label`→`labelKey`).
0f. **Role-guided platform wizard (2026-07-31):** **Phases 0–4 + extras done** — Learning center, spotlight, Identity progress, staff tracks, Super Admin track, admin completion stats, `?step=` deep links, `guideRequired`, under-13 student path, welcome tip email, a11y; **tenant brand accents + step how-to lists (2026-08-03)** — see `docs/ROLE_GUIDED_WIZARD_PLAN.md`.
0b. **Roles & Access (School Admin role customization):** `docs/ROLE_ACCESS_PLAN.md` (2026-07-24; **catalog refresh 2026-07-31**) — list users, audited role reassignment, per-school capability matrix; School Admin defaults cover recent features (schedules, bulk import, specialty ops, notifications, student records, new actions).
0c. **Permissions / who-can-do-what audit & fix backlog:** `docs/PERMISSIONS_FIX_REPORT.md` (2026-07-24) — **remediation done** (P0 ACL + P1 nav/API alignment + stub honesty).
0d. **Full-stack test coverage (all roles / services / endpoints / SPA):** `docs/TEST_COVERAGE_PLAN.md` (2026-07-24) — **Phases 0–5 scaffold done** (`inventory`, `test:unit`, `test:spa`, `test:http-smoke`, nightly Playwright).

1. Compose `db-roles` reapplies schemas/roles on every `up` (idempotent). Fresh volumes also run `init-schemas.sql` via initdb.d. Change role passwords in production — local defaults match the role name.
2. Monolith `public` data and service schemas are **separate** — migrate historical rows when ready.
3. Cross-domain reads use HTTP clients; some aggregations were simplified.
4. CI (`.github/workflows/deploy.yml`) still needs full multi-image builds for all domain services (not only frontend).
5. Do **not** commit real values into `k8s/base/secrets.yaml` (includes per-service `*-db-secret` templates).
6. Onboarding & admission (Parts A+B): see `ONBOARDING_AND_ADMISSION_PLAN.md` — v1 + honesty fix + **online registration control** (Admissions hub `OnlineRegistrationCard`, not Settings tab) + **suspended-school login page** + **operational setup checklist** (7 required steps; 2026-08-03). **Partial:** public apply status via token (`/apply/:slug/status`); parent applications on My Children; Turnstile on register/apply when keys set; admission in-app notifications. **Remaining (95→100):** `docs/ONBOARDING_ADMISSIONS_95_TO_100_PLAN.md` — SA queue pager, registrar applications paging, paged enrollment pickers, ClamAV sidecar; live Stripe keys optional.
7. Phase C (physical DB split) is **not** implemented — only consider for Finance if compliance requires it.
8. Staff workforce (add/edit staff accounts, leave, payroll, staff tasks, leave policies): see `docs/STAFF_WORKFORCE_PLAN.md` — **done for planned v1** (2026-08-05); Staff Portal completion in `docs/STAFF_PORTAL_COMPLETION_PLAN.md`.
8b. **Bulk roster import (CSV / Excel) (2026-07-30):** Phases 1–2 done — atomic Identity batch create for students + staff; preview/dry-run, templates, credentials download; Phase 3 classroom column open — see `docs/BULK_IMPORT_PLAN.md`.
9. Academic calendar setup (view current + wizard): see `docs/ACADEMIC_GRADING_PLAN.md`.
9b. **Report card templates (2026-07-30):** Liberia Phases 0–1 + client booklet **done**; Phase 2 **partial** (client assembly; Academic `GET …/report-card` pending) — `docs/LIBERIAN_REPORT_CARD_TEMPLATES_PLAN.md`. **International:** 10 A4 packs + **2 quarterly Wisteria layouts (2026-08-03)** — `docs/WISTERIA_REPORT_CARD_TEMPLATES_PLAN.md`. **Full INTL visual redesign still planned:** `docs/INTERNATIONAL_REPORT_CARD_TEMPLATES_PLAN.md`.
10. School settings (profile + calendar summary): see `docs/SCHOOL_SETTINGS_PLAN.md` (2026-07-23: GET school, country persist, Slate chrome).
10b. **Multi-language / i18n (2026-07-31):** **Phases 0–6 + full leaf catalogs + production-complete gate** — all 7 locales `complete: true`; hard `i18n:check` for missing leaves / critical-path EN leftovers; AR/ZH/HI script QA; Identity emails + Finance receipt PDF chrome; Playwright fr/ar/zh-Hans/hi login smokes — see `docs/I18N_PLAN.md`. Print report-card / grade-sheet legal layouts stay English until report-card finalize (§6.4). User-authored content is never auto-translated.
11. Curriculum & Classrooms (hydration + calendar strip + **grade-level subject offerings** 2026-07-29): see `docs/CURRICULUM_CLASSROOMS_PLAN.md` and `docs/grade-level-vs-class-group.md`.
11b. **Class organization models (2026-08-04):** Phases 0–5 done — `organizationType` on class groups, co-teachers + assistants, live roster fan-out, org filter + platoon specialist apply in Quick Assign, ConceptGuide / platform guide / features-guide — see `docs/CLASS_ORGANIZATION_MODELS_PLAN.md`.
11c. **Teacher syllabus modal scoping (2026-08-04):** Phases 1–3 done — teacher modal subject/grade scoped to subject classrooms; API guard on create; teacher syllabi list shows own plans only — see `docs/TEACHER_SYLLABUS_SCOPING_PLAN.md`.
11d. **Syllabus & lesson plans ↔ Academic Calendar (2026-08-04):** Syllabus builder requires active calendar, imports period-linked units + annualized exam weights, stores `calendarPatternId`; lesson-plan week board scoped to calendar periods + date warning; edit/resubmit, server validation, view modal calendar badge — see `docs/SYLLABUS_CALENDAR_ALIGNMENT_PLAN.md`.
12. School Calendar / Staff Portal / Exams (2026-07-22): Calendar CRUD + Academic Calendar sync; Staff leave balances/ack; Exams slate polish.
12b. Exams ↔ Academic Calendar (2026-07-23): Schedule from period/component; date window validation; enriched list + School Calendar deep links; Executive Slate Exams/Details — see `docs/ACADEMIC_GRADING_PLAN.md`.
12c. Online exams / kiosk lockdown (2026-07-24): see `docs/ONLINE_EXAMS_PLAN.md` — question authoring, fullscreen take, violation auto-submit, timer, score/passed/missed, parent tracking.
12d. Exam paper submit / staff approval / Online·Offline·Hybrid delivery (2026-07-24): **done** — see `docs/EXAM_PAPER_APPROVAL_PLAN.md` (Phases A–D).
13. Grade Review / Announcements / Admissions UI (2026-07-22): Grade Review Identity enrichment + Executive Slate queue. Announcements FeatureModalShell redesign. Registrar chrome polish; fake transcript removed; alerts → inline status.
14. Fees / Expenses / Payroll (2026-07-22): Executive Slate chrome; parent-scoped `/api/my-fees`; fee pay PATCH; payroll staff name join + CSV export; toasts; no fake budget/template seeds.
15. Expenses deep polish (2026-07-23): Honest metrics/forecast (no fake fallbacks); FeatureModalShell forms; ledger-first IA; payroll name join; category filter; plain copy + Executive Slate tokens.
16. Fees / Fee Management (2026-07-23): see `docs/FINANCE_BILLING_PLAN.md` — server fee templates, void invoices, checkout-based portal pay, honest reminders, Executive Slate ledger/overview.
16b. Fees + Expenses reliability (2026-07-23): classroom enrichment for fee filters/batch; soft-fail secondary loads; school guards; refresh parity; finance summary payroll soft-fail — see `docs/FINANCE_BILLING_PLAN.md`.
17. School Admin Settings (2026-07-23): see `docs/SCHOOL_SETTINGS_PLAN.md` — identity GET school, country on PATCH, ISO country resolve, SettingsChrome + FeatureModalShell, toast gradebook save.
17b. School Admin Settings “make it work” roadmap (2026-07-23): see `docs/SCHOOL_SETTINGS_PLAN.md`.
17c. School Admin Settings Phases 0–5 (2026-07-23): hydrate/attendance UX; brand apply; legends on report cards; Identity `securityPolicy`; Comms notification prefs + Settings UI; `?tab=` — see `docs/SCHOOL_SETTINGS_PLAN.md`.
17g. Admin password reset policy (2026-07-31): School/IT Admin tenant-scoped reset without current password; School Admin accounts protected (self + Super Admin only) — see `docs/SCHOOL_SETTINGS_PLAN.md`.
17h. Super Admin login bounce (2026-07-31): Layout `/api/auth/me` refresh was re-minting a **school** JWT after Super Admin sign-in, so `authenticateSuperAdmin` failed and the SPA redirected to `/login?expired=true`. Fix: SA `sessionForUserId` uses `SUPER_ADMIN_JWT_SECRET`; Layout skips refresh for `SUPER_ADMIN`; school login rejects Super Admin accounts (use Super Admin tab).
17f. Custom notification categories (2026-07-24): School Admin Settings → Notifications can add/remove custom event categories (label + key); Comms prefs store optional label/description — see `docs/SCHOOL_SETTINGS_PLAN.md`.
17d. Global brand theming (2026-07-23): `brandColor` remaps indigo/violet Tailwind tokens + SweetAlert via `--school-brand-*` (buttons, focus, highlights) — see `docs/SCHOOL_SETTINGS_PLAN.md` / `FRONTEND_GUIDELINES.md`.
17e. Platform blue + school brand post-login (2026-07-24): default action color `#2563eb`; school `brandColor` only in Layout after school login; public apply stays platform blue — see `docs/SCHOOL_SETTINGS_PLAN.md` / `FRONTEND_GUIDELINES.md`.
17. Enroll New Student (2026-07-23): Identity createStudent returns one-time temp password + mustChangePassword; FeatureModalShell enroll/edit/assign; credentials copy panel; Students page Executive Slate.
18. Payroll deep polish (2026-07-23): Executive Slate chrome; FeatureModalShell create/edit; period + status filters; mark paid + `paidAt`; CSV in header; honest staff payslips; see `docs/STAFF_WORKFORCE_PLAN.md`.
18b. Payroll add/refresh fix (2026-07-23): `setAuth` preserves school when omitted; Profile/Onboarding auth bugs; Payroll refresh+create hardening — see `docs/STAFF_WORKFORCE_PLAN.md`.
19. Staff Portal UI polish (2026-07-23): Executive Slate shell/tabs; honest leave balances; FeatureModalShell modals; alerts → toasts; attendance copy cleaned.
20. Work Orders (2026-07-23): Executive Slate chrome/list/drawer; FeatureModalShell create; real staff assign (no fake techs); name join; Principal/VPA update aligned; see `docs/OPS_FACILITIES_PLAN.md`.
21. Leave Approvals (2026-07-23): Executive Slate queue + detail drawer; staff name join; optional comment; confirm approve/reject; see `docs/STAFF_WORKFORCE_PLAN.md`.
22. Facilities Hub (2026-07-23): Removed fake PM/assets/techs/activity; Overview + WO + Inventory only; FeatureModalShell forms; see `docs/OPS_FACILITIES_PLAN.md`.
23. School Reports (2026-07-23): Honest roster/attendance/finance/ops summary; CSV export; no fake KPIs/PDF list; see `docs/SCHOOL_REPORTS_PLAN.md`.
24. Classroom Enrollment (2026-07-23): Real `/members` roster + membership map; honest bulk assign (no fake email create); Executive Slate; link to Students for new accounts.
25. Work Orders deep polish (2026-07-23): Optional assign on create; priority PATCH; clickable stats + unassigned filter; confirm complete; richer detail drawer; Ops validation; see `docs/OPS_FACILITIES_PLAN.md`.
26. In-app notifications & nav badges (2026-07-23): **Phases 1–3 done** — bell + sidebar badges + `/notifications` page; producers for leave/announcements/fees/work orders; see `docs/NOTIFICATIONS_PLAN.md`.
26. School Documents (2026-07-23): see `docs/COMMS_DOCUMENTS_PLAN.md` — Executive Slate library; role-scoped list; uploader Identity enrich; FeatureModalShell upload/edit; Staff Portal category alignment.
27. Facilities Hub UX polish (2026-07-23): Dark chrome; WO detail drawer; `?tab=` deep links; confirm complete/cancel; inventory ± adjust; Ops inventory field PATCH; nav fixes for VPA/Maintenance; see `docs/OPS_FACILITIES_PLAN.md`.
28. Unified Receipt Platform (2026-07-23): see `docs/RECEIPTS_PLATFORM_PLAN.md` — **done** — Finance-issued QR-verifiable PDFs for fees, payslips, expenses; public verify page; MinIO storage; per-installment receipts; void on payroll unpaid. **HTML template picker (2026-08-07):** 5 Mustache layouts + PDFKit default — see `docs/RECEIPTS_TEMPLATES_INTEGRATION_PLAN.md`.
29. User Profile UX (2026-07-23): Executive Slate profile; compressed square photo upload with apply/remove; `photoUrl` on login + staff/students lists; `UserAvatar` + auth `updateUser` so photos update in Layout, classrooms, and directories.
30. Accountant finance dashboard (2026-07-23): Replaced JSON stub with Executive Slate KPIs/charts from `/finance/summary`; soft-fail summary; shortcuts to Fees/Expenses/Payroll — see `docs/FINANCE_BILLING_PLAN.md`.
31. Attendance platform (2026-07-23): Roll call harden + Phases 1–4 — instructional-day gate, calendar Attendance events, staff attendance summary + leave, payroll suggested deductions, school settings rules; teacher full-page roll call UX (keyboard, tallies, preload, school-TZ date) — see `docs/ATTENDANCE_INTEGRATION_PLAN.md`.
32. Official user signatures (2026-07-23): Profile draw/upload → Identity `signatureUrl`; staff/admin roles; helper `getOfficialSignatureUrl` for documents — see `docs/USER_SIGNATURE_PLAN.md`.
32b. **Document signatures on printouts (2026-08-04):** Settings maps staff → document roles (`School.documentSignatories`); certificates, report cards, gradesheets, fee receipts render saved signature images (blank line when missing) — see `docs/DOCUMENT_SIGNATURES_PLAN.md`.
33. Fee scope / eligibility (2026-07-23): Phases A–D — Grade/Division/cohort templates, batch-apply, mismatch reject + stale collect policy — see `docs/FEE_SCOPE_ELIGIBILITY_PLAN.md`.
33b. Fee partial / installment payments (2026-07-30): **Phases A–D done** (installment *schedules* deferred) — pay little by little; write-off; legacy backfill; min payment; Transaction history — see `docs/FEE_PARTIAL_PAYMENTS_PLAN.md`.
34. Teacher Gradebook (2026-07-23, **scoped assessment 2026-08-05**): Hub + spreadsheet entry, autosave; **one assessment at a time** with per-`ExamComponent` structure columns (HW/QZ/CW/Exam), Total + Letter — see `docs/GENERIC_GRADEBOOK_PLAN.md`, `docs/TEACHER_GRADEBOOK_PLAN.md`.
35. Classroom Management Teacher/Student (2026-07-23): **Phases 1–5 done** — My Classes + assignments + topics/attachments + comments/realtime + parent read-only; **2026-07-24** TipTap editor + multi-file drag-drop + banner color/image; **roster add/remove staff-only** (teachers view People) — see `docs/CLASSROOM_MANAGEMENT_PLAN.md`.
36. Grade Review dual workflow (2026-07-23): Batches, reviewer audit, reopen, deadlines/membership, in-app bell notifications (GRADE_RETURNED/APPROVED); Exam Details defers to Grade Review — see `docs/GRADE_REVIEW_PLAN.md`.
37. Parent Portal & PTA (2026-07-23): **Done (Phases 0–E).** Grades IDOR closed (Identity assert-link); family hub + dashboard KPIs; classroom `?studentId=`; announcements reader; producers for attendance/fees/grade-release; Comms PTA org/meetings/RSVP/volunteers/campaigns + SPA; attendance CSV; roles docs — see `docs/PARENT_PORTAL_AND_PTA_PLAN.md`.
38. Lesson Plans (2026-07-24): **Phases 1–4 done** — teacher workspace + approval + templates/syllabus units + Share to Classroom + week drag + PDF pack — see `docs/LESSON_PLANS_PLAN.md`.
39. Class Schedule / Timetable (2026-07-24): **Phases 1–4 done** (+ polish) — admin grid, Calendar `Class` overlays, My Schedule, week PDF, Lesson Plan bell-period link — see `docs/CLASS_SCHEDULE_PLAN.md`. **Write owners (2026-07-31):** Principal / VPI / School Admin only; Registrar and others view-only. **Slot availability & workload planning (2026-10-17):** per-slot teacher availability + rest gaps, class occupancy, workload warnings, and subject-aware **Auto-fill** suggestions — see `docs/CLASS_SCHEDULE_SLOT_AVAILABILITY_PLAN.md`.
40. UI density consistency (2026-07-24): **Phases 0–5 + Waves A–D done** — tokens, `src/components/ui`, mechanical card/label pass, Super Admin/Security/Registrar/academic/ops on primitives, drift baselines 0, CI `test:ui-primitives` + `test:ui-drift` — see `docs/UI_CONSISTENCY_PLAN.md`, `docs/UI_VISUAL_BASELINES.md`.
41. Full-app responsive UI (2026-07-30): **Done (phases 0–5)** — mobile overlay drawer, padding contract, TableScroll/MatrixScrollHint, mechanical grid/table pass, `test:responsive` — see `docs/RESPONSIVE_UI_PLAN.md`.
42. **Advanced table & list filters (2026-07-31):** **Phases 0–5 shipped** — shared `ListFilterBar` / URL sync / saved views / column filter / Logs AND-OR; school + SA list surfaces migrated; staff/admissions/expenses/payroll/students/fees/logs query params — see `docs/ADVANCED_TABLE_FILTERS_PLAN.md`.
43. **Table pagination (2026-07-31):** **Phase 0–1 shipped** — shared `ListPagination`; Fees History/Ledger, SA Logs, Role Access, Grade Review, Notifications load in segments — see `docs/TABLE_PAGINATION_PLAN.md`. Remaining: Students/Staff/Registrar and other Phase 2–3 directories.
