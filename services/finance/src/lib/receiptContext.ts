import QRCode from "qrcode";
import {
  receiptChrome,
  resolveReceiptLocale,
  type AppLocale,
  type ReceiptChromeKey,
} from "../i18n/receiptChrome";
import { amountToWords } from "./amountInWords";
import {
  formatReceiptDateTime,
  methodChromeKey,
  statusChromeKey,
  titleCase,
  splitLabelValue,
} from "./receiptFormat";
import type { ReceiptPdfInput } from "./receiptPdf";

const RTL_LOCALES = new Set<AppLocale>(["ar"]);

function normalizeHex(hex?: string | null): string {
  if (!hex || typeof hex !== "string") return "#2563EB";
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return "#2563EB";
  return h.toUpperCase();
}

function formatAmount(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2)}`;
}

export type ReceiptTemplateContext = {
  title: string;
  receiptNumber: string;
  schoolName: string;
  schoolAddress: string;
  schoolEmail: string;
  schoolPhone: string;
  schoolLogoUrl: string;
  schoolMonogram: string;
  brandColor: string;
  sourceRef: string;
  verifyUrl: string;
  authorizedSignatureUrl: string;
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  locale: AppLocale;
  dir: "ltr" | "rtl";
  pageClass: string;
  isVoided: boolean;
  issuedAt: string;
  qrDataUrl: string;
  currency: string;
  amount: number;
  amountDisplay: string;
  amountInWords: string;
  studentName: string;
  hasStudent: boolean;
  categoryLabel: string;
  hasCategory: boolean;
  periodLabel: string;
  hasPeriod: boolean;
  methodLabel: string;
  hasMethod: boolean;
  paidAtDisplay: string;
  hasPaidAt: boolean;
  balanceBeforeDisplay: string;
  hasBalanceBefore: boolean;
  balanceAfterDisplay: string;
  hasBalanceAfter: boolean;
  placeOfIssue: string;
  hasPlace: boolean;
  note: string;
  hasNote: boolean;
  cashierName: string;
  hasCashier: boolean;
  copyLabel: string;
  hasCopyLabel: boolean;
  /** Label/value pairs for the "Payment details" block (label muted, value emphasized). */
  detailItems: Array<{ label: string; value: string }>;
  hasDetails: boolean;
  lineItems: Array<{
    label: string;
    currency: string;
    amount: number;
    amountFormatted: string;
    amountDisplay: string;
  }>;
  t: Record<ReceiptChromeKey, string>;
};

export async function buildReceiptContext(input: ReceiptPdfInput): Promise<ReceiptTemplateContext> {
  const locale = resolveReceiptLocale(input.locale);
  const { t } = receiptChrome(locale);
  const issuedAt = formatReceiptDateTime(input.issuedAt, locale, input.schoolTimezone);
  const paidAtDisplay = input.paidAt ? formatReceiptDateTime(input.paidAt, locale, input.schoolTimezone) : "";
  const isVoided = input.status === "VOIDED";
  const currency = input.currency || "USD";
  const brandColor = normalizeHex(input.brandColor);
  const schoolName = input.schoolName || "School";
  const schoolMonogram = schoolName.trim().charAt(0).toUpperCase() || "S";

  const rawMethod = (input.paymentMethod || "").trim();
  const mKey = rawMethod ? methodChromeKey(rawMethod) : null;
  const methodLabel = mKey ? t(mKey) : rawMethod ? titleCase(rawMethod) : "";

  const sKey = statusChromeKey(input.status);
  const statusLabel = sKey ? t(sKey) : titleCase(input.status);

  const categoryLabel = (input.categoryLabel || "").trim();
  const periodLabel = (input.periodLabel || "").trim();
  const studentName = (input.studentName || "").trim();
  const placeOfIssue = (input.placeOfIssue || "").trim();
  const note = (input.note || "").trim();
  const cashierName = (input.cashierName || "").trim();
  const copyLabel = (input.copyLabel || "").trim();

  const balanceBeforeDisplay =
    typeof input.balanceBefore === "number" ? `${currency} ${formatAmount(input.balanceBefore)}` : "";
  const balanceAfterDisplay =
    typeof input.balanceAfter === "number" ? `${currency} ${formatAmount(input.balanceAfter)}` : "";

  const qrDataUrl = await QRCode.toDataURL(input.verifyUrl, {
    margin: 0,
    width: 240,
    errorCorrectionLevel: "M",
  });

  const lineItems = (input.lineItems || []).map((item) => ({
    label: item.label,
    currency,
    amount: item.amount,
    amountFormatted: formatAmount(item.amount),
    amountDisplay: `${currency} ${formatAmount(item.amount)}`,
  }));

  const detailStrings: string[] = [];
  if (methodLabel) detailStrings.push(t("method", { value: methodLabel }));
  if (paidAtDisplay) detailStrings.push(t("paymentDate", { when: paidAtDisplay }));
  if (categoryLabel) detailStrings.push(t("category", { value: categoryLabel }));
  if (periodLabel) detailStrings.push(t("period", { value: periodLabel }));
  if (studentName) detailStrings.push(t("student", { name: studentName }));
  if (placeOfIssue) detailStrings.push(t("placeOfIssue", { value: placeOfIssue }));
  if (balanceBeforeDisplay) {
    detailStrings.push(t("balanceBefore", { currency, amount: formatAmount(input.balanceBefore ?? 0) }));
  }
  if (balanceAfterDisplay) {
    detailStrings.push(t("balanceAfter", { currency, amount: formatAmount(input.balanceAfter ?? 0) }));
  }
  if (cashierName) detailStrings.push(t("receivedBy", { name: cashierName }));
  const detailItems = detailStrings.map(splitLabelValue);

  return {
    title: input.title,
    receiptNumber: input.receiptNumber,
    schoolName,
    schoolAddress: input.schoolAddress?.trim() || "",
    schoolEmail: input.schoolEmail?.trim() || "",
    schoolPhone: input.schoolPhone?.trim() || "",
    schoolLogoUrl: input.schoolLogoUrl?.trim() || "",
    schoolMonogram,
    brandColor,
    sourceRef: input.sourceRef,
    verifyUrl: input.verifyUrl,
    authorizedSignatureUrl: input.authorizedSignatureUrl?.trim() || "",
    authorizedSignerName: input.authorizedSignerName?.trim() || "",
    authorizedSignerTitle: input.authorizedSignerTitle?.trim() || "Authorized signature",
    locale,
    dir: RTL_LOCALES.has(locale) ? "rtl" : "ltr",
    pageClass: isVoided ? "page is-voided" : "page",
    isVoided,
    issuedAt,
    qrDataUrl,
    currency,
    amount: input.amount,
    amountDisplay: `${currency} ${formatAmount(input.amount)}`,
    amountInWords: amountToWords(input.amount, currency),
    studentName,
    hasStudent: studentName.length > 0,
    categoryLabel,
    hasCategory: categoryLabel.length > 0,
    periodLabel,
    hasPeriod: periodLabel.length > 0,
    methodLabel,
    hasMethod: methodLabel.length > 0,
    paidAtDisplay,
    hasPaidAt: paidAtDisplay.length > 0,
    balanceBeforeDisplay,
    hasBalanceBefore: balanceBeforeDisplay.length > 0,
    balanceAfterDisplay,
    hasBalanceAfter: balanceAfterDisplay.length > 0,
    placeOfIssue,
    hasPlace: placeOfIssue.length > 0,
    note,
    hasNote: note.length > 0,
    cashierName,
    hasCashier: cashierName.length > 0,
    copyLabel,
    hasCopyLabel: copyLabel.length > 0,
    detailItems,
    hasDetails: detailItems.length > 0,
    lineItems,
    t: {
      officialFeeReceipt: t("officialFeeReceipt"),
      officialPayslip: t("officialPayslip"),
      expenseReceipt: t("expenseReceipt"),
      transactionReceipt: t("transactionReceipt"),
      officialReceipt: t("officialReceipt"),
      receiptNumber: t("receiptNumber", { number: input.receiptNumber }),
      issuedAt: t("issuedAt", { when: issuedAt }),
      status: t("status", { status: statusLabel }),
      parties: t("parties"),
      payer: t("payer", { name: input.payerName }),
      payee: t("payee", { name: input.payeeName }),
      reference: t("reference", { ref: input.sourceRef }),
      lineItems: t("lineItems"),
      description: t("description"),
      amount: t("amount"),
      total: t("total", { currency, amount: formatAmount(input.amount) }),
      voided: t("voided"),
      verifyAuthenticity: t("verifyAuthenticity"),
      fingerprint: t("fingerprint", { hash: input.payloadHash.slice(0, 16) }),
      details: t("details"),
      student: t("student", { name: studentName }),
      category: t("category", { value: categoryLabel }),
      period: t("period", { value: periodLabel }),
      method: t("method", { value: methodLabel }),
      paymentDate: t("paymentDate", { when: paidAtDisplay }),
      balanceBefore: t("balanceBefore", { currency, amount: formatAmount(input.balanceBefore ?? 0) }),
      balanceAfter: t("balanceAfter", { currency, amount: formatAmount(input.balanceAfter ?? 0) }),
      amountInWords: t("amountInWords"),
      placeOfIssue: t("placeOfIssue", { value: placeOfIssue }),
      note: t("note"),
      receivedWithThanks: t("receivedWithThanks"),
      receivedBy: t("receivedBy", { name: cashierName }),
      copy: t("copy", { value: copyLabel }),
      receiptNoLabel: t("receiptNoLabel"),
      issueDateLabel: t("issueDateLabel"),
      referenceLabel: t("referenceLabel"),
      methodCash: t("methodCash"),
      methodCheck: t("methodCheck"),
      methodTransfer: t("methodTransfer"),
      methodCard: t("methodCard"),
      methodCheckout: t("methodCheckout"),
      methodOther: t("methodOther"),
      statusIssued: t("statusIssued"),
      statusVoided: t("statusVoided"),
      statusSuperseded: t("statusSuperseded"),
    },
  };
}

/** Sample fixture for Settings preview (Monrovia Academy). */
export function monroviaAcademySampleInput(overrides?: Partial<ReceiptPdfInput>): ReceiptPdfInput {
  return {
    title: "Official Fee Receipt",
    receiptNumber: "MONROVIA-2026-000042",
    issuedAt: new Date("2026-08-06T14:30:00.000Z"),
    schoolName: "Monrovia Academy",
    schoolAddress: "12 Broad Street, Monrovia, Montserrado County, Liberia",
    schoolEmail: "finance@monroviaacademy.edu",
    schoolPhone: "+231 77 123 4567",
    schoolLogoUrl: "",
    brandColor: "#2563EB",
    schoolTimezone: "UTC",
    payerName: "Sarah Johnson (Parent of Emmanuel Johnson)",
    payeeName: "Monrovia Academy",
    currency: "USD",
    amount: 150,
    lineItems: [
      { label: "Tuition — this payment", amount: 150 },
      { label: "Previous balance owing", amount: 350 },
      { label: "Balance owing after payment", amount: 200 },
      { label: "Invoice billed total", amount: 500 },
    ],
    sourceRef: "Pay A1B2C3D4 · Inv E5F6G7H8",
    payloadHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    verifyUrl: "https://sms.gnet.edu/verify/receipt/a1b2c3d4e5f6789012345678901234ab",
    status: "ISSUED",
    locale: "en",
    authorizedSignerName: "James Kollie",
    authorizedSignerTitle: "Accountant",
    paymentMethod: "CASH",
    paidAt: new Date("2026-08-06T14:28:00.000Z"),
    studentName: "Emmanuel Johnson",
    categoryLabel: "Tuition",
    periodLabel: "2025/2026 — Term 1",
    note: "Payment received at the finance office.",
    cashierName: "James Kollie",
    copyLabel: "Original",
    ...overrides,
  };
}
