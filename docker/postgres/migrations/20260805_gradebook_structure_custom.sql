-- Add explicit custom flag for per-assessment gradebook structure
ALTER TABLE academic."ExamComponent"
  ADD COLUMN IF NOT EXISTS "gradebookStructureCustom" BOOLEAN NOT NULL DEFAULT false;
