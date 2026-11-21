ALTER TABLE "lifecycle"."AdmissionApplication"
  ADD COLUMN "accessToken" TEXT,
  ADD COLUMN "parentContacts" TEXT,
  ADD COLUMN "entranceTokenHash" TEXT,
  ADD COLUMN "entranceToken" TEXT,
  ADD COLUMN "entranceTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "entranceStatus" TEXT NOT NULL DEFAULT 'NOT_SCHEDULED',
  ADD COLUMN "entranceSlotId" TEXT,
  ADD COLUMN "entranceScheduledAt" TIMESTAMP(3),
  ADD COLUMN "entranceLocation" TEXT,
  ADD COLUMN "entranceRescheduleCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "entranceNotes" TEXT;

CREATE UNIQUE INDEX "AdmissionApplication_entranceTokenHash_key" ON "lifecycle"."AdmissionApplication"("entranceTokenHash");
CREATE INDEX "AdmissionApplication_schoolId_applicationNumber_idx" ON "lifecycle"."AdmissionApplication"("schoolId", "applicationNumber");
CREATE INDEX "AdmissionApplication_schoolId_entranceSlotId_idx" ON "lifecycle"."AdmissionApplication"("schoolId", "entranceSlotId");
