ALTER TABLE "classroom"."Classroom"
  ADD COLUMN "capacity" INTEGER,
  ADD COLUMN "allowOverfill" BOOLEAN NOT NULL DEFAULT false;
