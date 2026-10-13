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

export interface Period {
  id?: string;
  periodNumber: number;
  label: string;
  shortCode: string;
  startDate: string;
  endDate: string;
  annualWeightPct: number;
  examComponents: ExamComponent[];
}

export interface CalendarTemplate {
  name: string;
  patternType: string;
  periods: Period[];
}
