/**
 * Country codec for the academic service.
 *
 * Resolves a stored tenant `country` string (ISO-2 code, canonical English name,
 * or common alias) to an ISO-2 code for the holiday provider. Backed by
 * `countries-list` (the same ISO-3166 dataset the frontend uses), which provides
 * canonical English names for all 252 countries — no hand-maintained subset.
 *
 * `date-holidays` is ISO-2 driven and silently returns no holidays for anything
 * but a valid code, so normalizing to a strict ISO-2 code here is what prevents
 * silent "missing holidays" mistakes.
 */

import { countries } from "countries-list";

const ISO_3166_ALPHA2 = new Set(Object.keys(countries));

const NAME_TO_CODE: Record<string, string> = Object.entries(countries).reduce(
  (map, [code, meta]) => {
    map[String(meta.name).toLowerCase()] = code;
    return map;
  },
  {} as Record<string, string>
);

const ALIASES: Record<string, string> = {
  USA: "US",
  UK: "GB",
  "UNITED KINGDOM OF GREAT BRITAIN AND NORTHERN IRELAND": "GB",
  UAE: "AE",
  GB: "GB",
  US: "US",
  "UNITED STATES OF AMERICA": "US",
};

/**
 * Normalize a stored tenant country to an ISO-2 code, or return null when it
 * cannot be resolved. Accepts ISO-2 codes, canonical English country names,
 * and common aliases (US/UK/USA/UAE).
 */
export function normalizeCountryCode(stored: string | null | undefined): string | null {
  const raw = String(stored || "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (upper.length === 2 && ISO_3166_ALPHA2.has(upper)) return upper;
  if (ALIASES[upper]) return ALIASES[upper];

  return NAME_TO_CODE[raw.toLowerCase()] || null;
}

/** Canonical English name for a resolved ISO-2 code, for labels. */
export function countryNameForCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.toUpperCase();
  const meta = (countries as Record<string, { name: string } | undefined>)[c];
  return meta?.name || c;
}
