import { format as dfFormat, formatDistanceToNow } from "date-fns";
import { enUS, fr, ar, es, de, zhCN, hi } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { AppLocale } from "./locales";
import { isAppLocale, DEFAULT_LOCALE } from "./locales";

const DATE_FNS_BY_LOCALE: Record<AppLocale, Locale> = {
  en: enUS,
  fr,
  ar,
  es,
  de,
  "zh-Hans": zhCN,
  hi,
};

function resolveLocale(locale?: AppLocale): AppLocale {
  if (locale && isAppLocale(locale)) return locale;
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang;
    if (isAppLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export function dateFnsLocale(code: AppLocale): Locale {
  return DATE_FNS_BY_LOCALE[code] ?? enUS;
}

export function formatDate(
  value: Date | string | number,
  pattern = "PPP",
  locale?: AppLocale
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const code = resolveLocale(locale);
  return dfFormat(d, pattern, { locale: dateFnsLocale(code) });
}

export function formatRelative(
  value: Date | string | number,
  locale?: AppLocale
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const code = resolveLocale(locale);
  return formatDistanceToNow(d, { addSuffix: true, locale: dateFnsLocale(code) });
}

/** BCP 47 tags for Intl (zh-Hans → zh-CN). */
function intlTag(code: AppLocale): string {
  if (code === "zh-Hans") return "zh-CN";
  return code;
}

export function formatMoney(
  amount: number,
  currency = "USD",
  locale?: AppLocale
): string {
  const code = resolveLocale(locale);
  try {
    return new Intl.NumberFormat(intlTag(code), {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
}
