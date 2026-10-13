/** Supported UI locales (BCP 47). English is the source of truth for keys. */

export type AppLocale = "en" | "fr" | "ar" | "es" | "de" | "zh-Hans" | "hi";

export type LocaleMeta = {
  code: AppLocale;
  /** Native name for the picker */
  nativeLabel: string;
  /** English subtitle */
  englishLabel: string;
  dir: "ltr" | "rtl";
  /**
   * Production-complete: full leaf coverage vs `en`, critical-path English-leftover
   * audit passes (`npm run i18n:check`), and locale is offered without a “beta” caveat.
   */
  complete: boolean;
};

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  { code: "en", nativeLabel: "English", englishLabel: "English", dir: "ltr", complete: true },
  { code: "fr", nativeLabel: "Français", englishLabel: "French", dir: "ltr", complete: true },
  { code: "ar", nativeLabel: "العربية", englishLabel: "Arabic", dir: "rtl", complete: true },
  { code: "es", nativeLabel: "Español", englishLabel: "Spanish", dir: "ltr", complete: true },
  { code: "de", nativeLabel: "Deutsch", englishLabel: "German", dir: "ltr", complete: true },
  {
    code: "zh-Hans",
    nativeLabel: "简体中文",
    englishLabel: "Chinese (Simplified)",
    dir: "ltr",
    complete: true,
  },
  { code: "hi", nativeLabel: "हिन्दी", englishLabel: "Hindi", dir: "ltr", complete: true },
];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_STORAGE_KEY = "sms-locale";

export const RTL_LOCALES = new Set<AppLocale>(
  SUPPORTED_LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code)
);

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.some((l) => l.code === value);
}

export function localeMeta(code: AppLocale): LocaleMeta {
  return SUPPORTED_LOCALES.find((l) => l.code === code)!;
}

export function normalizeLocale(raw: unknown): AppLocale | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim();
  if (isAppLocale(v)) return v;
  const lower = v.toLowerCase();
  if (lower === "zh" || lower.startsWith("zh-cn") || lower.startsWith("zh-hans")) return "zh-Hans";
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hant")) return "zh-Hans"; // v1: map to Hans
  const primary = lower.split("-")[0];
  const hit = SUPPORTED_LOCALES.find((l) => l.code === primary || l.code.startsWith(primary));
  return hit?.code ?? null;
}

export function localeDir(code: AppLocale): "ltr" | "rtl" {
  return RTL_LOCALES.has(code) ? "rtl" : "ltr";
}

export function resolveEffectiveLocale(opts: {
  userPreferred?: string | null;
  schoolDefault?: string | null;
  stored?: string | null;
  browser?: string | null;
}): AppLocale {
  return (
    normalizeLocale(opts.userPreferred) ||
    normalizeLocale(opts.schoolDefault) ||
    normalizeLocale(opts.stored) ||
    normalizeLocale(opts.browser) ||
    DEFAULT_LOCALE
  );
}
