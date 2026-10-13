import { countries } from "countries-list";
import ct from "countries-and-timezones";

export const DEFAULT_COUNTRY = "United Kingdom";

/** Sorted English country names from countries-list. */
export function getCountryNames(): string[] {
  return Object.values(countries)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));
}

/** ISO alpha-2 for a countries-list English name (e.g. "United States" → "US"). */
export function getCountryCodeByName(countryName: string): string | null {
  const needle = String(countryName || "").trim().toLowerCase();
  if (!needle) return null;
  for (const [code, meta] of Object.entries(countries)) {
    if (meta.name.toLowerCase() === needle) return code;
  }
  const aliases: Record<string, string> = {
    usa: "US",
    "united states of america": "US",
    uk: "GB",
    "great britain": "GB",
    britain: "GB",
  };
  return aliases[needle] || null;
}

/** Resolve stored country (ISO code or English name) to a countries-list English name. */
export function resolveCountryName(stored: string | null | undefined): string {
  const raw = String(stored || "").trim();
  if (!raw) return DEFAULT_COUNTRY;
  const upper = raw.toUpperCase();
  if (upper.length === 2 && (countries as any)[upper]) {
    return (countries as any)[upper].name as string;
  }
  const byName = Object.values(countries).find(
    (c) => c.name.toLowerCase() === raw.toLowerCase()
  );
  if (byName) return byName.name;
  const aliases: Record<string, string> = {
    US: "United States",
    USA: "United States",
    GB: "United Kingdom",
    UK: "United Kingdom",
  };
  if (aliases[upper]) return aliases[upper];
  return raw;
}

function allIanaTimezones(): string[] {
  try {
    return (Intl as any).supportedValuesOf("timeZone") as string[];
  } catch {
    return ["UTC", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo"];
  }
}

/**
 * IANA zones for a country name. Always includes UTC as a safe fallback option
 * when the country has no mapped zones (or name is unknown).
 */
export function getTimezonesForCountryName(countryName: string): string[] {
  const resolved = resolveCountryName(countryName);
  const code = getCountryCodeByName(resolved);
  if (!code) {
    return ["UTC", ...allIanaTimezones().slice(0, 20)];
  }
  const zones = ct.getTimezonesForCountry(code) || [];
  const names = zones.map((z) => z.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) return ["UTC"];
  return names.includes("UTC") ? names : ["UTC", ...names];
}

export function defaultTimezoneForCountry(countryName: string): string {
  const zones = getTimezonesForCountryName(countryName).filter((z) => z !== "UTC");
  if (zones.length > 0) return zones[0];
  const code = getCountryCodeByName(countryName);
  if (code === "GB") return "Europe/London";
  if (code === "US") return "America/New_York";
  return "UTC";
}

/** When country changes, keep current TZ if still valid; otherwise pick a default. */
export function resolveTimezoneForCountry(countryName: string, currentTimezone?: string): string {
  const allowed = getTimezonesForCountryName(countryName);
  if (currentTimezone && allowed.includes(currentTimezone)) return currentTimezone;
  return defaultTimezoneForCountry(countryName);
}

export const DEFAULT_TIMEZONE = defaultTimezoneForCountry(DEFAULT_COUNTRY);
