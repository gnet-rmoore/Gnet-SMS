ALTER TABLE IF EXISTS "public"."School" ADD COLUMN IF NOT EXISTS "transcriptTemplate" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE IF EXISTS "identity"."School" ADD COLUMN IF NOT EXISTS "transcriptTemplate" TEXT NOT NULL DEFAULT 'classic';
