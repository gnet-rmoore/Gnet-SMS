# Super Admin Database Backup Guide

## Where to find it

Sign in as a Super Admin and open **Settings → Database**. The Database tab
shows whether backup prerequisites are ready, lets you create a backup, and
lists locally available backups with their size and creation time.

## Creating and managing backups

1. Check the readiness banner. If backup is unavailable, the banner lists the
   missing configuration or PostgreSQL tool.
2. Select **Backup Database**. The identity service runs `pg_dump` against
   `DATABASE_MAINTENANCE_URL` and writes a timestamped plain-SQL dump named
   `sms_db_<timestamp>.sql` to `BACKUPS_DIR` (default `/app/backups`).
3. If S3-compatible credentials are configured, the dump is also uploaded to
   the configured bucket under `database-backups/`. The API response includes
   whether this cloud upload succeeded; the Settings tab confirms that the
   backup was created.
4. Use **Download** to save a listed dump or **Delete** to remove it. Downloads
   use the local copy first and can fall back to a temporary signed cloud URL.

The service keeps the newest `BACKUP_RETENTION` files (default 7) and prunes
older local copies and their matching cloud objects after a backup. Without
cloud credentials, backups are local only and do not survive loss of the
server's backup volume. The history list is based on local files; a cloud-only
copy appears as a fallback for download, not as a separate history entry.

## What the dump contains

`pg_dump` exports the database addressed by `DATABASE_MAINTENANCE_URL`, including
its schemas and data. The URL must use a Postgres cluster-level role with access
to all platform schemas; the identity service's schema-scoped `DATABASE_URL`
may produce an incomplete dump. The connection password is passed to the
PostgreSQL process through `PGPASSWORD`, not as a command-line argument.

Backups are plain SQL and may contain sensitive school and user information.
Restrict access to the backup volume and cloud bucket, and protect downloaded
files accordingly.

## Restore

Restore from a trusted copy using a Postgres client with access to the target
database. This is a destructive operation when restoring over an existing
database; coordinate downtime and take a separate copy first.

```powershell
psql "$env:DATABASE_MAINTENANCE_URL" -f "sms_db_<timestamp>.sql"
```

For detailed environment configuration, readiness checks, and troubleshooting,
see [SA_DATABASE_MAINTENANCE.md](./SA_DATABASE_MAINTENANCE.md).
