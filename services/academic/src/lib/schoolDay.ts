/** School-local calendar day helpers (YYYY-MM-DD). */

export function isWeekendYmd(ymd: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

export function eachYmd(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${fromYmd}T00:00:00.000Z`);
  const end = new Date(`${toYmd}T00:00:00.000Z`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime()) || end < cur) {
    return out;
  }
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export const NON_INSTRUCTION_CATEGORIES = new Set([
  "Holiday",
  "Non-Instruction",
  "HOLIDAY",
  "NON_INSTRUCTION",
]);
