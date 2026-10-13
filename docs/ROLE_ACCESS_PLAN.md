# Roles & Access — School Admin role customization

> **Status:** Done (2026-07-24) — assignment **and** per-school capability matrix; **catalog refresh 2026-07-31** (recent features + School Admin full control)  
> **Scope:** School Admin lists users, reassigns roles, and customizes what each staff role can open / approve (defaults = current platform behavior)  
> **Non-goals (this release):** Free-form custom role names beyond the fixed school role catalog; Super Admin platform users; every write API wired to capabilities (key actions expanded below; remaining finance/exam writes still role-gated where noted)  
> **Owning service:** Identity (`/api/schools/:schoolId/users`, `/api/users/:id/role`, `/api/schools/:schoolId/role-capabilities`, `SchoolRoleCapabilityOverride`, `RoleChangeAudit`)  
> **UI:** `/{slug}/roles` — tabs **Assign users** | **Customize roles** (School Admin only)  
> **Companion:** `docs/APP_FEATURES_OVERVIEW.md`, `ROLES_DOCUMENTATION.md`

---

## Behavior

### Assign users

1. **List users** — All users in the school except `SUPER_ADMIN`, with search and role filter.
2. **Show features** — Default sidebar destinations for the user’s role (from `getNavSections`).
3. **Change role** — School Admin picks an assignable role; confirmation; Identity updates `User.role` + `RoleChangeAudit`.
4. **Safety** — No `SUPER_ADMIN` assign/change; last School Admin cannot be demoted; same-tenant only.

### Customize roles (capability matrix)

1. **Defaults** — Every school role starts with platform defaults derived from today’s nav + key actions (e.g. Principal can manage admissions and approve lesson plans).
2. **Overrides** — School Admin toggles capabilities per role for **this school only**. Stored as override rows (`allowed: true|false`); no row = default.
3. **Examples** — Uncheck `action.admissions.manage`, `action.lesson_plans.approve`, and/or `nav.admissions` on Principal so they cannot approve admissions or lesson plans (and optionally hide Admissions in the sidebar).
4. **Locked for School Admin** — Cannot remove `action.roles.assign`, `action.roles.customize`, `nav.roles`, or `nav.dashboard` from School Admin.
5. **Session** — Login / `GET /api/auth/me` returns `capabilities[]` (also embedded in JWT). Sidebar and routes filter by `nav.*`. Affected users refresh on next sign-in (admin session refreshes after save).

### Enforcement

| Surface | How |
| :--- | :--- |
| Sidebar | Layout filters items by session capabilities |
| Routes | `ProtectedRoute` checks `nav.*` when capabilities are present |
| Admissions APIs | Lifecycle `requireCapability("action.admissions.manage", …)` |
| Lesson plan review | Academic checks `action.lesson_plans.approve` |
| Class schedule write | Academic `action.schedules.manage` (JWT caps) / Principal·VPI·School Admin legacy |
| Leave approval | Staff `action.leave.approve` |
| Bulk roster import | Identity `action.bulk_import.roster` |

### School Admin defaults (2026-07-31)

School Admin receives **every catalog capability except** parent-only `nav.children`, including specialty ops (library, clinic, transport, …), transcripts, student records, notifications, schedules, and all `action.*` keys. Locked keys (`nav.dashboard`, `nav.roles`, role assign/customize) cannot be revoked.

---

## Verify

1. Sign in as School Admin → **People → Roles & Access → Customize roles**.
2. Select **Principal** → uncheck **Manage / approve admissions** and **Approve or return lesson plans** → Save.
3. Sign in as Principal → Admissions / approve actions denied (sidebar may hide Admissions if `nav.admissions` also off).
4. Reset Principal to defaults → Principal regained access after re-login.
5. `npm run test:role-access` and `npm run test:identity-capabilities` pass.
6. Confirm Customize shows **Class Schedules**, **Bulk import**, **Notifications**, specialty hubs, and new Actions categories.

## Change log

### 2026-07-31 — Catalog refresh for recent features

- **Change:** Added nav/action keys for schedules manage, bulk import, fees manage, grade-review decide, exam-paper approve, payroll run, settings templates, notifications, student-records; School Admin defaults = full catalog (− children); Principal/VPI/Registrar/ops defaults aligned; SPA ↔ Identity copies synced.
- **Affects:** School Admin **Customize roles** matrix; JWT sessions after re-login / matrix save.
- **Services:** identity, academic, staff, frontend-spa.
- **Status:** done.
- **Verify:** Roles & Access → Customize → School Admin shows specialty + new actions; Principal can lose `action.schedules.manage`; `npm run test:identity-capabilities`.

### 2026-07-24 — Per-school capability matrix

- **Change:** Catalog + defaults; `SchoolRoleCapabilityOverride`; Customize roles UI; login capabilities; admissions + lesson-plan approve enforcement.
- **Affects:** School Admins customizing staff roles; Principals/VPIs/others subject to overrides.
- **Services:** identity, api-gateway, academic, lifecycle, frontend-spa.
- **Status:** done.
- **Verify:** Customize Principal as above; re-login as Principal.

### 2026-07-24 — Polish (assignment)

- Audit rows include actor/target names; self role-change updates session nav; role distribution strip.
