/** Receipt PDF chrome labels — aligned with SPA `AppLocale` set (v1). */

export type AppLocale = "en" | "fr" | "ar" | "es" | "de" | "zh-Hans" | "hi";

export const DEFAULT_LOCALE: AppLocale = "en";

const SUPPORTED: AppLocale[] = ["en", "fr", "ar", "es", "de", "zh-Hans", "hi"];

export type ReceiptChromeKey =
  | "officialFeeReceipt"
  | "officialPayslip"
  | "expenseReceipt"
  | "transactionReceipt"
  | "officialReceipt"
  | "receiptNumber"
  | "issuedAt"
  | "status"
  | "parties"
  | "payer"
  | "payee"
  | "reference"
  | "lineItems"
  | "description"
  | "amount"
  | "total"
  | "voided"
  | "verifyAuthenticity"
  | "fingerprint";

type Catalog = Record<ReceiptChromeKey, string>;

const catalogs: Record<AppLocale, Catalog> = {
  en: {
    officialFeeReceipt: "Official Fee Receipt",
    officialPayslip: "Official Payslip",
    expenseReceipt: "Expense Receipt",
    transactionReceipt: "Transaction Receipt",
    officialReceipt: "Official Receipt",
    receiptNumber: "Receipt {{number}}",
    issuedAt: "Issued {{when}} UTC",
    status: "Status: {{status}}",
    parties: "Parties",
    payer: "Payer: {{name}}",
    payee: "Payee: {{name}}",
    reference: "Reference: {{ref}}",
    lineItems: "Line items",
    description: "Description",
    amount: "Amount",
    total: "Total: {{currency}} {{amount}}",
    voided: "VOIDED",
    verifyAuthenticity: "Verify authenticity",
    fingerprint: "Fingerprint: {{hash}}…",
  },
  fr: {
    officialFeeReceipt: "Reçu officiel de frais",
    officialPayslip: "Bulletin de paie officiel",
    expenseReceipt: "Reçu de dépense",
    transactionReceipt: "Reçu de transaction",
    officialReceipt: "Reçu officiel",
    receiptNumber: "Reçu {{number}}",
    issuedAt: "Émis le {{when}} UTC",
    status: "Statut : {{status}}",
    parties: "Parties",
    payer: "Payeur : {{name}}",
    payee: "Bénéficiaire : {{name}}",
    reference: "Référence : {{ref}}",
    lineItems: "Lignes",
    description: "Description",
    amount: "Montant",
    total: "Total : {{currency}} {{amount}}",
    voided: "ANNULÉ",
    verifyAuthenticity: "Vérifier l'authenticité",
    fingerprint: "Empreinte : {{hash}}…",
  },
  ar: {
    officialFeeReceipt: "إيصال رسوم رسمي",
    officialPayslip: "قسيمة راتب رسمية",
    expenseReceipt: "إيصال مصروف",
    transactionReceipt: "إيصال معاملة",
    officialReceipt: "إيصال رسمي",
    receiptNumber: "إيصال {{number}}",
    issuedAt: "صدر في {{when}} UTC",
    status: "الحالة: {{status}}",
    parties: "الأطراف",
    payer: "الدافع: {{name}}",
    payee: "المستفيد: {{name}}",
    reference: "المرجع: {{ref}}",
    lineItems: "البنود",
    description: "الوصف",
    amount: "المبلغ",
    total: "الإجمالي: {{currency}} {{amount}}",
    voided: "ملغى",
    verifyAuthenticity: "تحقق من الأصالة",
    fingerprint: "بصمة: {{hash}}…",
  },
  es: {
    officialFeeReceipt: "Recibo oficial de cuotas",
    officialPayslip: "Nómina oficial",
    expenseReceipt: "Recibo de gasto",
    transactionReceipt: "Recibo de transacción",
    officialReceipt: "Recibo oficial",
    receiptNumber: "Recibo {{number}}",
    issuedAt: "Emitido {{when}} UTC",
    status: "Estado: {{status}}",
    parties: "Partes",
    payer: "Pagador: {{name}}",
    payee: "Beneficiario: {{name}}",
    reference: "Referencia: {{ref}}",
    lineItems: "Conceptos",
    description: "Descripción",
    amount: "Importe",
    total: "Total: {{currency}} {{amount}}",
    voided: "ANULADO",
    verifyAuthenticity: "Verificar autenticidad",
    fingerprint: "Huella: {{hash}}…",
  },
  de: {
    officialFeeReceipt: "Offizielle Gebührenquittung",
    officialPayslip: "Offizielle Gehaltsabrechnung",
    expenseReceipt: "Ausgabenbeleg",
    transactionReceipt: "Transaktionsbeleg",
    officialReceipt: "Offizielle Quittung",
    receiptNumber: "Quittung {{number}}",
    issuedAt: "Ausgestellt {{when}} UTC",
    status: "Status: {{status}}",
    parties: "Beteiligte",
    payer: "Zahler: {{name}}",
    payee: "Empfänger: {{name}}",
    reference: "Referenz: {{ref}}",
    lineItems: "Positionen",
    description: "Beschreibung",
    amount: "Betrag",
    total: "Gesamt: {{currency}} {{amount}}",
    voided: "STORNIERT",
    verifyAuthenticity: "Echtheit prüfen",
    fingerprint: "Fingerabdruck: {{hash}}…",
  },
  "zh-Hans": {
    officialFeeReceipt: "官方学费收据",
    officialPayslip: "官方工资单",
    expenseReceipt: "费用收据",
    transactionReceipt: "交易收据",
    officialReceipt: "官方收据",
    receiptNumber: "收据 {{number}}",
    issuedAt: "签发于 {{when}} UTC",
    status: "状态：{{status}}",
    parties: "相关方",
    payer: "付款人：{{name}}",
    payee: "收款人：{{name}}",
    reference: "参考：{{ref}}",
    lineItems: "明细",
    description: "说明",
    amount: "金额",
    total: "合计：{{currency}} {{amount}}",
    voided: "已作废",
    verifyAuthenticity: "验证真伪",
    fingerprint: "指纹：{{hash}}…",
  },
  hi: {
    officialFeeReceipt: "आधिकारिक शुल्क रसीद",
    officialPayslip: "आधिकारिक वेतन पर्ची",
    expenseReceipt: "खर्च रसीद",
    transactionReceipt: "लेनदेन रसीद",
    officialReceipt: "आधिकारिक रसीद",
    receiptNumber: "रसीद {{number}}",
    issuedAt: "{{when}} UTC को जारी",
    status: "स्थिति: {{status}}",
    parties: "पक्ष",
    payer: "भुगतानकर्ता: {{name}}",
    payee: "प्राप्तकर्ता: {{name}}",
    reference: "संदर्भ: {{ref}}",
    lineItems: "पंक्ति विवरण",
    description: "विवरण",
    amount: "राशि",
    total: "कुल: {{currency}} {{amount}}",
    voided: "रद्द",
    verifyAuthenticity: "प्रामाणिकता सत्यापित करें",
    fingerprint: "फ़िंगरप्रिंट: {{hash}}…",
  },
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (SUPPORTED as string[]).includes(value);
}

export function normalizeLocale(raw: unknown): AppLocale | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim();
  if (isAppLocale(v)) return v;
  const lower = v.toLowerCase();
  if (lower === "zh" || lower.startsWith("zh-cn") || lower.startsWith("zh-hans")) return "zh-Hans";
  const primary = lower.split("-")[0];
  const hit = SUPPORTED.find((code) => code === primary || code.startsWith(primary));
  return hit ?? null;
}

/** Resolve locale for receipt PDF chrome from school default (falls back to English). */
export function resolveReceiptLocale(schoolDefault?: string | null): AppLocale {
  return normalizeLocale(schoolDefault) ?? DEFAULT_LOCALE;
}

export type ReceiptChromeVars = Partial<
  Record<"number" | "when" | "status" | "name" | "ref" | "currency" | "amount" | "hash", string | number>
>;

function interpolate(template: string, vars?: ReceiptChromeVars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key as keyof ReceiptChromeVars];
    return val === undefined || val === null ? "" : String(val);
  });
}

export function tReceipt(locale: AppLocale, key: ReceiptChromeKey, vars?: ReceiptChromeVars): string {
  const catalog = catalogs[locale] ?? catalogs.en;
  const template = catalog[key] ?? catalogs.en[key];
  return interpolate(template, vars);
}

/** Label getters bound to a locale (convenience for PDF rendering). */
export function receiptChrome(locale: AppLocale) {
  const loc = isAppLocale(locale) ? locale : DEFAULT_LOCALE;
  return {
    t: (key: ReceiptChromeKey, vars?: ReceiptChromeVars) => tReceipt(loc, key, vars),
    locale: loc,
  };
}
