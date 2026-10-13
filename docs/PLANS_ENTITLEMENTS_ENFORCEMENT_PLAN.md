# Plans & entitlements — runtime enforcement

> **Status:** Done (2026-08-04) — API gates on all domain microservices; SPA nav + route guards; seat quotas on student/staff create; session carries entitlements; trial auto-lock; API keys; document storage quota.  
> **Owning service(s):** Identity (source of truth) + all domain services + SPA  
> **Companion:** `docs/SA_PLANS_EDITOR_AND_OPERATORS_PROVISIONING_PLAN.md`, `docs/SUPER_ADMIN_PLATFORM_PLAN.md`

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-08-04 | **Shipped:** Path-based entitlement middleware on Identity, Academic, Lifecycle, Finance, Staff, Comms, Classroom, Campus, Ops; quota enforcement on student/staff create; login/`/api/auth/me` + `GET /api/schools/:id/entitlements` for tenants; SPA nav + `ProtectedRoute` plan guard; public apply checks `admissions` entitlement. |
| 2026-08-04 | **Deferred items shipped:** Trial `trialEndsAt` auto-lock on login/session/public slug; `api_access` school API keys (Settings → Security, gateway `X-API-Key` / Bearer); document upload storage quota via `maxStorageMb` plan cap. |

---

## What changed

| Layer | Behavior |
| :--- | :--- |
| **Identity** | Resolves plan + overrides; internal `GET …/entitlements` and `GET …/quotas`; tenant `GET /api/schools/:id/entitlements`; login/session returns `entitlements` + `quotas`; `assertStudentQuota` / `assertStaffQuota` on create; trial expiry blocks login with `TRIAL_EXPIRED`; school API keys under `/api/schools/:id/api-keys` (requires `api_access`) |
| **Domain services** | `mountEntitlementGate` in each `app.ts` — JWT-aware path rules return `403 FEATURE_NOT_ENTITLED` |
| **Comms** | Document create/update enforces `maxStorageMb` via internal quotas; returns `403 QUOTA_EXCEEDED` |
| **Gateway** | `applyApiKeyAuth` exchanges `X-API-Key` / Bearer API key for short-lived JWT; routes `api-keys` → identity |
| **SPA** | `authStore.entitlements`; sidebar + GlobalSearch filtered; deep links blocked with `/forbidden?reason=plan`; trial expiry redirects to school-unavailable page; Settings → Security shows API key manager when entitled |
| **Public apply** | Lifecycle `assertPublicApplyAllowed` rejects schools without `admissions` or with expired trial |

## Verify

1. Set a school to **FREE** in Super Admin → Plans.
2. Sign in as School Admin — **Finance**, **Gradebook**, **Admissions** nav items hidden; direct URL `/slug/gradebook` → plan forbidden page.
3. `curl -H "Authorization: Bearer …" /api/schools/:id/exams` → `403` + `FEATURE_NOT_ENTITLED`.
4. Create students until FREE quota (50) — next create returns `QUOTA_EXCEEDED`.
5. PREMIUM school — Library/Transport API + nav available.
6. Set school status **TRIAL** with `trialEndsAt` in the past — login and `/api/auth/me` return `403 TRIAL_EXPIRED`; SPA shows trial-ended page.
7. PREMIUM school — Settings → Security → create API key; `curl -H "X-API-Key: gnet_live_…" /api/schools/:id/students` succeeds (GET-only for `API_CLIENT` role).
8. Upload documents until plan `maxStorageMb` exceeded — create returns `QUOTA_EXCEEDED`.

## Tests

```bash
npm run test:entitlements
npm run test:deferred-entitlements
npm run test:school-unavailable
```
