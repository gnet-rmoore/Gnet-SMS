# Super Admin — editable Plans & entitlements + operator provisioning

> **Status:** Wave 1–2 shipped (2026-07-31); **runtime enforcement shipped (2026-08-04)** — see `docs/PLANS_ENTITLEMENTS_ENFORCEMENT_PLAN.md`. Operator create/deactivate/reset-password (temp password reveal in UI); DB-backed plan catalog edit/create; school entitlement/quota override UI. **Remaining:** operator **email invite**; `requireCap` on all legacy SA routes; SA Settings decorative 2FA/session controls.  
> **Scope:** (1) Let Super Admin **edit** the SaaS plan catalog and per-school entitlement/quota overrides in the UI. (2) Let Super Admin **invite/add** other global platform operators who help manage the platform.  
> **Owning service:** Identity (`services/identity`) + SPA Super Admin pages  
> **UI:** `/super-admin/plans`, `/super-admin/operators`, school detail plan panel  
> **Companion:** `docs/SUPER_ADMIN_PLATFORM_PLAN.md` (Phases A–F done), `IMPLEMENTATION_STATUS.md`, `FRONTEND_GUIDELINES.md`  
> **Caps:** `plans.manage`, `operators.manage` (OWNER / BILLING for plans; OWNER for operators)

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-07-31 | Plan authored |
| 2026-07-31 | **Shipped:** `POST/PATCH /api/super-admin/operators` (+ reset-password); `PlatformPlan` table + `PATCH/POST /api/super-admin/plans`; Plans edit/create + override UI; School Detail entitlement overrides; SA login returns `capabilities` |
| 2026-07-31 | **Public pricing:** `GET /api/public/plans` + landing `#pricing` section (list prices / entitlements preview) |

---

## 0. Product intent (plain English)

Today “Plans & entitlements” is mostly a **viewer + school assigner**. Plan definitions (price, seats, feature keys) live in TypeScript (`platformPlans.ts`). Per-school entitlement/quota overrides exist on the **API** but not in the UI. Operators can already **change roles** among existing Super Admins, but **cannot hire** a new platform helper — only seed/DB inserts create `SUPER_ADMIN` users.

**Definition of done:**

1. An OWNER/BILLING operator can edit plan labels, prices, quotas, and feature sets (and optionally add/retire plan codes) without a deploy, and can set/clear per-school entitlement and quota overrides from Plans / School Detail.
2. An OWNER can invite or create another global operator (email + platform role), force password change, deactivate them, and never strand the platform without an OWNER.

---

## 1. Current state (audit)

### Feature 1 — Plans & entitlements

| Area | Today | Gap |
| :--- | :--- | :--- |
| Catalog source | In-code `PLATFORM_PLANS` in `services/identity/src/domain/platformPlans.ts` | No DB; no CRUD API |
| `GET /api/super-admin/plans` | Returns catalog | Read-only |
| `PATCH …/schools/:id/plan` | Assign `planCode`; body may include `entitlementsOverride`, `quotaOverrides` | SPA only sends `planCode` |
| UI `/super-admin/plans` | Cards + assign dropdown | No edit form; no override editor |
| School detail | Plan select; features as text | No checkboxes / quota fields |
| Feature gating in school SPA | Sparse (e.g. custom domain); JWT does not carry entitlements | Editing entitlements has limited runtime effect |

### Feature 2 — Global operators

| Area | Today | Gap |
| :--- | :--- | :--- |
| Roles | `platformRole`: OWNER / SUPPORT / BILLING / ANALYST | Matrix in `saCapabilities.ts` |
| `GET /api/super-admin/operators` | List SAs + capabilities | — |
| `PATCH …/operators/:id/role` | Change role (not self) | — |
| Create / invite SA | **Missing** | Cannot add helpers from UI |
| Deactivate SA | Global user disable **refuses** `SUPER_ADMIN` | Stuck operators |
| SPA Operators page | List + role change + dual-control deletes | No “Add operator” |
| Cap enforcement | `requireCap` on newer routes; older SA routes any-SA JWT | Non-OWNER can still hit some endpoints |

---

## 2. Non-goals (v1)

- Building a full Stripe product catalog sync or self-serve school upgrade portal.
- Natural-language “AI” plan builder.
- Per-school nginx / TLS matrix (still out of SA Phase F).
- Demoting Super Admin into a school-tenant role via this flow (separate product decision).
- Fine-grained per-endpoint custom capabilities beyond the existing matrix (can extend later).

---

## Feature 1 — Editable Plans & entitlements

### 1.1 Target behavior

1. **Catalog editor** on `/super-admin/plans` (capability `plans.manage`):
   - Edit for each plan: `label`, `description`, `monthlyPriceUsd`, `maxStudents` / `maxStaff` / `maxStorageMb` (null = unlimited), `features[]`, optional `trialDays`.
   - Optional v1.1: create new plan code (uppercase slug) and soft-retire unused codes (cannot delete if any school still assigned).
2. **Per-school overrides** on Plans table and/or School Detail:
   - Toggle feature keys on/off relative to plan baseline (stored as `School.entitlementsOverride` JSON).
   - Override quotas (`quotaOverrides`).
   - Clear overrides → fall back to catalog plan.
3. **Resolve path** stays one function: effective entitlements = plan features ∪/override rules already used by Identity (do not invent a second resolver).
4. **Audit:** every catalog change and school override writes `systemLog` with actor + before/after summary.
5. **MRR honesty:** changing `monthlyPriceUsd` updates list-price MRR for future calculations; do not invent historical ledger rows.

### 1.2 Data model options

| Option | Approach | Recommendation |
| :--- | :--- | :--- |
| **A — DB catalog** | New Identity tables `PlatformPlan` + optional `PlatformPlanFeature`; seed from current `PLATFORM_PLANS`; code becomes fallback defaults | **Preferred** for true edit-without-deploy |
| **B — JSON blob** | Single `PlatformSettings.plansJson` row | Faster but weaker validation / history |
| **C — Keep code** | Only ship override UI; catalog stays deploy-time | Too weak for “edit Plans” ask |

**v1 choice: Option A** (Prisma in `identity` schema).

Suggested fields:

```text
PlatformPlan
  code            String  @id          // FREE, TRIAL, …
  label           String
  description     String
  maxStudents     Int?
  maxStaff        Int?
  maxStorageMb    Int?
  featuresJson    String               // JSON string[] of feature keys
  monthlyPriceUsd Float
  trialDays       Int?
  isActive        Boolean @default(true)
  sortOrder       Int     @default(0)
  updatedAt       DateTime
```

Keep `School.planCode`, `entitlementsOverride`, `quotaOverrides` as today.

Migration: on boot or one-shot seed, upsert rows from `PLATFORM_PLANS` if table empty; `listPlatformPlans()` reads DB first, falls back to code constants if empty (safe rollback).

### 1.3 APIs (Identity)

| Method | Route | Cap | Behavior |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/super-admin/plans` | `plans.manage` or schools.read | Unchanged shape; source = DB |
| `PATCH` | `/api/super-admin/plans/:code` | `plans.manage` | Update label/price/limits/features/trialDays/isActive |
| `POST` | `/api/super-admin/plans` | `plans.manage` | Create plan (v1.1; can slip to Phase P1b) |
| `PATCH` | `/api/super-admin/schools/:id/plan` | `plans.manage` | Already exists — SPA must send overrides |
| `GET` | `/api/super-admin/schools/:id` (or plans payload) | — | Ensure response includes effective entitlements + raw overrides for editor |

Validation:

- Feature keys ⊆ `PLATFORM_FEATURE_KEYS` (extendable constant).
- Prices ≥ 0; limits null or ≥ 0.
- Cannot set `isActive: false` while schools still use that `planCode` (force reassignment first).

### 1.4 UI

- **Plans page:** each plan card gets Edit → modal (`FeatureModalShell`) with fields + feature checkboxes; Save calls `PATCH`.
- **School assign row:** expand or link to override panel (features + quotas); Save uses existing plan PATCH body.
- **School Detail:** same override controls beside plan select.
- i18n keys under `pages.superAdmin.plans.*` / `errors:*`.
- Gate edit actions if login payload lacks `plans.manage` (see Feature 2 Phase O2 for caps on SPA).

### 1.5 Phases (Feature 1)

| Phase | Outcome | Effort |
| :--- | :--- | :--- |
| **P0** | Prisma `PlatformPlan` + seed upsert + `listPlatformPlans` reads DB | S |
| **P1** | `PATCH /plans/:code` + Plans page edit modal | M |
| **P2** | School entitlement + quota override UI (Plans + School Detail) wired to existing PATCH | M |
| **P3** | Optional create plan + soft-retire; audit log polish; tests | S–M |
| **P4** *(optional later)* | Pass effective entitlements into school session / nav gating | L — separate honesty track |

### 1.6 Acceptance (Feature 1)

- [ ] OWNER/BILLING can change STANDARD price and features; refresh shows new values without redeploy.
- [ ] School assigned STANDARD with finance unchecked via override loses effective `finance` (resolver + UI reflect it).
- [ ] Quotas override visible on school health / plan panel.
- [ ] Analyst/Support without `plans.manage` get 403 on PATCH.
- [ ] `npm run test:super-admin-platform` (extend) covers resolve + PATCH validation.
- [ ] Docs + `IMPLEMENTATION_STATUS` updated when shipped.

---

## Feature 2 — Add global platform operators

### 2.1 Target behavior

1. OWNER (cap `operators.manage`) can **Add operator** from `/super-admin/operators`:
   - Fields: name, email, `platformRole` (default SUPPORT), optional temporary password **or** email invite.
2. Created user: `role=SUPER_ADMIN`, `schoolId=null`, `mustChangePassword=true` (if temp password), `isActive=true`, `platformRole` set.
3. **Invite path (preferred):** create inactive-or-pending token; email link → set password → activate (reuse patterns from school invite accept where practical).
4. **Temp password path (MVP):** return one-time password to OWNER UI (copy once) + optional welcome email; force change on first SA login.
5. **Deactivate:** `PATCH …/operators/:id` `{ isActive: false }` — blocks SA login; cannot deactivate last active OWNER.
6. **Guards:**
   - Cannot create duplicate email.
   - Cannot change own role (already) or deactivate self if sole OWNER.
   - Only OWNER can grant OWNER (optional: require dual confirmation for second OWNER).
7. **Audit** every create / role change / deactivate.
8. Password reset for operators: allow OWNER to reset another SA’s password (today global reset refuses SUPER_ADMIN — lift with `operators.manage` + last-OWNER rules).

### 2.2 APIs (Identity)

| Method | Route | Cap | Behavior |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/super-admin/operators` | `operators.manage` | Create SA + role; body `{ name, email, platformRole, sendInvite?: boolean, password?: string }` |
| `POST` | `/api/super-admin/operators/:id/resend-invite` | `operators.manage` | Resend invite / rotate temp password |
| `PATCH` | `/api/super-admin/operators/:id` | `operators.manage` | `{ isActive?, name? }` — deactivate/reactivate |
| `PATCH` | `/api/super-admin/operators/:id/role` | existing | Keep |
| `POST` | `/api/super-admin/auth/invite/accept` *(if invite)* | public + token | Set password |

Login already rejects inactive users for school path; ensure `superAdminLogin` also checks `isActive`.

### 2.3 UI

- Operators page: primary **Add operator** button → modal (name, email, role select, Invite vs Temp password).
- Table actions: Change role (existing), Deactivate / Reactivate, Resend invite, Reset password.
- Show capability chips (already) so OWNER understands SUPPORT vs BILLING.
- Hide Add / Deactivate if current user lacks `operators.manage`.

### 2.4 Capability enforcement hardening (same initiative)

| Phase | Work |
| :--- | :--- |
| **O0** | Create + deactivate APIs + UI (MVP temp password) |
| **O1** | Email invite accept flow + resend |
| **O2** | Return `capabilities[]` (or `platformRole`) consistently on SA login/me; hide SA nav items by cap |
| **O3** | Apply `requireCap` to remaining legacy `superAdminService` routes (schools write, credentials, registrations, …) |
| **O4** | Tests: create SUPPORT → denied `plans.manage`; last-OWNER deactivate blocked |

### 2.5 Acceptance (Feature 2)

- [ ] OWNER creates SUPPORT operator; that user logs in via Super Admin tab with temp password and is forced to change password.
- [ ] New SUPPORT cannot PATCH plans or manage operators (403).
- [ ] Cannot deactivate the last active OWNER.
- [ ] Operators list shows the new user immediately.
- [ ] Audit log rows for create / deactivate / role change.
- [ ] Docs updated; seed note: production should invite a second OWNER promptly.

---

## 3. Shared delivery order

Recommended sequence (unblocks honest ops first):

| Wave | Deliverable |
| :--- | :--- |
| **1** | Feature 2 O0 (add/deactivate operators) — unblocks staffing the console |
| **2** | Feature 1 P0–P2 (DB catalog + edit + school overrides) |
| **3** | Feature 2 O1–O3 (invite + SPA/nav caps + route hardening) |
| **4** | Feature 1 P3–P4 as needed |

Rebuild after Identity + SPA changes: `docker compose up --build -d identity frontend-spa` (+ gateway only if routes change). Tests: extend `tests/super-admin-platform-ops.test.ts` / `npm run test:super-admin-platform`.

---

## 4. Risks & honesty notes

- **Editing entitlements without school SPA gating** looks powerful but won’t hide finance/payroll pages until P4 — document that clearly in UI helper text (“Overrides affect platform checks now; full module lock comes later”).
- **MRR** uses list prices — editing price changes reported MRR for `ACTIVE_PAID` schools; call that out in the edit modal.
- **Invite email** depends on configured mailer; always support temp-password fallback.
- **SECURITY:** temp passwords shown once; never log them; rate-limit invite/accept like login.

---

## 5. Doc / status updates when implementing

1. Flip this banner to Partial/Done per wave.
2. Changelog entry on `docs/SUPER_ADMIN_PLATFORM_PLAN.md` pointing here as Phase G.
3. One line under `IMPLEMENTATION_STATUS.md` Honest gaps.
4. Update `CREDENTIALS.md` / seed comments only if demo creates a second operator (prefer not in production seeds).

---

## 6. First implementation slice (when execution starts)

1. `POST /api/super-admin/operators` + Operators “Add” modal + last-OWNER guard on deactivate.  
2. Prisma `PlatformPlan` seed + `PATCH /api/super-admin/plans/:code` + Plans edit modal.  
3. Wire school override checkboxes to existing plan PATCH.  
4. Tests + rebuild Identity + frontend-spa.
