ALTER TABLE "finance"."FeeTemplate"
  ADD COLUMN "classroomId" TEXT;

ALTER TABLE "finance"."SchoolBillingSettings"
  ADD COLUMN "entranceFeesEnabled" BOOLEAN NOT NULL DEFAULT false;
