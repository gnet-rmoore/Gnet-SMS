/** Shared date / enum formatting for receipt HTML + PDFKit renderers. */
import type { AppLocale, ReceiptChromeKey } from "../i18n/receiptChrome";

const INTL_LOCALE: Record<AppLocale, string> = {
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  ar: "ar",
  "zh-Hans": "zh-Hans-CN",
  hi: "hi-IN",
};

/** Format a timestamp in the school's local wall-clock time (with safe fallbacks). */
export function formatReceiptDateTime(
  date: Date,
  locale: AppLocale,
  timeZone?: string | null
): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  const tag = INTL_LOCALE[locale] ?? "en-GB";
  try {
    if (timeZone) opts.timeZone = timeZone;
    return new Intl.DateTimeFormat(tag, opts).format(date);
  } catch {
    try {
      delete opts.timeZone;
      return new Intl.DateTimeFormat(tag, opts).format(date);
    } catch {
      return date.toISOString().replace("T", " ").slice(0, 16);
    }
  }
}

/** Map a payment-method code to its localized chrome key (null when unrecognized). */
export function methodChromeKey(raw: string): ReceiptChromeKey | null {
  switch (raw.trim().toUpperCase().replace(/[\s-]+/g, "_")) {
    case "CASH":
      return "methodCash";
    case "CHECK":
    case "CHEQUE":
      return "methodCheck";
    case "TRANSFER":
    case "BANK_TRANSFER":
    case "WIRE":
      return "methodTransfer";
    case "CARD":
    case "CREDIT_CARD":
      return "methodCard";
    case "CHECKOUT":
    case "ONLINE":
    case "MOBILE_MONEY":
      return "methodCheckout";
    case "OTHER":
      return "methodOther";
    default:
      return null;
  }
}

/** Map a receipt status to its localized chrome key (null when unrecognized). */
export function statusChromeKey(raw: string): ReceiptChromeKey | null {
  switch (raw.trim().toUpperCase()) {
    case "ISSUED":
      return "statusIssued";
    case "VOIDED":
      return "statusVoided";
    case "SUPERSEDED":
      return "statusSuperseded";
    default:
      return null;
  }
}

/**
 * Split a localized "Label: value" chrome string into its label and value parts so the
 * label can be rendered muted while the value keeps full ink weight. Splits on the first
 * ASCII ":" or full-width "：" (zh-Hans). Falls back to treating the whole string as the
 * value when no separator is present.
 */
export function splitLabelValue(text: string): { label: string; value: string } {
  const match = text.match(/^(.*?)\s*[:：]\s*(.*)$/s);
  if (!match) return { label: "", value: text.trim() };
  return { label: match[1].trim(), value: match[2].trim() };
}

export function titleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/(^|[\s_-])([a-z])/g, (_, sep: string, ch: string) => `${sep ? " " : ""}${ch.toUpperCase()}`)
    .trim();
}
