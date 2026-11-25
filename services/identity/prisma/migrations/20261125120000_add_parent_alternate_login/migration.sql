ALTER TABLE "identity"."MfaSmsChallenge" ADD COLUMN IF NOT EXISTS "scopeKey" TEXT;
CREATE INDEX IF NOT EXISTS "MfaSmsChallenge_userId_purpose_phoneE164_scopeKey_idx"
  ON "identity"."MfaSmsChallenge" ("userId", "purpose", "phoneE164", "scopeKey");

CREATE TABLE IF NOT EXISTS "identity"."ParentAccessCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeLookupHash" TEXT NOT NULL,
  "codeHint" TEXT NOT NULL,
  "secretVersion" INTEGER NOT NULL DEFAULT 1,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "ParentAccessCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ParentAccessCode_codeLookupHash_key"
  ON "identity"."ParentAccessCode" ("codeLookupHash");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentAccessCode_userId_schoolId_key"
  ON "identity"."ParentAccessCode" ("userId", "schoolId");
CREATE INDEX IF NOT EXISTS "ParentAccessCode_schoolId_issuedAt_idx"
  ON "identity"."ParentAccessCode" ("schoolId", "issuedAt");

CREATE TABLE IF NOT EXISTS "identity"."ParentPhoneLogin" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "phoneE164" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastCodeSentAt" TIMESTAMP(3),
  "codesSentWindow" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3),
  CONSTRAINT "ParentPhoneLogin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ParentPhoneLogin_userId_schoolId_key"
  ON "identity"."ParentPhoneLogin" ("userId", "schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentPhoneLogin_schoolId_phoneE164_key"
  ON "identity"."ParentPhoneLogin" ("schoolId", "phoneE164");
CREATE INDEX IF NOT EXISTS "ParentPhoneLogin_schoolId_enabled_idx"
  ON "identity"."ParentPhoneLogin" ("schoolId", "enabled");

CREATE TABLE IF NOT EXISTS "identity"."ParentPhoneLoginRequest" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "phoneE164" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "verificationChallenge" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewNote" TEXT,
  CONSTRAINT "ParentPhoneLoginRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ParentPhoneLoginRequest_schoolId_status_idx"
  ON "identity"."ParentPhoneLoginRequest" ("schoolId", "status");
CREATE INDEX IF NOT EXISTS "ParentPhoneLoginRequest_parentId_requestedAt_idx"
  ON "identity"."ParentPhoneLoginRequest" ("parentId", "requestedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "parent_phone_login_request_one_pending"
  ON "identity"."ParentPhoneLoginRequest" ("parentId", "schoolId")
  WHERE "status" = 'PENDING';

ALTER TABLE "identity"."ParentAccessCode" ADD CONSTRAINT "ParentAccessCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity"."ParentAccessCode" ADD CONSTRAINT "ParentAccessCode_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "identity"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity"."ParentPhoneLogin" ADD CONSTRAINT "ParentPhoneLogin_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity"."ParentPhoneLogin" ADD CONSTRAINT "ParentPhoneLogin_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "identity"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity"."ParentPhoneLoginRequest" ADD CONSTRAINT "ParentPhoneLoginRequest_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "identity"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity"."ParentPhoneLoginRequest" ADD CONSTRAINT "ParentPhoneLoginRequest_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity"."ParentPhoneLoginRequest" ADD CONSTRAINT "ParentPhoneLoginRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "identity"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
