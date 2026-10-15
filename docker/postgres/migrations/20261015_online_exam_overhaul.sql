-- Online exam overhaul: kiosk config, proctoring level, auto-post + grade provenance.
-- Additive only; safe to re-run.

-- Exam: kiosk/proctoring/auto-post configuration
ALTER TABLE academic."Exam"
  ADD COLUMN IF NOT EXISTS "proctorLevel" VARCHAR(20) NOT NULL DEFAULT 'MONITOR';
ALTER TABLE academic."Exam"
  ADD COLUMN IF NOT EXISTS "kioskConfig" TEXT;
ALTER TABLE academic."Exam"
  ADD COLUMN IF NOT EXISTS "autoPostGrades" BOOLEAN NOT NULL DEFAULT true;

-- ExamAttempt: consent + proctor heartbeat
ALTER TABLE academic."ExamAttempt"
  ADD COLUMN IF NOT EXISTS "screenShareConsentedAt" TIMESTAMP(3);
ALTER TABLE academic."ExamAttempt"
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

-- GradeEntry: provenance and raw/percentage audit for online-exam auto-post
ALTER TABLE academic."GradeEntry"
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(40);
ALTER TABLE academic."GradeEntry"
  ADD COLUMN IF NOT EXISTS "sourceRef" TEXT;
ALTER TABLE academic."GradeEntry"
  ADD COLUMN IF NOT EXISTS "rawScore" DOUBLE PRECISION;
ALTER TABLE academic."GradeEntry"
  ADD COLUMN IF NOT EXISTS "maxScore" DOUBLE PRECISION;
ALTER TABLE academic."GradeEntry"
  ADD COLUMN IF NOT EXISTS "scorePercent" DOUBLE PRECISION;

-- Data repair: collapse duplicate gradebook pushes created by the old
-- structure-column bug (keyed on "" / null mismatch). Keep the newest row,
-- re-point its attempt links, then delete the older duplicates.
WITH ranked AS (
  SELECT
    id,
    "examId", "studentId", "subjectId", "classId",
    "examComponentId", "structureColumnId",
    ROW_NUMBER() OVER (
      PARTITION BY
        "examId", "studentId", "subjectId", "classId",
        COALESCE("examComponentId", ''), COALESCE("structureColumnId", '')
      ORDER BY "updatedAt" DESC, "enteredAt" DESC
    ) AS rn
  FROM academic."GradeEntry"
  WHERE "examId" IS NOT NULL
),
dupes AS (SELECT id FROM ranked WHERE rn > 1)
UPDATE academic."ExamAttempt" a
  SET "gradeEntryId" = (SELECT id FROM ranked r WHERE r.rn = 1 AND r."examId" = a."examId"
                        AND r."studentId" = a."studentId" LIMIT 1)
  WHERE a."gradeEntryId" IN (SELECT id FROM dupes);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        "examId", "studentId", "subjectId", "classId",
        COALESCE("examComponentId", ''), COALESCE("structureColumnId", '')
      ORDER BY "updatedAt" DESC, "enteredAt" DESC
    ) AS rn
  FROM academic."GradeEntry"
  WHERE "examId" IS NOT NULL
)
DELETE FROM academic."GradeHistory" h
  WHERE h."gradeEntryId" IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        "examId", "studentId", "subjectId", "classId",
        COALESCE("examComponentId", ''), COALESCE("structureColumnId", '')
      ORDER BY "updatedAt" DESC, "enteredAt" DESC
    ) AS rn
  FROM academic."GradeEntry"
  WHERE "examId" IS NOT NULL
)
DELETE FROM academic."GradeEntry" g
  WHERE g.id IN (SELECT id FROM ranked WHERE rn > 1);
