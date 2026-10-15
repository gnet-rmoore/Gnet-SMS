-- Live screen view (Phase 3): consent-gated proctor snapshot metadata.
-- Additive only; safe to re-run.

CREATE TABLE IF NOT EXISTS academic."ExamProctorFrame" (
  id          TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "examId"    TEXT NOT NULL,
  "schoolId"  TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "contentType" VARCHAR(80) NOT NULL DEFAULT 'image/jpeg',
  "byteSize"  INTEGER,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamProctorFrame_pkey" PRIMARY KEY (id),
  CONSTRAINT "ExamProctorFrame_attemptId_fkey" FOREIGN KEY ("attemptId")
    REFERENCES academic."ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExamProctorFrame_attemptId_uploadedAt_idx"
  ON academic."ExamProctorFrame" ("attemptId", "uploadedAt");
CREATE INDEX IF NOT EXISTS "ExamProctorFrame_examId_idx"
  ON academic."ExamProctorFrame" ("examId");
CREATE INDEX IF NOT EXISTS "ExamProctorFrame_schoolId_idx"
  ON academic."ExamProctorFrame" ("schoolId");
CREATE INDEX IF NOT EXISTS "ExamProctorFrame_expiresAt_idx"
  ON academic."ExamProctorFrame" ("expiresAt");
