ALTER TABLE "identity"."User" ADD COLUMN IF NOT EXISTS "temporaryPasswordEncrypted" TEXT;
ALTER TABLE "identity"."User" ADD COLUMN IF NOT EXISTS "temporaryPasswordIssuedAt" TIMESTAMP(3);
