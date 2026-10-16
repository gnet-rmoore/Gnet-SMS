# Super Admin Database Maintenance — backup & optimize

> **Status:** Shipped (2026-10-16) — server-side `pg_dump` backups with off-box copies and `VACUUM (ANALYZE)` across all schemas, wired to Super Admin → Settings → Database.
> **Owning service:** Identity (`dbMaintenance`) + SPA `/super-admin/settings` (Database tab)
> **UI:** Super Admin → Settings → Database
> **Companion:** `docs/SUPERADMIN_CREDENTIALS.md`, `docs/SUPER_ADMIN_PLATFORM_PLAN.md`, `.github/workflows/backup.yml`

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-10-16 | Backup + optimize backend, UI wiring, tests, docs |
| 2026-10-16 | Readiness status endpoint + UI banner, compose env defaults, status-helper tests, troubleshooting runbook |

---

## 0. Product intent

Give Super Admins a working **Backup Database** and **Optimize Tables** action
instead of the previously dead buttons, with backups that survive a server crash.

### Endpoints

| Method | Path | Capability | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/super-admin/database/status` | `settings.manage` | Readiness report (URL, pg tools, S3, retention) |
| `POST` | `/api/super-admin/database/backup` | `settings.manage` | Run `pg_dump`, save + upload |
| `GET` | `/api/super-admin/database/backups` | `settings.manage` | List local backups |
| `GET` | `/api/super-admin/database/backups/:name/download` | `settings.manage` | Stream a dump (falls back to a presigned cloud URL) |
| `DELETE` | `/api/super-admin/database/backups/:name` | `settings.manage` | Delete a dump (local + cloud) |
| `POST` | `/api/super-admin/database/optimize` | `settings.manage` | `VACUUM (ANALYZE)` the whole DB |

All routes require `settings.manage`, which is **OWNER-only** (see
`services/identity/src/domain/saCapabilities.ts`). Enforcement is in
`databaseMaintenanceController` via `platformOpsService.assertSaCapability`.

---

## 1. Backup

- Uses `pg_dump` (plain SQL) against `DATABASE_MAINTENANCE_URL` — the **cluster
  admin** role (`sms`) that spans every schema. The service's own
  `DATABASE_URL` is schema-scoped and would produce a partial dump.
- Dump file: `sms_db_<ISO timestamp>.sql` written to `BACKUPS_DIR`
  (default `/app/backups`, a persistent named volume).
- If S3/MinIO credentials are configured, the dump is **also uploaded off-box**
  under `database-backups/` so it survives a crashed/lost server.
- Retention: the newest `BACKUP_RETENTION` (default 7) dumps are kept locally and
  in the cloud; older ones are pruned automatically.
- The DB password is passed via the `PGPASSWORD` environment variable, never on
  the command line, so it cannot leak through the process list.

### Restore

```bash
psql "$DATABASE_MAINTENANCE_URL" < sms_db_2026-10-16T12-30-45-123Z.sql
```

---

## 2. Optimize

`VACUUM (ANALYZE);` is executed with `psql` against `DATABASE_MAINTENANCE_URL`.
A whole-database `VACUUM` targets every table in every schema, reclaiming space
and refreshing planner statistics. It is safe to run online.

---

## 3. Readiness status (are these features working?)

`GET /api/super-admin/database/status` (also surfaced automatically on
Super Admin → Settings → Database) reports whether backup/optimize can run:

```json
{
  "ready": true,
  "backupReady": true,
  "optimizeReady": true,
  "s3Configured": true,
  "backupsDir": "/app/backups",
  "retention": 7,
  "issues": []
}
```

When `ready` is `false`, `issues` names every missing prerequisite in plain
language, the Settings → Database tab shows an amber banner with those issues,
and the Backup / Optimize buttons are disabled. The pure logic lives in
`summarizeMaintenanceStatus` (`services/identity/src/domain/dbMaintenance.ts`).

### Troubleshooting — the features return 503 / buttons are disabled

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `503 MAINTENANCE_DB_NOT_CONFIGURED` or `issues: ["DATABASE_MAINTENANCE_URL is not set…"]` | Identity service has no admin URL | Set `DATABASE_MAINTENANCE_URL` (cluster role `sms`, not a schema-scoped service URL) and restart identity. Root `docker-compose.yml` and `deploy/docker-compose.yml` now default it to `postgresql://sms:sms@postgres:5432/sms_db`. |
| `503 MAINTENANCE_DB_INVALID` | URL is not a usable `postgres://` URL (wrong protocol / missing user / missing database) | Fix the URL; it must include user + database. |
| `issues: ["pg_dump is not installed…"]` | Identity container image lacks postgres client tools | Rebuild the identity image (its Dockerfile installs `postgresql-client`). Bare-metal hosts need `apt-get install postgresql-client`. |
| `issues: ["psql is not installed…"]` | Same as above (optimize + download cloud-fallback need `psql`) | Same fix. |
| `uploadToCloud` false / no S3 object | S3/MinIO creds not configured | Set `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` (and optionally `S3_ENDPOINT`, `S3_BACKUP_BUCKET`). Local-only backups still work without S3. |
| Backup throws `CREDENTIAL_ENCRYPTION_KEY … required in production` elsewhere | Separate feature; not needed for backup/optimize | Set `CREDENTIAL_ENCRYPTION_KEY` (or `MFA_ENCRYPTION_KEY`) — see `docs/SUPERADMIN_CREDENTIALS.md`. |
| `403 SA_CAPABILITY_DENIED` | Actor's `platformRole` is not OWNER | Sign in as an OWNER (or unset-role) Super Admin. |

Compose wiring notes:

- Root `docker-compose.yml` (dev): `DATABASE_MAINTENANCE_URL` defaults to the
  local cluster admin URL; `CREDENTIAL_ENCRYPTION_KEY` is passed through (code
  falls back to `MFA_ENCRYPTION_KEY`); S3 defaults target the bundled MinIO.
- `deploy/docker-compose.prod.yml`: `DATABASE_MAINTENANCE_URL` must be set in
  `deploy/.env`; `CREDENTIAL_ENCRYPTION_KEY` is **required** (`:?` compose guard).

---

## 4. Configuration

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `DATABASE_MAINTENANCE_URL` | compose default `postgresql://sms:sms@postgres:5432/sms_db` (root + deploy dev stacks) | Admin (cluster `sms`) Postgres URL. **Required for the feature**; when unset the endpoints return `503 MAINTENANCE_DB_NOT_CONFIGURED`. |
| `BACKUPS_DIR` | `/app/backups` | Backups directory (mounted volume). |
| `BACKUP_RETENTION` | `7` | Number of backups to keep. |
| `S3_BACKUP_BUCKET` | `sms-backups` | Off-box bucket (falls back to `S3_BUCKET`). |
| `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_FORCE_PATH_STYLE` | — | Cloud copy target. Point `S3_ENDPOINT` at external S3 for true disaster recovery. |
| `DB_MAINTENANCE_TIMEOUT_MS` | `900000` | Hard timeout per `pg_dump`/`psql` run. |
| `CREDENTIAL_ENCRYPTION_KEY` | — | Required in production for the credentials feature (separate concern). |

The identity image installs `postgresql-client` (`pg_dump`, `psql`) and creates
`/app/backups` owned by the `identity` user.

---

## 5. Audit trail

| Event | Category | Notes |
| :--- | :--- | :--- |
| `database_backup_created` | SETTINGS | name, bytes, `uploadedToCloud` |
| `database_backup_downloaded` | SETTINGS | name |
| `database_backup_deleted` | SETTINGS | name |
| `database_optimized` | SETTINGS | durationMs |

---

## 6. Tests

`npm run test:db-maintenance` (`tests/db-maintenance.test.ts`), also in
`test:unit`: URL parsing, backup filename, path-traversal rejection, retention
pruning, byte formatting, password-free argv/env, optimize SQL, and the
`summarizeMaintenanceStatus` readiness logic (missing/invalid URL, missing
`pg_dump`/`psql`, partial-tool and fully-provisioned cases). Pure — no Postgres
required — so it runs identically in dev and production CI.

Last run (2026-10-16): **70 passed, 0 failed**.

---

## 7. Production runbook

1. Add to `deploy/.env`:
   ```
   DATABASE_MAINTENANCE_URL=postgresql://sms:<admin-password>@postgres:5432/sms_db
   CREDENTIAL_ENCRYPTION_KEY=<openssl rand -base64 32>
   S3_BACKUP_BUCKET=sms-backups
   BACKUP_RETENTION=7
   ```
2. Rebuild/pull the identity image so `pg_dump`/`psql` are present.
3. `docker compose ... up -d identity` and confirm `identity_backups` volume exists.
4. `GET /api/super-admin/database/status` (or open Settings → Database) and
   confirm `"ready": true` with an empty `issues` array before relying on the
   buttons. The tab disables Backup/Optimize and lists the exact missing
   prerequisites when not ready.
5. Settings → Database → **Backup Database**; confirm a row appears and, when S3
   is configured, an object under `database-backups/`.
6. **Backup Database** again and delete the older one to verify retention + delete.
7. **Optimize Tables** and confirm the `database_optimized` audit row.
8. For real disaster recovery, point `S3_ENDPOINT` at storage **on a different
   machine/account** than the app server; a MinIO volume on the same host only
   survives container crashes, not disk/server loss.
