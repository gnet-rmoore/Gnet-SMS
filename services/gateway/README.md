# API Gateway

Phase 6 thin reverse proxy. Routes `/api/*` to the eight domain services per `resolveUpstream()`.

**Default:** `DISABLE_MONOLITH=true` — no fallback to `sms-api`. Missing upstream → `503`.

## Env

| Variable | Required (Phase 6) | Purpose |
| :--- | :--- | :--- |
| `DISABLE_MONOLITH` | default `true` | Set `false` only for emergency monolith fallback |
| `MONOLITH_URL` | only if disable=false | Legacy `sms-api` upstream |
| `IDENTITY_URL` … `COMMS_URL` | yes | Domain service bases |
| `APP_URL` / `CORS_ORIGIN` | recommended | CORS allowlist |
| `PORT` | no (`8081`) | Listen port |

## Health

- `GET /health/live` — process up
- `GET /health/ready` — all `*_URL` set when monolith disabled
- `GET /api/health` — gateway-owned (does not call monolith)

## Local

```bash
# From repo root — no sms-api
docker compose up --build api-gateway identity lifecycle ops staff classroom academic finance comms

# Emergency monolith
docker compose --profile monolith up -d sms-api
# DISABLE_MONOLITH=false MONOLITH_URL=http://sms-api:3000
```

Traffic: **client → nginx (frontend-spa) → api-gateway:8081 → domain service**.  
Sockets: **client → nginx `/socket.io/` → classroom:3014** (not via gateway).
