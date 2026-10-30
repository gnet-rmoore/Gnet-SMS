# Running GNET SMS — Development & Production Plan

This plan documents **how to run the platform in development and in production**,
and clarifies which file is canonical for each mode. It consolidates and points at
the existing guides rather than replacing them:

- Dev/quick-start: [`docs/DOCKER_SETUP.md`](./DOCKER_SETUP.md), [`README.md`](../README.md)
- Prod (AWS Lightsail): [`production-docs/DEPLOYMENT_PLAN.md`](../production-docs/DEPLOYMENT_PLAN.md)
- Architecture: [`production-docs/PRODUCTION_ARCHITECTURE.md`](../production-docs/PRODUCTION_ARCHITECTURE.md)
- Native dev workflow: [`docs/development-guide.md`](./development-guide.md)

---

## 1. Canonical files (read this first)

There are **two parallel compose packages** in the repo. They are *not* identical
(verified with a diff) — treat the **repo root** as canonical.

> **Production status — already production-ready, unchanged by this plan.**
> The platform is already structured and hardened for production:
> `docker-compose.yml` (base) + `docker-compose.prod.yml` (+ `--profile edge`) is
> the complete, working production path documented in
> `production-docs/DEPLOYMENT_PLAN.md`. This plan makes **no changes to
> production**. Everything added here — the `docker-compose.dev.yml` override — is
> strictly **additive and dev-only**; it must never be layered onto the prod stack
> and prod must never reference it.

| File (repo root) | Role |
| :--- | :--- |
| `docker-compose.yml` | **Base** stack: Postgres, Redis, MinIO, 9 services + gateway + SPA. Production-shaped on purpose: data stores are **not** published (`ports: []`), `NODE_ENV=production`, origins/secrets from `.env`. Shared by both modes. |
| `docker-compose.dev.yml` | **Development-only override** (additive). Publishes Postgres/Redis on `127.0.0.1`, forces localhost origins, loosens MinIO CORS, supplies local-dev fallback secrets. Layer it **on top of** the base file for dev. **Never** combine with `docker-compose.prod.yml`. |
| `docker-compose.prod.yml` | **Production overrides**: real secrets from `.env` (fails fast if unset), app host ports moved to `127.0.0.1` loopback (only Caddy is exposed), restart policies, nginx tuning, edge env. Always **last** in the `-f` chain. |
| `docker-compose.hub.yml` | Use **pre-built Docker Hub images** (`gnetllc/gnet-sms-*`) instead of building. |
| `docker-compose.minio-fix.yml` | Pins MinIO/MinIO-MC to pullable mirrors (Hub removed `minio/minio` & `minio/mc`, Sept 2026). Add when `pull` fails. |
| `.env.example` | **Dev-oriented** template (`NODE_ENV=development`, `localhost` origins, `change-me` secrets). |
| `.env` | Local secrets. **Git-ignored** (`.gitignore`: `.env*`, `!.env.example`). Never commit. |
| `docker/` | Postgres `init-schemas.sql` + `migrations/`, `nginx/00-tuning.conf`, `minio-init.sh`, `edge/Caddyfile`. |
| `Dockerfile`, `Dockerfile.frontend`, `services/*/Dockerfile` | Per-service image builds. |

`deploy/` is a **self-contained, older snapshot** of the same set (its own
`docker-compose.yml`, `docker-compose.prod.yml`, `docker/`, and a **production**
`.env.example`). It differs from the root. The deployment guide says: *use the
compose files at the repo root; `deploy/` only holds the production `.env`
template and config snippets.* **Do not mix root and `deploy/` files in one `-f`
chain.** Treat `deploy/docker-compose*.yml` as legacy unless a task explicitly
targets it.

> Stale/ignore: `docker-compose.yml.bak`, `docker-compose-min.yml`,
> `docker-compose-minimal.yml`, `docker-compose-db.yml`, `docker-compose-test.yml`,
> `recovered-from-image/`. Not part of the standard dev/prod flow.

**Service map** (from `PRODUCTION_ARCHITECTURE.md`): `identity` 3011, `lifecycle`
3010, `ops` 3012, `staff` 3013, `classroom` 3014, `academic` 3015, `finance`
3016, `comms` 3017, `campus` 3018, `api-gateway` 8081, `frontend-spa` 80→8080.
One Postgres cluster (`sms_db`), **schema-per-service** roles, one Redis, MinIO
for object storage.

---

## 2. Development

### 2.1 Prerequisites
- **Docker Desktop / Engine** with Compose V2 (`docker compose`).
- **Node.js 18+** and npm — only needed for Option B (native).
- ~8 GB RAM free (16 GB comfortable); a few GB disk.
- Ports free: `8080`, `8081`, `5432`, `6379`, `9000/9001`, `3010–3018`.
  (`5432`/`6379` are published because the dev override enables them.)

### 2.2 Option A — Full stack in Docker (recommended; no Node on host)
From the repo root, layer the dev override on top of the base file:

```bash
cp .env.example .env      # optional for local; dev override has fallback secrets
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

`docker-compose.dev.yml` is **not** auto-loaded (only `docker-compose.override.yml`
is), so pass it explicitly with `-f`.

What the dev override changes (vs. the production-shaped base):
- Publishes **Postgres** `127.0.0.1:5432` and **Redis** `127.0.0.1:6379` for
  local tooling (`psql`, Prisma Studio, DB GUIs).
- Forces `APP_URL`/`S3_PUBLIC_URL` to `localhost` so a production `.env` can never
  leak into a dev run, and sets MinIO CORS to `*`.
- Supplies **local-dev fallback secrets** (`JWT_ACCESS_SECRET`, etc.) so a fresh
  clone runs without a fully populated `.env`; a real `.env` still wins.

- First build downloads base images and builds every service (~10–30+ min).
- Open **http://localhost:8080** (SPA). API gateway: http://localhost:8081.
  MinIO console: http://localhost:9001. Services: http://localhost:3010–3018.
- Postgres init runs `docker/postgres/init-schemas.sql`; each service runs its
  entrypoint migration on start (`scripts/service-entrypoint.sh`); **identity
  seeds demo users** (`RUN_SEED=true`).

**Demo logins** (password `admin123`): `superadmin@yoursms.com`,
`schooladmin@yoursms.com`, `principal@yoursms.com`, `teacher@yoursms.com`,
`student@yoursms.com`, `parent@yoursms.com`.

### 2.3 Option B — Native Vite + services in Docker (hot reload)
For fast frontend iteration, run the SPA with Vite and only the backend in Docker
(per `IMPLEMENTATION_STATUS.md`: *local dev = `vite` + `/api` proxy → gateway*).
The dev override publishes Postgres to `localhost:5432`, so Prisma from the host
works out of the box.

```bash
# 1. Start the backend deps (or the full stack minus the SPA)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d \
  postgres redis db-roles minio minio-init \
  identity lifecycle ops staff classroom academic finance comms campus api-gateway

# 2. Install deps + prepare DB (SQLite is NOT supported; use Postgres)
npm install
npx prisma db push
npx prisma db seed

# 3. Run the Vite dev server (proxies /api → gateway)
npm run dev
```

### 2.4 Day-to-day dev commands

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f --tail=100 frontend-spa api-gateway identity
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d frontend-spa   # rebuild one service
docker compose -f docker-compose.yml -f docker-compose.dev.yml stop                         # stop, keep volumes
docker compose -f docker-compose.yml -f docker-compose.dev.yml down                         # remove containers, keep volumes
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v                      # DESTROYS DB/Redis/MinIO data
```

> Shorthand (POSIX shells): `export DEV="-f docker-compose.yml -f docker-compose.dev.yml"`
> then `docker compose $DEV ps`. On Windows PowerShell, define
> `$DEV = @('-f','docker-compose.yml','-f','docker-compose.dev.yml')` and call
> `docker compose @DEV ps`.

### 2.5 Verify (dev)
```bash
curl -sS http://localhost:8081/health/live
curl -sS http://localhost:8081/health/ready
curl -sS -o NUL -w "%{http_code}\n" http://localhost:8080/    # PowerShell
```

---

## 3. Production (AWS Lightsail, Docker Compose)

Full step-by-step (server, DNS, firewall, SSH) lives in
`production-docs/DEPLOYMENT_PLAN.md`. Summary:

### 3.1 One-time
1. Lightsail Ubuntu 22.04, **≥ 4 GB RAM** ($24/mo plan; do not use $5/512 MB).
2. Attach a **static IP**; firewall opens **only 22, 80, 443**.
3. DNS A records → static IP: `@`, `www`, `files`.
4. Install Docker + Compose plugin; add user to `docker` group.

### 3.2 Environment (`.env`)
```bash
cp deploy/.env.example .env    # production template (repo root)
nano .env                      # fill real values
```
Required keys (generate secrets with `openssl rand -hex 32`, key with `-base64 32`):
`DOCKERHUB_USER`, `APP_DOMAIN`, `APP_URL`, `S3_PUBLIC_URL`, `ACME_EMAIL`,
`PLATFORM_EDGE_HOSTNAME`, `PLATFORM_HOSTS`, `PLATFORM_CNAME_TARGET`,
`JWT_ACCESS_SECRET`, `SUPER_ADMIN_JWT_SECRET`, `RECEIPT_HMAC_SECRET`,
`INTERNAL_SERVICE_TOKEN`, `MFA_ENCRYPTION_KEY`, `CREDENTIAL_ENCRYPTION_KEY`,
`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` (must be set **before first `up`**),
`SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`.
`docker-compose.prod.yml` uses `${VAR:?set in .env}` so a missing secret **fails
the deploy** instead of silently using a dev default.

Classroom banner uploads are browser-to-object-storage `PUT` requests. Set
`S3_PUBLIC_URL` to the browser-reachable HTTPS base (not the Docker-only
`minio:9000` endpoint), and configure the bucket CORS policy to allow the app's
`APP_URL` origin, `PUT`/`GET`/`HEAD`, and the `Content-Type` request header.
Local development uses the `localhost:9000` override and permissive MinIO CORS.

### 3.3 First deploy (build on the server)
```bash
docker login -u gnetllc
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile edge up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```
Caddy (`edge`, profile) terminates TLS via Let's Encrypt on 80/443.

### 3.4 Updates (pull pre-built images)
```bash
git pull --ff-only
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.hub.yml --profile edge pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.hub.yml --profile edge up -d
```

### 3.5 Verify (prod)
```bash
curl -fsS https://gnetsms.com && echo OK
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs identity
```
Then **change all admin passwords** away from `admin123`.

### 3.6 Backups (off the server)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres \
  pg_dump -U sms -d sms_db > ~/backups/sms_$(date +%F).sql
```
Copy off-box (S3/another host). Also decide a cadence for MinIO object data.

### 3.7 Rollback
Pin `DOCKER_TAG=<previous-sha>` (see `docker-compose.hub.yml`) and re-`up -d`, or
use the GitHub Actions workflow dispatch. Details: `PRODUCTION_ARCHITECTURE.md §8.2`.

---

## 4. Command matrix

| Mode | Working dir | Command |
| :--- | :--- | :--- |
| Dev — full stack | repo root | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d` |
| Dev — native SPA | repo root | `npm run dev` (+ backend via the dev compose) |
| Dev — rebuild one | repo root | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d <service>` |
| Prod — first build | server (repo root) | `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile edge up -d --build` |
| Prod — update | server (repo root) | add `-f docker-compose.hub.yml` + `pull` + `up -d` |
| Prod — status/logs | server (repo root) | `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` / `logs -f` |
| MinIO pull fails | any | append `-f docker-compose.minio-fix.yml` |
| Prebuilt images (team) | repo root | `docker compose -f docker-compose.yml -f docker-compose.hub.yml pull` then `up -d --no-build` |

Rule of thumb: **dev = base `docker-compose.yml` + `docker-compose.dev.yml`; prod = base + `docker-compose.prod.yml` (+ `edge` profile), with `docker-compose.hub.yml` for prebuilt/pin, and `docker-compose.minio-fix.yml` if MinIO pulls fail.** Never mix `docker-compose.dev.yml` with `docker-compose.prod.yml`.

---

## 5. Troubleshooting (common)

| Symptom | Fix |
| :--- | :--- |
| SPA loads, login fails | ensure `api-gateway` + `identity` healthy; check their logs |
| Empty data after rebuild | volumes persist; use `down -v` **only** intentionally |
| UI changes not showing | rebuild `frontend-spa`, hard-refresh browser |
| `pull access denied ... minio/*` | add `-f docker-compose.minio-fix.yml` |
| Prod deploy aborts with "set in .env" | a required secret is missing/empty — fill it and retry |
| `https://gnetsms.com` not loading | DNS not propagated, or 80/443 not open |
| Uploads broken | check `files` A record + `S3_PUBLIC_URL` |

---

## 6. Open items / decisions

1. **`deploy/` vs root duplication** — decide whether to delete/retire the
   `deploy/docker-compose*.yml` copies to prevent drift (they already differ from
   root). Recommendation: keep only `deploy/.env.example` + non-compose snippets,
   or clearly mark `deploy/` as archive.
2. ~~Dev override file~~ — **done:** `docker-compose.dev.yml` was added and is
   used as `-f docker-compose.yml -f docker-compose.dev.yml`. (It is not
   auto-loaded; `docker-compose.override.yml` would be, but the explicit name
   keeps prod and dev commands visibly distinct.)
3. ~~Update existing dev docs~~ — **done:** `docs/DOCKER_SETUP.md` and `README.md`
   now use the two-file dev command (`-f docker-compose.yml -f docker-compose.dev.yml`),
   and `npm run docker:dev` / `docker:dev:down` were added to `package.json`.
4. **`start` vs docs mismatch** — `package.json` `start` runs
   `vite preview ... --port 8080`, while `development-guide.md §"Start Production
   Server"` says port `3000`. Reconcile the doc.
5. **Dev override hardening (optional)** — the dev file publishes Postgres/Redis
   on loopback only and uses fallback secrets; confirm this is acceptable or bind
   to `localhost` only (already the case).
