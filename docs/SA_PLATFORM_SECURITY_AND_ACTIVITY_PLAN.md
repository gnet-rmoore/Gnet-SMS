# Super Admin platform security UI + cross-service activity — Implementation plan

> **Status:** Done for v1 scope (2026-08-06) — platform settings wired, operator MFA login, Academic/Staff/Ops activity feeds + CSV export  
> **Goal:** Replace decorative SA Settings security cards with **real platform policy** (maintenance, default school security template, optional platform-operator MFA), and ship **Wave 3** read-only **activity aggregator** across domain services without duplicating finance PII into Identity  
> **Companion:** `docs/SA_SYSTEM_AUDIT_LOGS_PLAN.md`, `docs/SUPER_ADMIN_PLATFORM_PLAN.md`, `docs/SCHOOL_MFA_2FA_PLAN.md`, `IMPLEMENTATION_STATUS.md`

---

## 0. Problem today

| Gap | Current state |
| :--- | :--- |
| **SA 2FA / session UI** | `SuperAdmin/Settings.tsx` SECURITY tab — disabled cards + “Coming soon” / “Managed per school” (`opacity-70`) |
| **Platform settings API** | `GET/PATCH /api/super-admin/platform-settings` exists — **maintenanceMode**, **defaultSecurityPolicy**, email fields — **not wired to SECURITY tab** |
| **Platform operator MFA** | Same as school MFA — not built; SA accounts use password only |
| **Cross-service activity** | `SA_SYSTEM_AUDIT_LOGS_PLAN.md` Wave 3 — Finance fee txns, Academic grade edits, Staff leave, Ops WO live in **domain DBs**; SA Logs = Identity `SystemLog` only |
| **Wave 2 partial** | `impersonation_end`, `entitlement_override` shipped; `audit.read` enforcement partially done |

---

## 1. Scope

### Part A — Platform settings UI (in scope)

Wire existing + extended `PlatformSettings` to SA Settings tabs:

| Setting | Storage | UI |
| :--- | :--- | :--- |
| Maintenance mode + message | `PlatformSettings` | Already elsewhere or GENERAL tab — consolidate |
| Default school security template | `defaultSecurityPolicy` JSON | SECURITY: editor for password rules applied on new schools |
| Platform operator MFA policy | New fields on `PlatformSettings` | SECURITY: require TOTP for `SUPER_ADMIN` role (depends on `SCHOOL_MFA_2FA_PLAN` core) |
| Session / JWT policy (honest) | Env + docs | Display read-only JWT TTL; optional future `sessionIdleMinutes` platform default |

### Part B — Cross-service activity aggregator (in scope)

| # | Deliverable |
| :--- | :--- |
| B.1 | New SA page or **Logs → Activity** tab: unified timeline **read-only** |
| B.2 | Identity proxies/fan-in from domain **internal audit endpoints** (no full row copy) |
| B.3 | Filters: school, user, date, domain (FINANCE, ACADEMIC, STAFF, OPS), action |
| B.4 | CSV export of aggregated view (metadata only) |

### Out of scope

- Writing domain events into Identity `SystemLog` (except platform ops already there)  
- Full request/response body logging  
- SSO / OAuth provider configuration  
- Storing TLS private keys for custom domains  

---

## 2. Owning services & key files

| Part | Service | Files |
| :--- | :--- | :--- |
| Platform settings | identity | `platformOpsService.ts`, `superAdminController.ts`, `prisma/schema.prisma` (`PlatformSettings`) |
| SA Settings SPA | frontend-spa | `src/pages/SuperAdmin/Settings.tsx` |
| Aggregator API | identity (+ gateway) | New `platformActivityService.ts`, routes under `/api/super-admin/activity` |
| Domain feeds | finance, academic, staff, ops | New `GET /api/internal/audit/events` per service (paginated, scoped) |
| SA UI | frontend-spa | `src/pages/SuperAdmin/Logs.tsx` tab or `Activity.tsx` |

---

## 3. Part A — Platform security UI phases

### Phase A1 — Wire existing PlatformSettings (3–5 days)

| # | Work | Acceptance |
| :--- | :--- | :--- |
| A1.1 | Load `GET /api/super-admin/platform-settings` on Settings mount | No hard-coded “Off” badges |
| A1.2 | SECURITY tab: **Default school security policy** form (password min, strong, idle hint) | PATCH persists; audit `platform_settings_updated` |
| A1.3 | Link maintenance controls to same API (if split today, merge) | Maintenance banner on SPA when `maintenanceMode` |
| A1.4 | Remove fake 2FA toggle OR replace with link: “Platform operator MFA — see enrollment when available” until A2 | No decorative switch |

**Capability:** `settings.manage`

### Phase A2 — Platform operator MFA (after school MFA Phase A)

| # | Work | Acceptance |
| :--- | :--- | :--- |
| A2.1 | `PlatformSettings.requireOperatorMfa: boolean` | When true, SA login requires TOTP |
| A2.2 | SECURITY tab: enforce toggle + link to Profile enroll | Cannot enable until ≥1 operator enrolled (or break-glass doc) |
| A2.3 | Session policy card: show JWT TTL from env; optional platform `defaultSessionIdleMinutes` for SPA idle logout | Honest read-only for JWT secret/TTL |

**Tests:** extend `test:super-admin-platform`, `test:audit-logs`

---

## 4. Part B — Activity aggregator phases

### Phase B1 — Contract + Finance feed (1 week)

**Unified event shape (all services):**

```ts
type ActivityEvent = {
  id: string;           // service-prefixed e.g. finance:txn:uuid
  occurredAt: string;
  schoolId: string;
  actorUserId?: string;
  actorEmail?: string;
  domain: "FINANCE" | "ACADEMIC" | "STAFF" | "OPS" | "IDENTITY";
  action: string;       // fee_payment_recorded, grade_entry_updated, ...
  summary: string;      // human, no full PII payload
  entityType?: string;
  entityId?: string;
  level?: "INFO" | "WARN";
};
```

| # | Work | Acceptance |
| :--- | :--- | :--- |
| B1.1 | Finance `GET /api/internal/audit/events?schoolId&from&to&page` | Fee payments, voids, partial payments — summary only |
| B1.2 | Identity aggregator merges Finance + SystemLog with sort by time | `GET /api/super-admin/activity` |
| B1.3 | SA UI tab with filters | Paginated list |

### Phase B2 — Academic + Staff + Ops feeds (1–2 weeks)

| Service | Source tables / actions |
| :--- | :--- |
| academic | Grade entry changes, exam publish, promotion commit |
| staff | Leave approve/reject, payroll mark paid |
| ops | Work order status, inventory adjust |

Each service: internal route, `authenticateInternal`, cap at 90-day window, page size 50.

### Phase B3 — Export + performance

| # | Work |
| :--- | :--- |
| B3.1 | CSV export (same filters) |
| B3.2 | Cache last fetch per service (optional 30s) to avoid N+4 sequential timeouts |
| B3.3 | `requireCap(actor, "audit.read")` on all activity routes |

**Tests:** `tests/super-admin-activity.test.ts` (mock domain responses); HTTP smoke optional row.

---

## 5. UI design (Executive Slate)

**Option (recommended):** Extend `/super-admin/logs` with tabs:

- **Platform log** — existing SystemLog (current page)  
- **Cross-service activity** — aggregated feed (Wave 3)

Copy: “Money and grade details stay in domain services; this view shows who did what and when.”

---

## 6. Documentation updates (same PRs)

| When | Update |
| :--- | :--- |
| A1 done | `docs/SUPER_ADMIN_PLATFORM_PLAN.md`, `IMPLEMENTATION_STATUS.md` — remove “decorative 2FA” gap |
| A2 done | `docs/SCHOOL_MFA_2FA_PLAN.md` cross-link platform operator path |
| B3 done | `docs/SA_SYSTEM_AUDIT_LOGS_PLAN.md` Wave 3 → Done |

---

## 7. Verification

```bash
npm run test:super-admin-platform
npm run test:audit-logs
npm run test:http-smoke   # + activity route 403 without audit.read
```

Manual:

1. SA → Settings → edit default security policy → provision new school inherits template  
2. SA → Logs → Activity → filter Finance → see fee events after portal payment  
3. ANALYST role with `audit.read` only → can read, cannot PATCH plans  

**Rebuild:** `identity`, `finance`, `academic`, `staff`, `ops` (as feeds land), `api-gateway`, `frontend-spa`.

---

## 8. Effort estimate

| Part | Calendar (1 dev) |
| :--- | :--- |
| A1 Platform settings wire-up | 3–5 days |
| A2 Platform operator MFA | 3–5 days (after school MFA A) |
| B1–B3 Activity aggregator | 2–3 weeks |

---

## 9. Change log

| Date | Note |
| :--- | :--- |
| 2026-08-06 | Plan authored — SA security UI + audit Wave 3 aggregator |
| 2026-08-06 | **Shipped:** `requireOperatorMfa` login challenge; Academic (`GradeHistory`), Staff (`LeaveRequest`), Ops (`WorkOrder`/`InventoryItem`) internal audit feeds; SA activity CSV export; Logs → Cross-service activity tab |
