-- Concurrent index for the online-exam expiry sweep.
--
-- The academic schema is managed with `prisma db push` (see service-entrypoint.sh),
-- which creates indexes NON-concurrently and can lock writes on a large table.
-- This script is the production-safe variant: apply it manually during a
-- low-traffic window BEFORE/independent of a deploy, so the sweep query
-- (status='IN_PROGRESS' AND endsAt < now) uses an index instead of a seq scan.
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction, so run this file
-- on its own (psql -f ...), not wrapped in BEGIN/COMMIT.
--
-- Idempotent: safe to re-run.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ExamAttempt_status_endsAt_idx"
  ON "academic"."ExamAttempt" ("status", "endsAt");
