/**
 * Canonical Academic Calendar domain types.
 *
 * This is the single source of truth for the shapes shared by the Academic
 * Calendar settings wizard, the Exams scheduler, Gradebook, Report Cards,
 * Gradesheets and Lesson Plans. Feature-specific modules should re-export
 * from here instead of re-declaring their own variants.
 */

export interface ExamComponent {
  id?: string;
  label: string;
  shortCode: string;
  componentType: string;
  maxScore: number;
  weightPct: number;
  isGraded: boolean;
  examStartDate?: string;
  examEndDate?: string;
  gradeSubmissionDeadline?: string;
  /** JSON activity breakdown for teacher gradebook (per assessment) */
  gradebookStructure?: string | null;
  /** When true, gradebookStructure overrides the school template */
  gradebookStructureCustom?: boolean;
}

export interface AcademicPeriod {
  id?: string;
  periodNumber: number;
  label: string;
  shortCode: string;
  startDate: string;
  endDate: string;
  annualWeightPct: number;
  examComponents: ExamComponent[];
}

/** A persisted or template academic calendar (semester / term pattern). */
export interface AcademicCalendar {
  id?: string;
  name?: string;
  patternType?: string;
  isActive?: boolean;
  periods: AcademicPeriod[];
}

export interface CalendarTemplate {
  name: string;
  patternType: string;
  periods: AcademicPeriod[];
}

/** Backwards-compatible aliases used across older feature modules. */
export type Period = AcademicPeriod;
export type CalendarPatternType = "SEMESTER" | "TWO_TERM" | "THREE_TERM" | "CUSTOM" | string;
