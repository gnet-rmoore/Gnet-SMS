# Deploy GNET SMS to production (AWS Lightsail)

One Linux server on **AWS Lightsail** runs the whole app with Docker Compose.
The domain is **gnetsms.com**. Docker Hub username: **gnetllc**.

## What you have

| What you have | Value |
| :--- | :--- |
| Web app | `https://gnetsms.com` |
| File uploads | `https://files.gnetsms.com` |
| Docker Hub user | `gnetllc` (password kept in `deploy/.env` on this computer, not in this doc) |
| GitHub repo | the repository containing this project |
| Server | Lightsail Ubuntu — public IP `3.147.239.14` (us-east-2, Ohio) |
| SSH | user `ubuntu`, using the default key for the **us-east-2** region |

The stack: Postgres, Redis, MinIO (file storage) + 9 API services + API gateway +
frontend, all behind Caddy which handles HTTPS automatically.

> Tip: the compose files you need are at the **repo root** (`docker-compose.yml` +
> `docker-compose.prod.yml` + `docker-compose.hub.yml`). `deploy/` only holds the
> production `.env` template and Docker config snippets.

---

## 1. Create the Lightsail server (one time)

1. Go to https://lightsail.aws.amazon.com → **Create instance**.
2. Choose:
   - **Blueprint:** Linux/Unix → **OS only → Ubuntu 22.04** (Docker installs cleanly)
   - **Plan:** $24/month (4 GB RAM / 2 vCPU / 80 GB SSD) as a start. Don't use the $5 plan — the stack needs more than 512 MB RAM.
   - **Name:** `gnet-sms`
3. After it's live, under **Networking**:
   - Tap the instance → **Networking** → **Create static IP** and attach it. Your
     current public IP (`3.147.239.14`) is the one to use; attaching a static IP
     stops it from changing if the instance ever restarts.
   - **Firewall:** open only ports **22, 80, 443**. Close the rest.

## 2. Point your domain at the server (one time)

In your Namecheap DNS for `gnetsms.com`:

| Record | Host | Value |
| :--- | :--- | :--- |
| A | `@` | `3.147.239.14` |
| A | `www` | `3.147.239.14` |
| A | `files` | `3.147.239.14` |

Caddy gets the HTTPS certificates automatically once DNS points here.

## 3. Install Docker on the server (one time)

SSH in using the default key for the Ohio (us-east-2) region. You can also use
the browser-based SSH from the Lightsail console:

```bash
ssh -i DefaultKey-us-east-2.pem ubuntu@3.147.239.14
```

Then:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker   # or log out / back in
```

Check both work:

```bash
docker --version
docker compose version
```

## 4. Get the code and set secrets (one time)

```bash
git clone <your GitHub repo URL> gnet-sms
cd gnet-sms
```

Create the environment file from the production template (`deploy/.env.example`)
and edit it:

```bash
cp deploy/.env.example .env
nano .env
```

Fill in / confirm these (this is the important part). Generate one secret per
empty line with `openssl rand -hex 32`:

```env
DOCKERHUB_USER=gnetllc
APP_DOMAIN=gnetsms.com
APP_URL=https://gnetsms.com
S3_PUBLIC_URL=https://files.gnetsms.com
ACME_EMAIL=admin@gnetsms.com
PLATFORM_EDGE_HOSTNAME=gnetsms.com
PLATFORM_HOSTS=gnetsms.com,www.gnetsms.com
PLATFORM_CNAME_TARGET=3.147.239.14

JWT_ACCESS_SECRET=paste-random-64-hex
SUPER_ADMIN_JWT_SECRET=paste-random-64-hex
RECEIPT_HMAC_SECRET=paste-random-64-hex
INTERNAL_SERVICE_TOKEN=paste-random-64-hex
MFA_ENCRYPTION_KEY=paste-base64-32-byte-key    # openssl rand -base64 32

MINIO_ROOT_USER=gnet
MINIO_ROOT_PASSWORD=paste-random-password
```

Log in to Docker Hub (image pulls on the server may need auth):

```bash
docker login -u gnetllc
# type your Docker Hub password when prompted
```

`.env` is in `.gitignore`, so it never gets committed.

## 5. Start everything

First start builds the images, so give it 10–30 minutes:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile edge up -d --build
```

Check the containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## 6. Verify it's live

- Open **https://gnetsms.com** — you should get the app (HTTPS cert appears
  within a minute or two).
- Health check from the server:

  ```bash
  curl -fsS https://gnetsms.com && echo OK
  ```

- First run seeds demo accounts. Password for all: `admin123`

  | Role | Email |
  | :--- | :--- |
  | Super Admin | `superadmin@yoursms.com` |
  | School Admin | `schooladmin@yoursms.com` |
  | Principal / Teacher / Student / Parent | `principal@yoursms.com` / `teacher@yoursms.com` / `student@yoursms.com` / `parent@yoursms.com` |

- Change the admin passwords before going live.

## 7. Updating the app

On the server:

```bash
cd gnet-sms && git pull --ff-only
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.hub.yml --profile edge pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.hub.yml --profile edge up -d
```

This pulls the pre-built images from Docker Hub (`gnetllc/gnet-sms-*`) and
restarts only what changed. Your data is untouched. (If the images are private,
run `docker login -u gnetllc` first.)

## 8. Backups (do this early)

Simple daily database dump to a file on the server:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres \
  pg_dump -U sms -d sms_db > ~/backups/sms_$(date +%F).sql
```

Copy it somewhere off the server (S3, another drive, your laptop). The uploaded
files live in MinIO; decide a cadence for copying those too. A backup that lives
on the same server isn't a real backup.

## 9. Auto-deploy on git push (optional, later)

`.github/workflows/deploy.yml` builds all images, pushes them to Docker Hub
(`gnetllc/gnet-sms-*`), then SSHs into the server and re-pulls. To use it you
need these GitHub *repository secrets*:

- `DOCKERHUB_USERNAME` = `gnetllc` / `DOCKERHUB_PASSWORD` = your Docker Hub password (or an access token)
- `LIGHTSAIL_HOSTNAME` = `3.147.239.14`
- `LIGHTSAIL_SSH_USER` = `ubuntu`
- `LIGHTSAIL_SSH_KEY` = the whole contents of your us-east-2 default key file
- `LIGHTSAIL_DEPLOY_DIR` = `~/gnet-sms` (server path to the repo)

Start with the manual steps above first; flip on auto-deploy once it's stable.

---

## Troubleshooting

| Problem | Fix |
| :--- | :--- |
| `https://gnetsms.com` doesn't load | DNS not propagated yet (wait 15–60 min) or check firewall has 80/443 open. |
| Site loads but "files" / uploads broken | Make sure the `files` A record exists, `S3_PUBLIC_URL` matches it, and MinIO CORS allows the portal origin (`MINIO_API_CORS_ALLOW_ORIGIN`; defaults to `*` for signed uploads). |
| Login fails | `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` — `api-gateway` and `identity` must show healthy; check logs: `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs identity`. |
| Port already in use on the server | Something else owns 80/443. Stop it, or change the ports in `docker-compose.yml`. |
| Want to wipe everything | `docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v` — deletes **all** data. Only run this if you mean it. |

## Don't forget (production checklist)

- [ ] Static IP attached; A records for `@`, `www`, `files`
- [ ] Firewall: only 22, 80, 443
- [ ] Real secrets in `.env` (not the templates)
- [ ] Admin passwords changed from `admin123`
- [ ] A backup off the server before/right after going live
- [ ] Domain HTTPS works (`https://gnetsms.com`)