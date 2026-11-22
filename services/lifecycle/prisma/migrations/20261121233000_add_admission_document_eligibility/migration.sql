ALTER TABLE "lifecycle"."AdmissionApplication"
  ADD COLUMN "entranceCompletedAt" TIMESTAMP(3),
  ADD COLUMN "entranceResult" TEXT,
  ADD COLUMN "entranceCompletedBy" TEXT,
  ADD COLUMN "admissionDecision" TEXT;
