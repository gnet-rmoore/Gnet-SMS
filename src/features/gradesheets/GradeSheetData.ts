/**
 * Data contract + loader for the two printable gradesheet templates.
 *   TEMPLATE_1 -> TEMPLATE_1_classic-ledger.html
 *   TEMPLATE_2 -> TEMPLATE_2_modern-mastery.html
 *
 * Map your assembleGradeSheet() output onto GradeSheetData (a thin adapter is
 * usually all that is needed). Every field except `subjects` is optional:
 * anything missing renders as "—" and nothing is invented.
 */

export type GradeSheetTemplateId = 'TEMPLATE_1' | 'TEMPLATE_2' | 'INTL_STANDARD_TERM' | 'INTL_EXECUTIVE';

export interface GradeSheetData {
  school: { name: string; address?: string; phone?: string; email?: string; motto?: string; logoUrl?: string };
  term: { periodLabel?: string; schoolYear?: string };
  student: { name: string; id?: string; className?: string; gradeLevel?: string };
  /** Ordered assessment columns, from the resolved gradebookStructure / School.gradebookConfig. */
  columns?: { code: string; name?: string; weightPct: number }[];
  /** From the school's GradeLegend/GradeScale (falls back to your default bands). */
  legend?: { min: number; max: number; letter: string; remark?: string }[];
  subjects: {
    name: string;
    code?: string;
    /** Percent (0-100) per column code, e.g. { HW: 18, QZ: 17 }. Missing key = no grade. */
    scores?: Record<string, number | null>;
    /** Prefer PeriodGradeSummary.periodTotalPct; if omitted the template computes a weighted
     *  average over only the columns that have grades (missing components are not penalised). */
    total?: number | null;
    letter?: string | null;
    remark?: string | null;
    position?: number | null;
  }[];
  summary?: { average?: number | null; rank?: number | null; classSize?: number | null; gpa?: number | null; promotionStatus?: string | null };
  attendance?: { present?: number | null; total?: number | null } | null;
  remarks?: { educator?: string | null; principal?: string | null };
  signatures?: { role: string; name?: string; imageUrl?: string }[];
  issuedOn?: string;
}

const TEMPLATE_FILES: Record<GradeSheetTemplateId, string> = {
  TEMPLATE_1: '/gradesheets/TEMPLATE_1_classic-ledger.html',
  TEMPLATE_2: '/gradesheets/TEMPLATE_2_modern-mastery.html',
  INTL_STANDARD_TERM: '/gradesheets/TEMPLATE_1_classic-ledger.html',
  INTL_EXECUTIVE: '/gradesheets/TEMPLATE_2_modern-mastery.html',
};

/** Unknown or legacy ids fall back to the Classic ledger, matching the existing registry rule. */
export const resolveTemplateId = (id?: string | null): GradeSheetTemplateId => {
  const normalized = String(id ?? '').trim().toUpperCase().replace(/[-\s]+/g, '_');
  if (normalized === 'TEMPLATE_2' || normalized === 'INTL_EXECUTIVE' || normalized === 'INTL_STANDARD_TERM') return normalized;
  return 'TEMPLATE_1';
};

/** Loads the school's selected template into an iframe and fills it with data. */
export async function loadGradeSheet(
  iframe: HTMLIFrameElement,
  schoolTemplateId: string | null | undefined, // School.gradeSheetTemplate
  data: GradeSheetData,
): Promise<void> {
  const url = TEMPLATE_FILES[resolveTemplateId(schoolTemplateId)];
  const html = await (await fetch(url)).text();
  // Set data before the template's own script runs so the sample is never shown.
  const boot = `<script>window.__GRADESHEET_DATA__=${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  iframe.srcdoc = html.replace('<body>', `<body>${boot}`);
  await new Promise<void>((r) => iframe.addEventListener('load', () => r(), { once: true }));
}

/** Print or save as PDF: iframe.contentWindow?.print() (page size is already A4). */
