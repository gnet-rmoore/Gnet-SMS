ALTER TABLE "identity"."ParentAccessCode"
  ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
