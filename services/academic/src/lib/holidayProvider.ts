/**
 * Country + subdivision aware holiday provider (display-only).
 *
 * Generates public and international holidays for a tenant's residence country
 * (and optional state/region). These are informational calendar entries only —
 * they NEVER block classes, attendance, payroll, or instructional days. The
 * decision to treat a holiday as a non-school day belongs to school staff via
 * their own calendar events.
 *
 * Backed by `date-holidays` (offline, no runtime network) plus a curated set
 * of widely observed international days.
 */

import Holidays from "date-holidays";

export type HolidayLocality = "national" | "regional" | "international";

export type HolidayDay = {
  /** YYYY-MM-DD (school-local date) */
  date: string;
  name: string;
  type: string;
  locality: HolidayLocality;
};

const cache = new Map<string, HolidayDay[]>();

function keyFor(country: string, region: string | null | undefined, from: string, to: string): string {
  return `${country}|${region || ""}|${from}|${to}`;
}

/** Fixed-date international observances, tagged as "international". */
const INTERNATIONAL_DAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 3, day: 8, name: "International Women's Day" },
  { month: 5, day: 1, name: "International Workers' Day" },
  { month: 6, day: 5, name: "World Environment Day" },
  { month: 8, day: 12, name: "International Youth Day" },
  { month: 10, day: 5, name: "World Teachers' Day" },
  { month: 10, day: 24, name: "United Nations Day" },
  { month: 12, day: 10, name: "Human Rights Day" },
];

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function within(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function parseDate(dateStr: string): string {
  // date-holidays returns "YYYY-MM-DD 00:00:00"
  return dateStr.slice(0, 10);
}

export function isSupportedCountry(countryCode: string): boolean {
  try {
    const hd = new Holidays(countryCode);
    return !!hd.getCountries()?.[countryCode.toUpperCase()] && hd.getHolidays(new Date().getFullYear()).length >= 0;
  } catch {
    return false;
  }
}

/**
 * Build the country+region holiday list for a [from, to] date range (inclusive).
 * National holidays are those present for the country; regional holidays are
 * those added by the region (state/province). Returns [] on any error so
 * callers never crash on unsupported or malformed input.
 */
function computeHolidays(
  country: string,
  region: string | null | undefined,
  from: string,
  to: string
): HolidayDay[] {
  const out: HolidayDay[] = [];
  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));

  let national: Holidays | null = null;
  let regional: Holidays | null = null;
  let nationalNames: Set<string> = new Set();

  try {
    national = new Holidays(country);
    regional = region ? new Holidays(country, region) : null;
  } catch {
    return [];
  }

  try {
    const baseNational = new Set(
      national.getHolidays(startYear).map((h) => h.name as string)
    );
    for (let y = startYear; y <= endYear; y++) {
      // National holidays
      for (const h of national.getHolidays(y) as any[]) {
        const date = parseDate(h.date);
        if (!within(date, from, to)) continue;
        nationalNames.add(h.name as string);
        out.push({
          date,
          name: h.name as string,
          type: String(h.type || "").toLowerCase(),
          locality: "national",
        });
      }
      // Regional (state/province) holidays — those not present nationally
      if (regional) {
        for (const h of regional.getHolidays(y) as any[]) {
          const date = parseDate(h.date);
          if (!within(date, from, to)) continue;
          if (nationalNames.has(h.name as string) || baseNational.has(h.name as string)) {
            continue;
          }
          out.push({
            date,
            name: h.name as string,
            type: String(h.type || "").toLowerCase(),
            locality: "regional",
          });
        }
      }
    }
  } catch {
    // fall through — international days still added below
  }

  // International observances (curated) — dedupe against existing by date+name
  const seen = new Set(out.map((h) => `${h.date}|${h.name}`));
  for (let y = startYear; y <= endYear; y++) {
    for (const id of INTERNATIONAL_DAYS) {
      const date = ymd(y, id.month, id.day);
      if (!within(date, from, to)) continue;
      if (seen.has(`${date}|${id.name}`)) continue;
      out.push({ date, name: id.name, type: "observance", locality: "international" });
    }
  }

  // Sort by date then name
  out.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date)));
  return out;
}

export function getHolidaysForRange(opts: {
  country: string;
  region?: string | null;
  from: string;
  to: string;
}): HolidayDay[] {
  const { country, region, from, to } = opts;
  if (!country || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return [];
  }
  const key = keyFor(country, region, from, to);
  if (cache.has(key)) return cache.get(key)!;
  const result = computeHolidays(country.toUpperCase(), region, from, to);
  cache.set(key, result);
  return result;
}

export type { Holidays };
