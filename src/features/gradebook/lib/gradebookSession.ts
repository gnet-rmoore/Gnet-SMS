/** Remember last opened assessment gradebook for "Continue grading". */

export type GradebookLastSession = {
  schoolId: string;
  classId: string;
  periodId: string;
  assessmentId: string;
  className?: string;
  periodLabel?: string;
  assessmentLabel?: string;
  updatedAt: string;
};

const KEY = "gb:last-session";

export function readGradebookSession(schoolId: string): GradebookLastSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GradebookLastSession;
    if (parsed?.schoolId !== schoolId) return null;
    if (!parsed.classId || !parsed.periodId || !parsed.assessmentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGradebookSession(session: GradebookLastSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearGradebookSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
