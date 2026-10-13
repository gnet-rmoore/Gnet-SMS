import QRCode from "qrcode";
import {
  receiptChrome,
  resolveReceiptLocale,
  type AppLocale,
  type ReceiptChromeKey,
} from "../i18n/receiptChrome";
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
  const issuedAt = input.issuedAt.toISOString().replace("T", " ").slice(0, 19);
  const isVoided = input.status === "VOIDED";
  const currency = input.currency || "USD";
  const brandColor = normalizeHex(input.brandColor);
  const schoolName = input.schoolName || "School";
  const schoolMonogram = schoolName.trim().charAt(0).toUpperCase() || "S";

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
    lineItems,
    t: {
      officialFeeReceipt: t("officialFeeReceipt"),
      officialPayslip: t("officialPayslip"),
      expenseReceipt: t("expenseReceipt"),
      transactionReceipt: t("transactionReceipt"),
      officialReceipt: t("officialReceipt"),
      receiptNumber: t("receiptNumber", { number: input.receiptNumber }),
      issuedAt: t("issuedAt", { when: issuedAt }),
      status: t("status", { status: input.status }),
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
    ...overrides,
  };
}
