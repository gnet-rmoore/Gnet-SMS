-- Exam System Overhaul (Phase 5): first-class exam scheduling + paper revision history.
-- Additive only; safe to re-run.

-- ExamSchedule: one exam can be scheduled per class/room/session.
CREATE TABLE IF NOT EXISTS academic."ExamSchedule" (
  id             TEXT NOT NULL,
  "schoolId"     TEXT NOT NULL,
  "examId"       TEXT NOT NULL,
  "classId"      TEXT,
  room           TEXT,
  session        TEXT,
  "invigilatorId" TEXT,
  "startAt"      TIMESTAMP(3) NOT NULL,
  "endAt"        TIMESTAMP(3) NOT NULL,
  note           TEXT,
  "createdById"  TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamSchedule_pkey" PRIMARY KEY (id),
  CONSTRAINT "ExamSchedule_examId_fkey" FOREIGN KEY ("examId")
    REFERENCES academic."Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExamSchedule_examId_idx"
  ON academic."ExamSchedule" ("examId");
CREATE INDEX IF NOT EXISTS "ExamSchedule_schoolId_startAt_idx"
  ON academic."ExamSchedule" ("schoolId", "startAt");
CREATE INDEX IF NOT EXISTS "ExamSchedule_classId_idx"
  ON academic."ExamSchedule" ("classId");

-- ExamPaperRevision: append-only history so prior reviews survive resubmits.
CREATE TABLE IF NOT EXISTS academic."ExamPaperRevision" (
  id             TEXT NOT NULL,
  "packageId"    TEXT NOT NULL,
  "examId"       TEXT NOT NULL,
  "schoolId"     TEXT NOT NULL,
  revision       INTEGER NOT NULL,
  status         TEXT NOT NULL,
  "deliveryMode" TEXT NOT NULL,
  snapshot       TEXT,
  "actorId"      TEXT NOT NULL,
  action         TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamPaperRevision_pkey" PRIMARY KEY (id),
  CONSTRAINT "ExamPaperRevision_examId_fkey" FOREIGN KEY ("examId")
    REFERENCES academic."Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExamPaperRevision_packageId_revision_idx"
  ON academic."ExamPaperRevision" ("packageId", revision);
CREATE INDEX IF NOT EXISTS "ExamPaperRevision_examId_idx"
  ON academic."ExamPaperRevision" ("examId");
CREATE INDEX IF NOT EXISTS "ExamPaperRevision_schoolId_createdAt_idx"
  ON academic."ExamPaperRevision" ("schoolId", "createdAt");

-- Backfill: derive one schedule row per existing exam that has none yet.
-- classId is carried over from the exam's optional audience class.
INSERT INTO academic."ExamSchedule"
  (id, "schoolId", "examId", "classId", "startAt", "endAt", "createdById", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  e."schoolId",
  e.id,
  e."classId",
  e."startDate",
  e."endDate",
  'system-backfill',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM academic."Exam" e
WHERE NOT EXISTS (
  SELECT 1 FROM academic."ExamSchedule" s WHERE s."examId" = e.id
);
