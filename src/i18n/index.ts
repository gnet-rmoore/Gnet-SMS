import { initReactI18next } from "react-i18next";
import i18n from "./instance";
import { enResources } from "./catalogs/en";
import { localeResources } from "./catalogs/translations";
import { localeFills } from "./catalogs/localeFill";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type AppLocale,
  isAppLocale,
  localeDir,
  normalizeLocale,
  resolveEffectiveLocale,
} from "./locales";

const NAMESPACES = ["common", "nav", "auth", "errors", "roles", "pages", "public"] as const;

function deepMergeNs(base: Record<string, any>, over: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...base };
  for (const [ns, tree] of Object.entries(over || {})) {
    out[ns] = deepMergeValue(base[ns], tree);
  }
  return out;
}

function deepMergeValue(base: unknown, over: unknown): unknown {
  if (over === undefined || over === null) return base;
  if (
    base &&
    over &&
    typeof base === "object" &&
    typeof over === "object" &&
    !Array.isArray(base) &&
    !Array.isArray(over)
  ) {
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
      result[k] = deepMergeValue((base as Record<string, unknown>)[k], v);
    }
    return result;
  }
  return over;
}

function buildResources() {
  const resources: Record<string, Record<string, object>> = {
    en: { ...enResources },
  };
  for (const [code, catalog] of Object.entries(localeResources)) {
    const fill = (localeFills as Record<string, unknown>)[code] || {};
    const withFill = deepMergeNs(enResources as any, deepMergeNs(fill as any, catalog as any));
    resources[code] = withFill;
  }
  return resources;
}

let initialized = false;

export function initI18n(initial?: AppLocale) {
  if (initialized) {
    if (initial && i18n.language !== initial) {
      void i18n.changeLanguage(initial);
    }
    return i18n;
  }

  const stored =
    typeof localStorage !== "undefined" ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
  const browser = typeof navigator !== "undefined" ? navigator.language : null;
  const lng =
    initial ||
    resolveEffectiveLocale({ stored, browser });

  void i18n.use(initReactI18next).init({
    resources: buildResources(),
    lng,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: "common",
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
  });

  initialized = true;
  applyDocumentLocale(lng);
  return i18n;
}

export function applyDocumentLocale(code: string) {
  const locale = normalizeLocale(code) || DEFAULT_LOCALE;
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale === "zh-Hans" ? "zh-Hans" : locale;
    document.documentElement.dir = localeDir(locale);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}

export async function changeAppLocale(code: string) {
  const locale = normalizeLocale(code) || DEFAULT_LOCALE;
  if (!initialized) initI18n(locale);
  await i18n.changeLanguage(locale);
  applyDocumentLocale(locale);
  return locale;
}

export function getStoredLocale(): AppLocale | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isAppLocale(v) ? v : normalizeLocale(v);
}

export {
  resolveEffectiveLocale,
  normalizeLocale,
  isAppLocale,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
};
export type { AppLocale };
export default i18n;
