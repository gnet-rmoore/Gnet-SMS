# Database Schema & Models

This document outlines the core database entities and relationships configured within Prisma that drive the School ERP Platform's functionality.

---

## 🔑 Key Entities & Schema Models

### 1. `School`
Stores school-level details, branding colors, report card templates, and custom configurations.
- **Attributes**: `id`, `name`, `logo`, `address`, `phone`, `email`, `website`, `primaryColor`, `gradeSheetTemplate`, `gradebookConfig` (JSON string for dynamic weight columns).
- **Relationships**: One-to-many with `User`, `Classroom`, `Subject`, `Exam`, `GradeLegend`, `AcademicPeriod`, etc.

### 2. `User` & Roles
System accounts supporting authentication and authorization.
- **Attributes**: `id`, `email`, `password`, `name`, `role` (enum: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`, `STAFF`).
- **Relationships**: Linked to a `School`. Students are connected to classrooms, parents are connected to student children.

### 3. `GradeLegend` & `GradeScale`
Maps numeric percentage grades to alphabetic markers and administrative comments.
- **`GradeLegend`**:
  - Contains `id`, `schoolId`, `name`, `category` (e.g. `CLASS`, `QUIZ`, `ASSIGNMENT`).
  - Has a one-to-many relationship with `GradeScale`.
- **`GradeScale`**:
  - Attributes: `id`, `legendId`, `gradeLetter` (e.g. `A+`), `minScore` (e.g., `90`), `maxScore` (e.g., `100`), `gpaPoints`, `remarks` (e.g., `Excellent`).

### 4. `Exam` & `ExamComponent`
Represents an academic assessment window.
- **`Exam`**:
  - Attributes: `id`, `schoolId`, `title`, `term`, `startDate`, `endDate`, `status` (e.g. `DRAFT`, `PUBLISHED`).
- **`ExamComponent`**:
  - Attributes: `id`, `examId`, `name`, `shortCode` (e.g., `HW`, `QZ`, `MID`, `FIN`), `componentType` (enum: `EXAM`, `QUIZ`, `ASSIGNMENT`, `CLASS`), `weightPct` (used for legacy calculation fallback), `maxScore`.

### 5. `Grade`
The primary leaf nodes recording actual grades scored by students on components.
- **Attributes**: `id`, `studentId`, `subjectId`, `examComponentId`, `score` (numeric percentage/raw value), `remarks`, `gradedById`, `date`.

### 6. `PeriodGradeSummary` & `AnnualGradeSummary`
Pre-calculated summary cache tables computed on the backend to facilitate instantaneous report rendering.
- **`PeriodGradeSummary`**:
  - Aggregates overall performance for a student in a subject during a specific academic period or exam block.
  - Primary Key / ID composite: `${studentId}_${subjectId}_${periodId}` (or stored as a compound unique key).
- **`AnnualGradeSummary`**:
  - Aggregates a student's grade across all periods for the entire academic year to produce transcripts.

---

## 📈 Database Data Flow

1. **Setup**:
   A `School` administrator registers and sets up the `gradebookConfig` and `GradeLegend` scales.
2. **Assignments & Tests**:
   A teacher creates an `Exam` and registers several `ExamComponent`s (e.g., a Homework assignment `HW1` with component type `ASSIGNMENT`, or a Quizzes assignment `QZ1` with component type `QUIZ`).
3. **Grading**:
   The teacher enters raw student `Grade` entries for each `ExamComponent`.
4. **Aggregation**:
   - The system calls `computePeriodSummary()` inside `gradeService.ts` which loads the school's `gradebookConfig`, groups grades by matching components to configurations, calculates weighted averages, and saves results into `PeriodGradeSummary`.
   - The annual summary process aggregates period-level summaries, applying weights to periods, and stores results into `AnnualGradeSummary`.
5. **Reporting**:
   The frontend UI retrieves grades and summaries to generate interactive dashboards, transcripts, and downloadable PDF/print-ready report cards using dynamic templates.
