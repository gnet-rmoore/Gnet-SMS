import type { PayrollFormData, PayrollNotes } from "./types";

export const emptyPayrollForm = (
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear()
): PayrollFormData => ({
  userId: "",
  month,
  year,
  basicSalary: "",
  allowances: "",
  deductions: "",
  status: "PENDING",
  currency: "USD",
  taxId: "",
  iban: "",
  swift: "",
  employmentType: "Full-time",
  customNotes: "",
});

export function getMonthName(m: number): string {
  return new Date(2026, m - 1, 1).toLocaleString("default", { month: "long" });
}

export function getCurrencySymbol(cur: string): string {
  switch (cur) {
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "NGN":
      return "₦";
    case "INR":
      return "₹";
    case "CAD":
      return "C$";
    default:
      return "$";
  }
}

export function parsePayrollNotes(notesStr?: string | null): PayrollNotes {
  const base: PayrollNotes = {
    currency: "USD",
    taxId: "",
    iban: "",
    swift: "",
    employmentType: "Full-time",
    customNotes: "",
  };
  if (!notesStr) return base;
  try {
    if (notesStr.trim().startsWith("{")) {
      return { ...base, ...JSON.parse(notesStr) };
    }
    return { ...base, customNotes: notesStr };
  } catch {
    return { ...base, customNotes: notesStr };
  }
}

export function buildNotesPayload(form: PayrollFormData): string {
  return JSON.stringify({
    currency: form.currency,
    taxId: form.taxId.trim(),
    iban: form.iban.trim(),
    swift: form.swift.trim(),
    employmentType: form.employmentType,
    customNotes: form.customNotes.trim(),
  });
}

export function computeNet(
  basic: number | string,
  allowances: number | string,
  deductions: number | string
): number {
  return Number(basic || 0) + Number(allowances || 0) - Number(deductions || 0);
}

export function yearOptions(center = new Date().getFullYear()): number[] {
  return [center - 1, center, center + 1, center + 2];
}

export function formatMoney(amount: number, symbol = "$"): string {
  return `${symbol}${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
