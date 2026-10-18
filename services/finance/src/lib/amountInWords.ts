/**
 * Convert a monetary amount to English words for formal receipts.
 *
 * Formal paper receipts traditionally repeat the total in words to guard against
 * tampering/alteration of the numeric figure. Words are rendered in English,
 * which is the convention for international schools regardless of the receipt
 * chrome locale.
 */

const ONES = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollars",
  EUR: "Euros",
  GBP: "Pounds",
  LRD: "Liberian Dollars",
  NGN: "Naira",
  GHS: "Ghanaian Cedi",
  KES: "Kenyan Shillings",
  ZAR: "Rand",
  INR: "Indian Rupees",
  CAD: "Canadian Dollars",
  AUD: "Australian Dollars",
  CHF: "Swiss Francs",
  JPY: "Yen",
  CNY: "Yuan",
  AED: "Dirhams",
  SAR: "Riyals",
};

/** Singular forms used when the whole-unit count is exactly one. */
const CURRENCY_SINGULARS: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "Pound",
  LRD: "Liberian Dollar",
  NGN: "Naira",
  GHS: "Ghanaian Cedi",
  KES: "Kenyan Shilling",
  ZAR: "Rand",
  INR: "Indian Rupee",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  CHF: "Swiss Franc",
  JPY: "Yen",
  CNY: "Yuan",
  AED: "Dirham",
  SAR: "Riyal",
};

function belowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    const t = TENS[Math.floor(n / 10)];
    const o = n % 10;
    parts.push(o ? `${t}-${ONES[o]}` : t);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

function intToWords(value: number): string {
  if (value === 0) return ONES[0];
  const groups: string[] = [];
  let n = Math.floor(value);
  let scale = 0;
  while (n > 0 && scale < SCALES.length) {
    const chunk = n % 1000;
    if (chunk) {
      const words = belowThousand(chunk);
      groups.unshift(scale ? `${words} ${SCALES[scale]}` : words);
    }
    n = Math.floor(n / 1000);
    scale += 1;
  }
  return groups.join(" ");
}

/** Human-readable currency name for the code (falls back to the code itself). */
export function currencyName(currency?: string | null, plural = true): string {
  const code = String(currency || "USD").trim().toUpperCase();
  if (plural) return CURRENCY_NAMES[code] || code;
  return CURRENCY_SINGULARS[code] || CURRENCY_NAMES[code] || code;
}

/** e.g. amountToWords(150, "USD") → "One Hundred Fifty US Dollars Only". */
export function amountToWords(amount: number, currency?: string | null): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const negative = safe < 0;
  const abs = Math.abs(safe);
  let whole = Math.floor(abs + 1e-9);
  let cents = Math.round((abs - whole) * 100);
  if (cents === 100) {
    whole += 1;
    cents = 0;
  }
  const name = currencyName(currency, whole !== 1);
  let out = `${negative ? "Minus " : ""}${intToWords(whole)} ${name}`;
  if (cents > 0) {
    out += ` and ${intToWords(cents)} ${cents === 1 ? "Cent" : "Cents"}`;
  }
  return `${out} Only`;
}
