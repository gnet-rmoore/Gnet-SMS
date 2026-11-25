ALTER TABLE "identity"."ParentAccessCode"
  ADD COLUMN IF NOT EXISTS "globalLookupHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ParentAccessCode_globalLookupHash_key"
  ON "identity"."ParentAccessCode" ("globalLookupHash");
