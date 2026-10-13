# Custom domain edge — operator runbook

> Companion to `docs/CUSTOM_DOMAIN_EDGE_PLAN.md`. For Super Admin Help definitions see `/super-admin/help`.

## What the product does

1. **Ownership** — School Detail saves a hostname; school adds TXT `_gnet-sms.<domain>` = token; **Verify TXT**.
2. **Routing** — Browser Host header → `GET /api/public/resolve-host` → school branding on Login.
3. **HTTP edge** — `frontend-spa` nginx uses `server_name _` so any Host that reaches the container is served.
4. **HTTPS** — Optional Caddy (`docker compose --profile edge`) issues certificates only when `GET /api/public/domain-tls-ask?domain=` returns 200 (platform host or **verified** custom domain).

Certificates are **not** stored in the database.

## DNS checklist (per school)

| Step | Record | Value |
| :--- | :--- | :--- |
| 1 | TXT `_gnet-sms.<hostname>` | Token shown in School Detail |
| 2 | Click **Verify TXT** in Super Admin | Must succeed before resolve-host matches |
| 3 | CNAME `<hostname>` | `PLATFORM_CNAME_TARGET` / `PLATFORM_EDGE_HOSTNAME` (or A → edge IP) |

## Env (Identity)

```bash
PLATFORM_EDGE_HOSTNAME=app.yourplatform.com
PLATFORM_CNAME_TARGET=app.yourplatform.com   # optional; defaults to edge/APP_URL host
PLATFORM_HOSTS=app.yourplatform.com,www.yourplatform.com
APP_URL=https://app.yourplatform.com
ACME_EMAIL=ops@yourplatform.com              # for Caddy
```

## Enable HTTPS edge

```bash
ACME_EMAIL=ops@yourplatform.com docker compose --profile edge up -d edge
```

Point public DNS for the platform (and school CNAMEs) at the machine running `edge`. Keep using `:8080` for local HTTP without TLS.

## Super Admin APIs

| Endpoint | Role |
| :--- | :--- |
| `PATCH /api/super-admin/schools/:id/domain` | Set/clear hostname |
| `POST /api/super-admin/schools/:id/domain/verify` | Check TXT |
| `GET /api/super-admin/domain-edge` | CNAME target, verified list, nginx/caddy snippets |
| `GET /api/public/resolve-host?host=` | Login tenant resolve |
| `GET /api/public/domain-tls-ask?domain=` | Caddy ask (200/404) |

## Entitlement

Plan feature key `custom_domain` (Enterprise by default). Override on School Detail if needed.
