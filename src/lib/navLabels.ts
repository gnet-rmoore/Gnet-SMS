import type { TFunction } from "i18next";
import { humanizeSegment } from "./globalSearchPages";

/** Nav keys may be bare (`dashboard`) or fully qualified (`items.dashboard`). */
export function normalizeNavLabelKey(key: string): string {
  if (key.startsWith("sections.") || key.startsWith("items.")) return key;
  return `items.${key}`;
}

/** Resolve a nav labelKey to localized sidebar text. */
export function translateNavLabelKey(
  key: string,
  t: TFunction,
  fallbackSegment?: string
): string {
  const normalized = normalizeNavLabelKey(key);
  const translated = String(t(normalized, { ns: "nav", defaultValue: "" })).trim();
  if (translated) return translated;
  if (fallbackSegment) return humanizeSegment(fallbackSegment);
  const tail = key.split(".").pop() || key;
  return humanizeSegment(tail);
}
