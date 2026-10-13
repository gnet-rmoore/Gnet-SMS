# Super Admin System Logs — comprehensive audit trail

> **Status:** Wave 1 shipped (2026-07-31) — rich SystemLog schema, auth/user/role/tenant writers, SA Logs UI with categories, detail drawer, date range, CSV export.  
> **Owning service:** Identity (`SystemLog`) + SPA `/super-admin/logs`  
> **UI:** `/super-admin/logs`  
> **Companion:** `docs/SUPER_ADMIN_PLATFORM_PLAN.md`, `IMPLEMENTATION_STATUS.md`

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-07-31 | Plan + Wave 1 shipped |

---

## 0. Product intent

Give Super Admins an honest **platform audit feed**: who did what, when, from which device/IP, with before/after when available. Domain money/grade trails stay in their services unless aggregated later.

**Definition of done (Wave 1):** Auth success/fail, logout, password reset, user CRUD/role, tenant status, credentials, and existing SA ops appear in System Logs with filterable category + detail metadata. Export CSV works. No fake hotel/reservation events.

---

## 1. Wave 1 (shipped)

### Schema (`identity.SystemLog`)

Added: `category`, `userEmail`, `userRole`, `browser`, `os`, `deviceType`, `country`, `city`, `sessionId`, `requestId`, `entityType`, `entityId`, `beforeValue`, `afterValue`, `httpMethod`, `endpoint`, `statusCode`, `durationMs`, `source`, `errorMessage`, `tags` (+ indexes).

### Writer

`logSystemEvent(action, module, details, level, req?, extras?)` parses UA, IP, optional geo headers; normalizes `WARN` → `WARNING`; infers category when omitted.

### Events instrumented

| Category | Actions |
| :--- | :--- |
| AUTH / SECURITY | `login_success`, `login_failed`, `login_blocked_*`, `sa_login_*`, `password_reset`, `password_change`, `rate_limit_exceeded` |
| SESSION | `logout` (`POST /api/auth/logout`) |
| USER_MGMT | `user_created`, `user_updated`, `user_deleted`, `user_activated` / `user_deactivated`, `profile_picture_updated` |
| ROLE | `role_assigned` |
| SCHOOLS | `tenant_suspended` / `tenant_activated` / `tenant_status_changed` (+ existing registration/provision) |
| SETTINGS | `api_key_added` / `api_key_removed` |
| SUPER_ADMIN | Existing platform ops (plans, operators, impersonation start, billing, broadcast, DSR, …) |

### API / UI

- `GET /api/super-admin/logs` — filters: `level`, `module`, `category`, `q`/`search`, `from`, `to`, `userId`, `schoolId`, `action`, pagination  
- `GET /api/super-admin/logs/summary` — counts by category/level  
- SPA: category filters, date range, stats, row detail drawer (before/after, device, IP, endpoint), CSV export  

### Verify

1. Sign in as SA → `/super-admin/logs`  
2. Failed school login → SECURITY/AUTH `login_failed`  
3. Create/update/delete user → USER_MGMT rows with before/after  
4. Suspend school → SCHOOLS `tenant_suspended`  
5. Export CSV  

`npm run test:audit-logs`

---

## 2. Taxonomy map (requested list → SMS reality)

Generic hotel/PMS checklists do **not** map 1:1. Below is the honest SMS mapping.

| Requested area | Wave 1 | Later / separate trail |
| :--- | :--- | :--- |
| 1 Authentication | **Partial** — login/fail/logout/password/rate-limit; MFA/OAuth/SSO N/A until product has them | MFA, token refresh, remember-me |
| 2 User management | **Partial** — create/update/delete/activate/role/password/photo | Email verify, restore soft-delete |
| 3 Role & permission | **Partial** — role assign (+ school `RoleChangeAudit`) | Capability matrix override audit |
| 4–7 CRUD / finance / booking / inventory | **Out of SystemLog** | Finance `FeePaymentTxn`; Academic grade history; Ops inventory — aggregate feed Wave 3 |
| 8 Staff activity | Leave/payroll in Staff service | Fan-in later |
| 9–10 Reports / settings | Credential keys; platform settings already logged when SA writers call logger | School settings, report export |
| 11 Security | Failed login, rate limit | Brute-force scoring, WAF signals |
| 12–16 Files / comms / API / jobs / DB | Broadcast/mail diagnostics exist separately | Full API body logging (PII risk) — careful design |
| 17 Module logs (hotel POS/spa/…) | **N/A** — not in product | — |
| 18 System health | SA health endpoints elsewhere | Not audit events |
| 19 Errors | Login/API errors when instrumented | Central error sink |
| 20 Audit trail fields | **Most fields** on SystemLog | Approval workflow, MaxMind geo |
| 21 Sessions | Logout | Idle timeout, revoke, concurrent devices |
| 22–23 Search / export | CSV export of logs | Search-term logging (privacy) |
| 24 Super Admin | Plans, operators, impersonation start, billing, delete request | Impersonation **end** |
| 25 AI | **N/A** | If AI ships |

---

## 3. Waves 2–3 (planned)

**Wave 2:** Impersonation end; school registration reject; capability override audit; enforce `audit.read` on getLogs; retention policy; optional MaxMind.

**Wave 3:** Read-only aggregator across Finance / Academic / Staff / Ops trails into SA “Activity” without copying money into Identity — **plan:** `docs/SA_PLATFORM_SECURITY_AND_ACTIVITY_PLAN.md` Part B.

---

## 4. Non-goals

- Inventing reservation/POS/spa log types  
- Logging full request/response bodies by default (PII)  
- Fake CPU/memory “health logs” in this table  
