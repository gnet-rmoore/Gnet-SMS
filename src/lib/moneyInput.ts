export function normalizeMoneyInputValue(value: string | number): string {
  const cleaned = String(value).replace(/,/g, "").replace(/[^\d.]/g, "");
  const decimalIndex = cleaned.indexOf(".");
  if (decimalIndex === -1) return cleaned;
  const whole = cleaned.slice(0, decimalIndex) || "0";
  const fraction = cleaned.slice(decimalIndex + 1).replace(/\./g, "");
  return `${whole}.${fraction}`;
}

export function formatMoneyInputValue(value: string | number): string {
  const normalized = normalizeMoneyInputValue(value);
  if (!normalized) return "";
  const [whole, fraction] = normalized.split(".", 2);
  const unpaddedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const groupedWhole = unpaddedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${groupedWhole}.${fraction}` : groupedWhole;
}
