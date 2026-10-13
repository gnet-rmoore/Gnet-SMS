# Run Gnet SMS with Docker (any computer)

This is the **recommended** way to build and run the full microservices stack on a fresh machine (macOS, Windows, or Linux). You do **not** need Node.js installed on the host for the default path — only Docker.

## Prerequisites

| Requirement | Notes |
| :--- | :--- |
| **Docker Engine** or **Docker Desktop** | Recent version with Compose V2 (`docker compose`, not only `docker-compose`) |
| **Git** | To clone the repository |
| **RAM** | ~8 GB free recommended for first build; 16 GB more comfortable |
| **Disk** | Several GB for images + Postgres/Redis/MinIO volumes |
| **Ports free on the host** | `8080` (SPA), `8081` (API gateway), `5432` (Postgres), `6379` (Redis), `9000`/`9001` (MinIO). Domain services also bind `3010–3017` |

### Install Docker

- **macOS / Windows:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux:** Docker Engine + Compose plugin (e.g. `docker-compose-plugin` on Debian/Ubuntu)

Confirm:

```bash
docker --version
docker compose version
```

## 1. Get the code

```bash
git clone <YOUR_REPO_URL> Gnet-SMS-2026
cd Gnet-SMS-2026
```

Use the same branch your team develops on (often `main` or `master`).

## 2. Environment (optional for local demo)

Compose already ships sensible **local defaults** (Postgres user/password, MinIO, internal URLs). For a quick try on another computer you can skip `.env`.

For secrets closer to production, or to override the public URL:

```bash
cp .env.example .env
```

Edit at least if you expose the app beyond localhost:

- `APP_URL` — public origin(s), comma-separated (default includes `http://localhost:8080`)
- JWT / `INTERNAL_SERVICE_TOKEN` — change before any shared or production deploy (see `.env.example`)

You usually **do not** need to set per-service `DATABASE_URL`s; compose injects schema-scoped URLs for each service.

## 3. Build images and start the stack

From the repo root:

```bash
docker compose up --build
```

### Option B — Pull pre-built images from Docker Hub (faster for teammates)

Images are published under **`gnetllc/gnet-sms-*`** on Docker Hub. After cloning the repo:

```bash
export DOCKERHUB_USER=gnetllc
docker compose -f docker-compose.yml -f docker-compose.hub.yml pull
docker compose -f docker-compose.yml -f docker-compose.hub.yml up -d --no-build
```

To publish updated images from your machine (after `docker compose build`):

```bash
docker logout
docker login -u gnetllc
./scripts/publish-docker-hub.sh
```

- First run downloads base images and **builds** every service image — often **10–30+ minutes** depending on network and CPU.
- Leave the terminal open to follow logs, **or** run detached:

```bash
docker compose up --build -d
```

What starts by default:

- Postgres + `db-roles` (schemas / DB roles)
- Redis, MinIO (+ init)
- Domain services: identity, lifecycle, ops, staff, classroom, academic, finance, comms
- `api-gateway`, `frontend-spa`

On first Postgres volume create, schemas come from `docker/postgres/init-schemas.sql`. Each domain container runs `prisma db push` on start; **identity seeds demo users**.

## 4. Open the app

| URL | Purpose |
| :--- | :--- |
| **http://localhost:8080** | Web UI (SPA). API calls go through the gateway; realtime via Classroom. |
| http://localhost:8081 | API gateway (optional direct use) |
| http://localhost:3010–3017 | Domain services (debug only) |
| http://localhost:9001 | MinIO console (local object storage) |

### Demo logins

Password for seeded accounts: **`admin123`**

| Role | Email |
| :--- | :--- |
| Super Admin | `superadmin@yoursms.com` |
| School Admin | `schooladmin@yoursms.com` |
| Principal | `principal@yoursms.com` |
| Teacher | `teacher@yoursms.com` |
| Student | `student@yoursms.com` |
| Parent | `parent@yoursms.com` |

Public marketing pages (no login): `/`, `/modules`, `/pricing`, `/register-school`.

### Quick health checks

```bash
curl -sS http://localhost:8081/health/live
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8080/
docker compose ps
```

Gateway ready check (all upstreams configured):

```bash
curl -sS http://localhost:8081/health/ready
```

## 5. Day-to-day commands

```bash
# Status
docker compose ps

# Logs (follow)
docker compose logs -f --tail=100 frontend-spa api-gateway identity

# Stop containers (keep data volumes)
docker compose stop

# Start again without rebuild
docker compose up -d

# Rebuild only what you changed (examples)
docker compose up --build -d frontend-spa
docker compose up --build -d identity api-gateway frontend-spa

# Stop and remove containers (volumes kept)
docker compose down

# Full reset — DESTROYS DB / Redis / MinIO data
docker compose down -v
```

After a code pull on another machine:

```bash
git pull
docker compose up --build -d
```

## 6. Hardware / OS tips

- **Apple Silicon (M1/M2/M3):** Docker Desktop works; first build still compiles Node images for `linux/arm64` unless you force a platform.
- **Windows:** Prefer WSL2 backend in Docker Desktop; run commands from the cloned repo inside WSL or a path Docker can mount cleanly.
- **Corporate VPN / slow DNS:** Image pulls and `npm ci` inside builds may fail or time out — retry or use a mirror if your org provides one.
- **Port already in use:** Stop the other process or change the left-hand port in `docker-compose.yml` (e.g. `"8088:80"` for the SPA) and open that URL instead.

## 7. Optional profiles

**Emergency monolith** (not needed for normal use):

```bash
docker compose --profile monolith up -d sms-api
```

**Custom-domain edge (Caddy / TLS)** — see [`CUSTOM_DOMAIN_EDGE.md`](./CUSTOM_DOMAIN_EDGE.md):

```bash
ACME_EMAIL=you@example.com docker compose --profile edge up -d edge
```

## 8. Architecture (short)

One **Postgres** database (`sms_db`) with **schema-per-service** roles; one **Redis**; SPA on **nginx** proxies `/api` → gateway. Details: [`IMPLEMENTATION_STATUS.md`](../IMPLEMENTATION_STATUS.md), [`MICROSERVICES_ROADMAP.md`](../MICROSERVICES_ROADMAP.md).

## Troubleshooting

| Symptom | What to try |
| :--- | :--- |
| SPA loads but login/API fails | `docker compose ps` — ensure `api-gateway` and `identity` are healthy; check `docker compose logs api-gateway identity` |
| `db-roles` exited | Normal after success (`restart: on-failure`). Re-run `docker compose up -d db-roles` if schemas were wiped |
| Empty / wrong data after rebuild | Volumes persist; use `docker compose down -v` only if you intend to wipe |
| Build OOM / killed | Close other apps; increase Docker Desktop memory; rebuild one service at a time |
| Changes not visible in UI | Rebuild SPA: `docker compose up --build -d frontend-spa` then hard-refresh the browser |

---

**Summary for a new computer:** install Docker → clone repo → `docker compose up --build -d` → open **http://localhost:8080** → sign in with `schooladmin@yoursms.com` / `admin123`.
