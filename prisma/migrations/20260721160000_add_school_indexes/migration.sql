-- AlterTable indexes for multi-tenant query performance
CREATE INDEX IF NOT EXISTS "AcademicPeriod_schoolId_idx" ON "AcademicPeriod"("schoolId");
CREATE INDEX IF NOT EXISTS "ExamComponent_schoolId_idx" ON "ExamComponent"("schoolId");
CREATE INDEX IF NOT EXISTS "ExamComponent_periodId_idx" ON "ExamComponent"("periodId");
CREATE INDEX IF NOT EXISTS "GradeEntry_schoolId_idx" ON "GradeEntry"("schoolId");
CREATE INDEX IF NOT EXISTS "GradeEntry_studentId_idx" ON "GradeEntry"("studentId");
CREATE INDEX IF NOT EXISTS "GradeEntry_examId_idx" ON "GradeEntry"("examId");
CREATE INDEX IF NOT EXISTS "PeriodGradeSummary_schoolId_idx" ON "PeriodGradeSummary"("schoolId");
CREATE INDEX IF NOT EXISTS "PeriodGradeSummary_studentId_idx" ON "PeriodGradeSummary"("studentId");
CREATE INDEX IF NOT EXISTS "Attendance_schoolId_idx" ON "Attendance"("schoolId");
CREATE INDEX IF NOT EXISTS "Attendance_classroomId_idx" ON "Attendance"("classroomId");
CREATE INDEX IF NOT EXISTS "FeePayment_schoolId_idx" ON "FeePayment"("schoolId");
CREATE INDEX IF NOT EXISTS "FeePayment_studentId_idx" ON "FeePayment"("studentId");
CREATE INDEX IF NOT EXISTS "Exam_schoolId_idx" ON "Exam"("schoolId");
CREATE INDEX IF NOT EXISTS "Classroom_schoolId_idx" ON "Classroom"("schoolId");
CREATE INDEX IF NOT EXISTS "Classroom_ownerTeacherId_idx" ON "Classroom"("ownerTeacherId");
