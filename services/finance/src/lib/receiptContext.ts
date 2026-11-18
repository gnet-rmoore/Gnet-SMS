import QRCode from "qrcode";
import {
  receiptChrome,
  resolveReceiptLocale,
  type AppLocale,
  type ReceiptChromeKey,
} from "../i18n/receiptChrome";
import { amountToWords } from "./amountInWords";
import {
  formatReceiptDate,
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
  const [whole, cents] = Math.abs(n).toFixed(2).split(".");
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
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
  verifyLabel: string;
  fingerprint: string;
  authorizedSignatureUrl: string;
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  locale: AppLocale;
  dir: "ltr" | "rtl";
  pageClass: string;
  isVoided: boolean;
  issuedAt: string;
  issuedAtDisplay: string;
  issuedAtLongDisplay: string;
  qrDataUrl: string;
  currency: string;
  amount: number;
  amountDisplay: string;
  amountFormatted: string;
  amountInWords: string;
  amountInWordsLower: string;
  statusLabel: string;
  statusLabelUpper: string;
  payerName: string;
  payeeName: string;
  paidPercent: number;
  billedTotalDisplay: string;
  earnings: Array<{ label: string; amountFormatted: string; amountDisplay: string }>;
  deductions: Array<{ label: string; amountFormatted: string; amountDisplay: string }>;
  earningsTotalFormatted: string;
  deductionsTotalFormatted: string;
  studentName: string;
  studentDetail: string;
  hasStudent: boolean;
  hasStudentDetail: boolean;
  categoryLabel: string;
  hasCategory: boolean;
  periodLabel: string;
  hasPeriod: boolean;
  methodLabel: string;
  hasMethod: boolean;
  isCashMethod: boolean;
  paidAtDisplay: string;
  paidAtLongDisplay: string;
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
    index: number;
    indexPadded: string;
    first: boolean;
    last: boolean;
  }>;
  t: Record<ReceiptChromeKey, string>;
};

export async function buildReceiptContext(input: ReceiptPdfInput): Promise<ReceiptTemplateContext> {
  const locale = resolveReceiptLocale(input.locale);
  const { t } = receiptChrome(locale);
  const issuedAt = formatReceiptDateTime(input.issuedAt, locale, input.schoolTimezone);
  const issuedAtDisplay = formatReceiptDate(input.issuedAt, locale, input.schoolTimezone);
  const issuedAtLongDisplay = formatReceiptDate(input.issuedAt, locale, input.schoolTimezone, true);
  const paidAtDisplay = input.paidAt ? formatReceiptDate(input.paidAt, locale, input.schoolTimezone) : "";
  const paidAtLongDisplay = input.paidAt
    ? formatReceiptDate(input.paidAt, locale, input.schoolTimezone, true)
    : "";
  const isVoided = input.status === "VOIDED";
  const currency = input.currency || "USD";
  const amountWordsRaw = amountToWords(input.amount, currency);
  const amountWords = amountWordsRaw
    .replace(/\bUS Dollars\b/gi, currency === "USD" ? "United States dollars" : currency)
    .replace(/\bOnly\b/gi, "only")
    .split(" ")
    .map((word, index) =>
      index === 0 || word === "United" || word === "States" ? word : word.toLowerCase()
    )
    .join(" ");
  const amountInWords = amountWords;
  const amountInWordsLower =
    amountWords.charAt(0).toLowerCase() + amountWords.slice(1);
  const brandColor = normalizeHex(input.brandColor);
  const schoolName = input.schoolName || "School";
  const schoolMonogram = schoolName.trim().charAt(0).toUpperCase() || "S";

  const rawMethod = (input.paymentMethod || "").trim();
  const mKey = rawMethod ? methodChromeKey(rawMethod) : null;
  const methodLabel = mKey ? t(mKey) : rawMethod ? titleCase(rawMethod) : "";
  const isCashMethod = rawMethod.toUpperCase() === "CASH";

  const sKey = statusChromeKey(input.status);
  const statusLabel = sKey ? t(sKey) : titleCase(input.status);
  const statusLabelUpper = statusLabel.toUpperCase();
  const verifyLabel = input.verifyUrl.replace(/^https?:\/\//, "");
  const fingerprint = (input.payloadHash.replace(/-/g, "").slice(0, 16).match(/.{1,4}/g) || []).join(" ");

  const categoryLabel = (input.categoryLabel || "").trim();
  const periodLabel = (input.periodLabel || "").trim();
  const studentName = (input.studentName || "").trim();
  const studentDetail = (input.studentDetail || "").trim();
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

  const rawLineItems = input.lineItems || [];
  const lineItems = rawLineItems.map((item, index) => ({
    label: item.label,
    currency,
    amount: item.amount,
    amountFormatted: formatAmount(item.amount),
    amountDisplay: `${currency} ${formatAmount(item.amount)}`,
    index: index + 1,
    indexPadded: String(index + 1).padStart(2, "0"),
    first: index === 0,
    last: index === rawLineItems.length - 1,
  }));

  const isNetLine = (label: string) => /net (pay|salary)/i.test(label);
  const earnings = lineItems
    .filter((item) => item.amount > 0 && !isNetLine(item.label))
    .map((item) => ({
      label: item.label,
      amountFormatted: item.amountFormatted,
      amountDisplay: item.amountDisplay,
    }));
  const deductions = lineItems
    .filter((item) => item.amount < 0)
    .map((item) => ({
      label: item.label,
      amountFormatted: formatAmount(Math.abs(item.amount)),
      amountDisplay: `${currency} ${formatAmount(Math.abs(item.amount))}`,
    }));
  const earningsTotalFormatted = formatAmount(
    lineItems.reduce((sum, item) => sum + (item.amount > 0 && !isNetLine(item.label) ? item.amount : 0), 0)
  );
  const deductionsTotalFormatted = formatAmount(
    lineItems.reduce((sum, item) => sum + (item.amount < 0 ? Math.abs(item.amount) : 0), 0)
  );

  const billedTotal =
    typeof input.balanceBefore === "number"
      ? input.balanceBefore
      : typeof input.balanceAfter === "number"
        ? input.amount + input.balanceAfter
        : input.amount;
  const billedTotalDisplay = `${currency} ${formatAmount(billedTotal)}`;
  const paidPercent =
    billedTotal > 0 ? Math.min(100, Math.max(0, Math.round((input.amount / billedTotal) * 100))) : 0;

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
    verifyLabel,
    fingerprint,
    authorizedSignatureUrl: input.authorizedSignatureUrl?.trim() || "",
    authorizedSignerName: input.authorizedSignerName?.trim() || "",
    authorizedSignerTitle: input.authorizedSignerTitle?.trim() || "Authorized signature",
    locale,
    dir: RTL_LOCALES.has(locale) ? "rtl" : "ltr",
    pageClass: isVoided ? "page is-voided" : "page",
    isVoided,
    issuedAt,
    issuedAtDisplay,
    issuedAtLongDisplay,
    qrDataUrl,
    currency,
    amount: input.amount,
    amountDisplay: `${currency} ${formatAmount(input.amount)}`,
    amountFormatted: formatAmount(input.amount),
    amountInWords,
    amountInWordsLower,
    statusLabel,
    statusLabelUpper,
    payerName: (input.payerName || "").trim(),
    payeeName: (input.payeeName || "").trim(),
    paidPercent,
    billedTotalDisplay,
    earnings,
    deductions,
    earningsTotalFormatted,
    deductionsTotalFormatted,
    studentName,
    studentDetail,
    hasStudent: studentName.length > 0,
    hasStudentDetail: studentDetail.length > 0,
    categoryLabel,
    hasCategory: categoryLabel.length > 0,
    periodLabel,
    hasPeriod: periodLabel.length > 0,
    methodLabel,
    hasMethod: methodLabel.length > 0,
    isCashMethod,
    paidAtDisplay,
    paidAtLongDisplay,
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

const SAMPLE_BASE = {
  issuedAt: new Date("2026-11-17T14:30:00.000Z"),
  schoolEmail: "finance@liberianacademy.edu.lr",
  schoolPhone: "+231 77 000 0000",
  schoolLogoUrl: "",
  brandColor: "#2563EB",
  schoolTimezone: "Africa/Monrovia",
  currency: "USD",
  payloadHash: "a91f3c7de204b58aa91f3c7de204b58aa91f3c7de204b58aa91f3c7de204b58a",
  verifyUrl: "https://verify.liberianacademy.edu.lr/r/Xk29-PqL7",
  status: "ISSUED",
  locale: "en",
  authorizedSignerName: "Finance Office",
  authorizedSignerTitle: "Authorised signatory",
} as const;

/** Preview fixtures mirror the six official Liberian Academy designs so each picker option shows real-shaped data. */
export function sampleInputForReceiptTemplate(templateId: string): ReceiptPdfInput {
  if (templateId.startsWith("PAYSLIP_")) {
    const earnings =
      templateId === "PAYSLIP_EARNINGS_DEDUCTIONS"
        ? [
            { label: "Basic salary", amount: 1200 },
            { label: "Housing allowance", amount: 150 },
            { label: "Transport allowance", amount: 75 },
          ]
        : [
            { label: "Basic salary", amount: 1200 },
            { label: "Allowances (housing, transport)", amount: 225 },
          ];
    return {
      ...SAMPLE_BASE,
      title: "PAYSLIP",
      receiptNumber: "LR-2026-000211",
      schoolName: "Liberian Academy",
      schoolAddress: "Monrovia, Liberia",
      payerName: "Liberian Academy",
      payeeName: "Sarah K. Johnson",
      amount: 1269,
      lineItems: [
        ...earnings,
        { label: "Income tax", amount: -96 },
        { label: "NASSCORP contribution", amount: -60 },
        { label: "Net pay", amount: 1269 },
      ],
      sourceRef: "Payroll October 2026",
      periodLabel: "October 2026",
      paidAt: new Date("2026-10-31T12:00:00.000Z"),
      paymentMethod: "BANK TRANSFER",
      categoryLabel: "Mathematics Department",
      verifyUrl: "https://verify.liberianacademy.edu.lr/r/Qm81-Zt40",
      payloadHash: "7be290ac14d3f6e17be290ac14d3f6e1",
      authorizedSignerTitle: "Finance Office",
    };
  }

  if (templateId.startsWith("EXPENSE_")) {
    return {
      ...SAMPLE_BASE,
      title: "Expense Receipt",
      receiptNumber: "LR-2026-000142",
      schoolName: "Liberian Academy",
      schoolAddress: "Monrovia, Liberia",
      payerName: "Liberian Academy",
      payeeName: "Monrovia Office Supplies Ltd.",
      amount: 450,
      lineItems: [
        { label: "Printing paper, A4 (20 reams)", amount: 180 },
        { label: "Toner cartridges (2)", amount: 245.5 },
        { label: "Delivery", amount: 24.5 },
      ],
      sourceRef: "EXP-0457",
      categoryLabel: "Office Supplies",
      paymentMethod: "BANK TRANSFER",
      paidAt: new Date("2026-11-16T12:00:00.000Z"),
      note:
        templateId === "EXPENSE_CLEAN_LEDGER"
          ? "Term 2 supplies, approved by Head of Operations."
          : "Term 2 administrative supplies, approved by the Head of Operations.",
      copyLabel: "Original copy",
      cashierName: "Finance Office",
      authorizedSignerTitle: "Finance Office",
    };
  }

  return {
    ...SAMPLE_BASE,
    title: "Official Receipt",
    receiptNumber: "LR-2026-000378",
    schoolName: "Liberian Academy",
    schoolAddress: "Monrovia, Liberia",
    payerName: "Mrs. Grace Brown",
    payeeName: "Liberian Academy",
    amount: 500,
    lineItems: [
      { label: "Term 2 tuition – billed", amount: 850 },
      { label: "Previous balance owing", amount: 850 },
      { label: "Amount paid (Cash)", amount: 500 },
    ],
    sourceRef: "INV-2026-0912",
    studentName: "Emmanuel T. Brown",
    studentDetail: "Grade 8",
    categoryLabel: "Tuition",
    periodLabel: "Term 2, 2026/2027",
    paymentMethod: "CASH",
    paidAt: new Date("2026-11-17T12:00:00.000Z"),
    balanceBefore: 850,
    balanceAfter: 350,
    copyLabel: "Parent copy",
    cashierName: "",
    verifyUrl: "https://verify.liberianacademy.edu.lr/r/Lw55-Ab19",
    payloadHash: "c40d2e8f61a793b0c40d2e8f61a793b0",
    authorizedSignerTitle: "Registrar",
  };
}
