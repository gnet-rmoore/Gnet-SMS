# School API keys

> **Status:** Done (2026-08-05) — dedicated Settings → **API keys** tab; in-page guide; IT Admin access; loading fix.

## What changed

| Area | Change |
| :--- | :--- |
| **Settings UI** | API keys moved from Security tab to its own **API keys** sidebar tab (`?tab=API_KEYS`). Collapsible “How school API keys work” guide on the page. |
| **IT Admin** | Nav **Security** section: Roles & Access, Security policies, API keys. Settings shows only Security + API keys tabs. Read-only Roles & Access (no assign/customize). |
| **Identity API** | `GET /api/schools/:id/users` and `GET …/role-audit` allow `IT_ADMIN` (view-only). Key CRUD unchanged: `SCHOOL_ADMIN` + `IT_ADMIN`. |
| **Bug fix** | API keys list no longer stuck on “Loading keys…” (unstable i18n helper in `useCallback` deps caused infinite refetch). |
| **API docs page** | `/{slug}/api-docs` — in-app reference with auth guide, **12 categories / 70+ GET endpoints**, searchable catalog, **live GET console** (API key auto-filled from browser session after create). Dashboard quick action for School Admin + IT Admin only. |

## Who it affects

- **School Admin** — full API key management; all settings tabs unchanged.
- **IT Admin** — security-focused settings + view Roles & Access; cannot change roles or capability matrix (School Admin only).
- **Integrations** — unchanged read-only `API_CLIENT` behavior via gateway.

## Owning service(s)

- **Identity** — key storage, verify, entitlement `api_access`, user/audit read for IT Admin.
- **Gateway** — `X-API-Key` / Bearer `gnet_live_*` exchange for JWT.
- **Frontend** — `src/features/api-docs/Page.tsx`, `ApiKeysSettingsCard`, Settings tabs, IT Admin nav.

## How school API keys work

### Purpose

Machine credentials for scripts and external tools (Power BI, nightly sync jobs, custom dashboards) that need **read-only** access to a school’s data without a staff login.

### Create & store

1. School Admin or IT Admin opens **Settings → API keys** (requires `api_access` on the school plan).
2. Name the key; the full secret (`gnet_live_…`) is shown **once** and stored hashed in Identity (`SchoolApiKey`).
3. Active keys list shows name, prefix, and last-used date only.

### Authenticate

Send on every request (either header works):

```http
X-API-Key: gnet_live_xxxxxxxx
```

or

```http
Authorization: Bearer gnet_live_xxxxxxxx
```

Gateway calls Identity `POST /api/internal/api-keys/verify`, receives a **15-minute** JWT with role `API_CLIENT` scoped to the school.

### Read-only enforcement

All domain services reject non-`GET` requests for `API_CLIENT`:

```json
{ "error": "API keys are read-only" }
```

### Revoke

Delete/revoke in Settings; takes effect immediately. Creation and revocation are audited.

### Plan gate

- Entitlement: **`api_access`** (Premium default or Super Admin override).
- Without entitlement: UI shows upgrade message; API routes return `403 FEATURE_NOT_ENTITLED`.

## Example (verify locally)

Replace `{slug}`, `{schoolId}`, and `{key}`:

```bash
curl -sS -H "X-API-Key: gnet_live_YOUR_KEY" \
  "http://localhost:8081/api/schools/{schoolId}/students?limit=5"
```

Expect `200` with JSON body on GET; `403` on POST/PATCH.

## Verify in UI

1. Sign in as **School Admin** on a Premium (or `api_access`) school → **Settings → API keys**.
2. Create key “Test sync” → copy secret → list shows prefix, not secret.
3. Revoke key → row disappears.
4. Sign in as **IT Admin** → sidebar **Security** section → same API keys tab + **Roles & Access** (view only, no Change role).
5. IT Admin **Settings** shows only **Security** and **API keys** tabs.
6. **Dashboard** quick action **API documentation** opens `/{slug}/api-docs` (School Admin + IT Admin only; not in sidebar nav).

## Related docs

- `docs/PLANS_ENTITLEMENTS_ENFORCEMENT_PLAN.md` — `api_access` + gateway key auth
- `ROLES_DOCUMENTATION.md` — IT Admin scope
