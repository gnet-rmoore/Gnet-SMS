# Super Admin Platform — Plan

> **Status:** Phases **A–F done** (2026-07-31); **Phase G wave 1–2 shipped** — editable plan catalog + operator provisioning (see companion).  
> **Scope:** Platform operator (`SUPER_ADMIN`) control plane for multi-tenant Gnet SMS  
> **Owning services:** Identity (primary), Gateway; platform Stripe checkout optional via `STRIPE_SECRET_KEY`  
> **UI:** `/super-admin/*`  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `ONBOARDING_AND_ADMISSION_PLAN.md`, `docs/SCHOOL_SETTINGS_PLAN.md`, `docs/APP_FEATURES_OVERVIEW.md`, **`docs/SA_PLANS_EDITOR_AND_OPERATORS_PROVISIONING_PLAN.md`** (Phase G)

### 2026-07-31 — Phase G wave 1–2 shipped (editable plans + hire operators)

- **Change:** `PlatformPlan` DB catalog + PATCH/POST plans; Plans/School Detail override UI; create/deactivate/reset Super Admin operators with last-OWNER guards; SA login returns capabilities.
- **Services:** Identity, frontend-spa
- **Status:** done (operator create/deactivate/reset shipped; **email invite** + full `requireCap` on legacy SA routes still open)
- **Verify:** Edit STANDARD price on `/super-admin/plans`; Add SUPPORT operator and log in with temp password; cannot deactivate last OWNER

### 2026-07-31 — Phase G planned (editable plans + hire operators)

- **Change:** DB-backed plan catalog editor + per-school entitlement/quota override UI; create/invite/deactivate global Super Admin operators (beyond role changes among existing SAs).
- **Services:** Identity, frontend-spa
- **Status:** superseded by wave 1–2 shipped entry above
- **Verify:** see shipped entry

### 2026-07-31 — Phase F shipped (close honest limits)

- **Change:** Platform subscription ledger + list-price MRR; Stripe/console checkout → `ACTIVE_PAID`; real `sendMail` broadcast + `MailDeliveryLog`; custom domain TXT verify + `GET /api/public/resolve-host` + **edge TLS ask** + optional **Caddy compose profile**; SA Help glossary.
- **Services:** Identity, Gateway, frontend-spa
- **Status:** done
- **Verify:**
  - [ ] Reports MRR moves when a school is `ACTIVE_PAID` (stays `$0` when none paid)
  - [ ] School detail: Mark COMP / Start checkout (console completes in-app)
  - [ ] Broadcast shows sent/failed; delivery diagnostics lists `MailDeliveryLog`
  - [ ] Domain save shows TXT host/value; verify fails cleanly without DNS; resolve-host on custom host
  - [ ] `npm run test:super-admin-platform`

### 2026-07-31 — Phase F planned (close honest limits)

- **Change:** Platform subscription ledger + list-price MRR; Stripe/console checkout → `ACTIVE_PAID`; real `sendMail` broadcast + `MailDeliveryLog`; custom domain TXT verify + `resolve-host`; plan-before-implement skill/rule.
- **Services:** Identity, Gateway, frontend-spa
- **Status:** superseded by shipped entry above
- **Verify:** see Phase F acceptance below

### 2026-07-31 — Phases B–E implemented

- **Change:** Operator polish (filters, CSV, disable/unlock); SaaS plans/entitlements/quotas; school health + notes; time-boxed impersonation; delivery diagnostics + broadcast + maintenance mode; SA sub-roles; dual-control delete; DSR export; custom domain field.
- **Services:** Identity (+ SPA)
- **UI / API:** `/super-admin/plans`, `/super-admin/operators`, Settings → Platform ops; see routes under `/api/super-admin/*`
- **Status:** done (Phase F closes remaining honesty gaps)
- **Verify:** Assign plan; disable user; impersonate; dual-control delete; maintenance mode

### 2026-07-31 — Phase A implemented

- **Change:** Schools list shows real `studentCount` / `staffCount`; school detail directories; global password reset.
- **Status:** done (Phase A)

---

## Phase F — Close honest limits

| Subphase | Outcome |
| :--- | :--- |
| **F0** | Skill + rule `plan-before-implement` |
| **F1** | Plan list prices + School billing fields + MRR on stats/Reports |
| **F2** | Platform checkout (Stripe or console) → mark `ACTIVE_PAID` |
| **F3** | Broadcast uses `sendMail` + `MailDeliveryLog` |
| **F4** | Custom domain TXT verify + Host→school resolve + SA UI |

**Out of scope (still honest):** automatic TLS in-app; per-school nginx `server_name` matrix; Stripe Connect take-rate on school fees.

**Custom domain ops:** CNAME the school hostname to the platform edge; TLS terminates at CDN/load balancer **or** optional `docker compose --profile edge` (Caddy on-demand TLS via `/api/public/domain-tls-ask`). App verifies ownership via TXT `_gnet-sms.<domain>` and resolves Host → school for login (`GET /api/public/resolve-host`). See `docs/CUSTOM_DOMAIN_EDGE.md`.

**Acceptance (Phase F):**

- [x] Reports show ledger MRR for `ACTIVE_PAID` schools (0 when none paid — not invented)
- [x] Checkout (console or Stripe) marks school paid; COMP/PAST_DUE via SA
- [x] Broadcast sends via mailer and writes delivery log rows
- [x] Domain set → TXT instructions → verify API; `GET /api/public/resolve-host`
- [x] `npm run test:super-admin-platform`

---

## 0. Role definition

Super Admin is the **platform control plane**: tenants (schools), global identity/support actions, platform security, integrations, and cross-school insight.

They do **not** replace School Admin for day-to-day academics, fees, attendance, or payroll — except via **explicit, audited** support tools (e.g. password reset, optional future impersonation).

| Principle | Rule |
| :--- | :--- |
| Tenant isolation | SA may **read** cross-tenant directories; mutations are limited and audited |
| Least privilege later | Future SA sub-roles (Support vs Billing vs Owner) — v1 may be single `SUPER_ADMIN` |
| Honesty | No fake student counts, subscription CTAs, or telemetry |
| Audit | Every privileged SA action writes `systemLog` (or dedicated SA audit) with actor, school, target user, reason |

---

## 1. Priority requirements (user-stated) — Phase A

These are **must-ship** before broader SaaS operator work.

### A1. Schools directory with real headcount

| Requirement | Detail |
| :--- | :--- |
| List / search / filter schools (status, country, plan, created date, activity) | Scale beyond a few tenants |
| Show **total students** per school | Count users with student role — **not** total users blob |
| Also show useful columns | Staff count, total users, status |
| Click into school directory | Students / Staff / Parents tabs with search + pagination |
| Global password reset | Any school user from Users or school detail; audited |

**Target API shape (illustrative):**

```http
GET /api/super-admin/schools
→ [{ id, name, slug, status, country, studentCount, staffCount, userCount, … }]
```

### A2. School detail — staff & students

| Requirement | Detail |
| :--- | :--- |
| Click a school | Navigate to school detail (e.g. `/super-admin/schools/:id`) |
| Tabs or sections | **Students** \| **Staff** (and optional **Admins** / all users) |
| Student list | Name, email, student ID / grade if available, status, last login |
| Staff list | Name, email, role, department if available, status, last login |
| Actions from row | Open profile summary; **Reset password** (A3); disable/unlock later |
| Pagination + search | Required at scale |

**Out of scope for A2:** Editing grades, fees, attendance, or full school console impersonation.

**Target APIs (illustrative):**

```http
GET /api/super-admin/schools/:id
GET /api/super-admin/schools/:id/students?q=&page=
GET /api/super-admin/schools/:id/staff?q=&page=
```

Staff = non-student school users (teachers, admins, registrar, accountant, ops, etc.) — exact role sets documented at implement time from Identity enums.

### A3. Global password reset (all school users)

| Requirement | Detail |
| :--- | :--- |
| Who | Super Admin may reset password for **any** school user in **any** school (students, parents, staff, School Admin) |
| How | From global Users page **and** from school detail row actions |
| UX | Set temporary password (or generate); force `mustChangePassword: true` by default; one-time reveal + copy; optional email if mailer configured |
| Policy | Already allowed in Identity `passwordResetPolicy` for `SUPER_ADMIN`; **UI + dedicated SA endpoints** must expose it |
| Audit | Log `password_reset` with actor SA id, target user id, school id |
| Safety | Confirm dialog; optional “reason” field for support tickets |

**Status:** Done — `POST /api/super-admin/users/:id/reset-password` + SA Users / school detail UI.

**API:**

```http
POST /api/super-admin/users/:id/reset-password
{ "password": "…", "mustChangePassword": true, "reason": "…" }
```

---

## 2. Full feature catalog (product backlog)

Beyond Phase A, a mature multi-tenant school SaaS Super Admin typically needs the areas below. Status vs Gnet today.

### Legend

| Status | Meaning |
| :--- | :--- |
| **Done** | Usable in product today |
| **Partial** | Exists but incomplete / misleading / thin |
| **Planned** | In this plan; not built |
| **Later** | Valid; defer after A–C |

### 2.1 Platform overview

| Capability | Status |
| :--- | :--- |
| Dashboard KPIs (schools, users, active/suspended) | Partial |
| Registration queue shortcut | Done |
| Honest student totals (platform + per school) | Done (A1) |
| Service health / incident banner | Later |

### 2.2 Tenant lifecycle

| Capability | Status |
| :--- | :--- |
| List / create / edit / suspend / delete schools | Done / Partial |
| Public registration review (approve / reject / request info) | Done |
| Resend admin invite | Done |
| School detail with staff + students | Done (A2) |
| Offboarding export / purge | Later |
| Custom domain / white-label login | Later |
| Multi-campus / trust hierarchy | Later |

### 2.3 Directory & identity (Phase A core)

| Capability | Status |
| :--- | :--- |
| Global users list | Partial |
| Per-school student + staff directories | Done (A2) |
| Global password reset | Done (A3) |
| Disable / unlock account | Later |
| Revoke sessions | Later |
| Impersonate school admin (time-boxed + reason + audit) | Later |

### 2.4 Plans, entitlements & platform billing

| Capability | Status |
| :--- | :--- |
| Plan catalog + assign plan to school | Later (remove fake CTAs until real) |
| Feature / module entitlements per plan | Later |
| Seat / SMS / storage quotas | Later |
| Platform invoices to schools (Stripe etc.) | Later |

### 2.5 Security, audit & compliance

| Capability | Status |
| :--- | :--- |
| System logs viewer | Partial |
| SA-action audit (password reset, status change, delete) | Partial → strengthen with A3 |
| Platform credentials vault (SMTP/SMS/payment keys) | Partial |
| Platform security defaults (password policy template for new schools) | Later |
| SA sub-roles (Support / Billing / Owner) | Later |

### 2.6 Communications infrastructure

| Capability | Status |
| :--- | :--- |
| Platform email templates (invite, approve, suspend) | Partial (onboarding mailers) |
| Delivery failure queue | Later |
| Broadcast to all school admins | Later |

### 2.7 Global reports & analytics

| Capability | Status |
| :--- | :--- |
| Aggregate stats page | Partial — `/super-admin/reports`: KPI tiles, billing snapshot, status/plan breakdown, top-schools chart, searchable per-school table |
| Per-school headcount + adoption | Planned (A1 + Reports) |
| Revenue / MRR (when billing exists) | Later |
| CSV export | Later |

### 2.8 Support / customer success

| Capability | Status |
| :--- | :--- |
| School health (checklist %, last admin login) | Later |
| Internal notes on school | Later |
| Tickets linked to school | Later |

### 2.9 Platform configuration

| Capability | Status |
| :--- | :--- |
| Settings tabs (general / security / DB / credentials / notifications) | Partial (credentials real; some tabs thin) |
| Country packs / report-card template catalog at platform level | Later (ties to Liberia / international report cards) |
| Feature flags / beta modules per school | Later |
| Maintenance mode | Later |

---

## 3. Explicit non-goals (default)

Super Admin console should **not** become a second school ERP:

- Entering grades, running roll call, posting fee invoices, approving leave, managing work orders
- Browsing another school’s classrooms as if logged in as Teacher (without a future audited impersonation product)

Read-only **lists** of people (A2) and **account recovery** (A3) are in scope; operational school workflows stay on `/{slug}/…`.

---

## 4. Owning services & data

| Concern | Service | Notes |
| :--- | :--- | :--- |
| Schools, users, roles, password reset, SA auth | **Identity** | Source of truth for counts by role |
| SA route gate | **Gateway** + Identity `authenticateSuperAdmin` | Keep SA JWT separate from school JWT |
| SPA pages | **frontend-spa** | `/super-admin/schools`, detail, users |
| Platform billing (future) | Finance or Identity entitlements | Do not conflate with school fee ledger |

**Count definition (recommended):**

| Metric | Definition |
| :--- | :--- |
| `studentCount` | Users in school with role `STUDENT` (and optionally exclude soft-deleted / inactive — decide at implement) |
| `staffCount` | Users in school whose role is staff/admin family (not `STUDENT` / not `PARENT` alone — product choice: include parents in a third tab) |
| `parentCount` | Optional third list or filter |

**Parents:** Product default — school detail has **Students** and **Staff**; Parents as third tab or filter under Users (document choice in Phase A implementation notes).

---

## 5. UI / IA (target)

| Path | Purpose |
| :--- | :--- |
| `/super-admin` | KPIs including total students across platform |
| `/super-admin/schools` | Table: name, status, **students**, staff, actions → open detail |
| `/super-admin/schools/:id` | Overview + tabs: Students, Staff (, Parents); row → reset password |
| `/super-admin/users` | Cross-tenant search; reset password action |
| `/super-admin/registrations` | Unchanged intake queue |
| `/super-admin/reports` | Headcount + school comparison (honest) |
| `/super-admin/logs` | Include password-reset / SA mutations |
| `/super-admin/settings` | Credentials + future platform defaults |

Chrome: Executive Slate (`PageShell`, `PageHeader`, `Surface`, `StatTile`) — see `FRONTEND_GUIDELINES.md`.

---

## 6. Delivery phases

| Phase | Scope | Exit criteria |
| :--- | :--- | :--- |
| **A — Directory & recovery** | A1 student/staff counts; A2 school detail lists; A3 global password reset + audit | **Done (2026-07-31)** |
| **B — Operator polish** | Search/filters, CSV export, richer audit, disable/unlock, parents tab if needed | **Done (2026-07-31)** |
| **C — SaaS commercial** | Plans, entitlements, quotas, remove fake subscription UI | **Done** — Phase F adds list-price MRR + checkout |
| **D — Support excellence** | Time-boxed impersonation, school health, delivery diagnostics | **Done (2026-07-31)** |
| **E — Enterprise** | SA RBAC, domains, dual-control delete, DSR export/purge | **Done (2026-07-31)** — custom domain stored; DNS not wired |

**Do Phase A first.** Do not block A on billing or impersonation.

---

## 7. Security & acceptance notes for Phase A

### Password reset

- Reuse Identity `assertPasswordResetAllowed` / existing update-password path where possible; wrap with SA-only route.
- Default `mustChangePassword: true`.
- Never return password hashes; one-time plaintext only in create/reset response.
- Confirm before reset; toast on success (not `alert`).
- Log every reset.

### Directory reads

- SA JWT only; no school-scoped token required.
- Paginate; avoid loading entire tenant into one response.
- Do not leak other schools’ data in a single school detail call.

### Acceptance checklist (Phase A)

- [ ] Schools table shows **studentCount** that matches student role count for that school
- [ ] Click school → Students list and Staff list load and are searchable
- [ ] From school detail or Users: Super Admin resets a Teacher password → login works; forced change if flagged
- [ ] Super Admin resets a School Admin password → succeeds (policy)
- [ ] Super Admin resets a Student password → succeeds
- [ ] Non–Super Admin cannot call SA reset/list endpoints
- [ ] System log (or audit) records SA password resets
- [ ] No fake subscription CTAs introduced on these pages
- [ ] Tests: identity unit/policy + HTTP smoke for new SA routes; SPA smoke if practical
- [ ] Docs status banner updated to **partial/done** when shipped; rebuild `identity` + `frontend-spa`

---

## 8. Relation to existing docs

| Doc | Relationship |
| :--- | :--- |
| `ONBOARDING_AND_ADMISSION_PLAN.md` | School create / registrations / suspend — keep; this plan owns **directory depth** + SA recovery |
| `docs/SCHOOL_SETTINGS_PLAN.md` | Tenant admin password reset policy; SA global reset **extends** that policy into SA UI |
| `docs/APP_FEATURES_OVERVIEW.md` | §3 Platform — Super Admin nav; update when Phase A ships |
| `docs/PERMISSIONS_FIX_REPORT.md` | ACL history; new SA routes must stay SA-gated |

---

## 9. Open product decisions (resolve at implement)

1. **Parents:** third tab vs filter under Students/Users?
2. **Inactive users:** include in counts or only `ACTIVE`?
3. **Reset delivery:** UI-only temp password vs always email when SMTP configured?
4. **Staff definition:** exact role enum list for “Staff” tab.

Default recommendations if unspecified: Parents = third tab; counts = non-deleted users; reset = generate + reveal + `mustChangePassword`; Staff = all roles except `STUDENT` and `PARENT` and `SUPER_ADMIN`.
