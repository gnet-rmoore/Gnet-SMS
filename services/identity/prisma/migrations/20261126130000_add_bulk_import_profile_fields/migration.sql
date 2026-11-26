ALTER TABLE "identity"."User" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "identity"."User" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "identity"."User" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "identity"."User" ADD COLUMN IF NOT EXISTS "documents" JSONB;
ALTER TABLE "identity"."User" ADD COLUMN IF NOT EXISTS "customFields" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "User_schoolId_employeeId_key"
  ON "identity"."User" ("schoolId", "employeeId");
