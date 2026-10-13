/** School-local calendar day helpers (YYYY-MM-DD). */

export function ymdInTimeZone(date: Date, timeZone = "UTC"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function normalizeYmd(input: string | Date, timeZone = "UTC"): string {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    return input.slice(0, 10);
  }
  return ymdInTimeZone(new Date(input), timeZone);
}

/** Persist unique day as UTC midnight of the school-local YMD. */
export function dayBoundsFromYmd(ymd: string) {
  const start = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid attendance date");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { ymd, start, end };
}

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

export function monthRangeYmd(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}
