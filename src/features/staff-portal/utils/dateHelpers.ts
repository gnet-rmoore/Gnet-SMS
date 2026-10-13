import { format } from "date-fns";

export function formatSafe(dateVal: any, formatStr: string, fallback: string = "-") {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}

export function calculateDaysBetween(start: string, end: string) {
  return businessDaysBetween(start, end);
}

/** Business days (Mon–Fri), inclusive — matches Staff service leave validation. */
export function businessDaysBetween(start: string | Date, end: string | Date): number {
  try {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    if (e < s) return 0;
    let days = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) days += 1;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(days, 1);
  } catch {
    return 1;
  }
}
