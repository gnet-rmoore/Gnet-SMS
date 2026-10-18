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
  | "fingerprint"
  | "details"
  | "student"
  | "category"
  | "period"
  | "method"
  | "paymentDate"
  | "balanceBefore"
  | "balanceAfter"
  | "amountInWords"
  | "placeOfIssue"
  | "note"
  | "receivedWithThanks"
  | "receivedBy"
  | "copy"
  | "receiptNoLabel"
  | "issueDateLabel"
  | "referenceLabel"
  | "methodCash"
  | "methodCheck"
  | "methodTransfer"
  | "methodCard"
  | "methodCheckout"
  | "methodOther"
  | "statusIssued"
  | "statusVoided"
  | "statusSuperseded";

type Catalog = Record<ReceiptChromeKey, string>;

const catalogs: Record<AppLocale, Catalog> = {
  en: {
    officialFeeReceipt: "Official Fee Receipt",
    officialPayslip: "Official Payslip",
    expenseReceipt: "Expense Receipt",
    transactionReceipt: "Transaction Receipt",
    officialReceipt: "Official Receipt",
    receiptNumber: "Receipt {{number}}",
    issuedAt: "Issued {{when}}",
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
    details: "Payment details",
    student: "Student: {{name}}",
    category: "Category: {{value}}",
    period: "Period: {{value}}",
    method: "Method: {{value}}",
    paymentDate: "Payment date: {{when}}",
    balanceBefore: "Balance before: {{currency}} {{amount}}",
    balanceAfter: "Balance after: {{currency}} {{amount}}",
    amountInWords: "Amount in words",
    placeOfIssue: "Place of issue: {{value}}",
    note: "Note",
    receivedWithThanks:
      "Received with thanks. This is a computer-generated receipt and remains valid without a handwritten signature.",
    receivedBy: "Received by: {{name}}",
    copy: "{{value}}",
    receiptNoLabel: "Receipt no.",
    issueDateLabel: "Issue date",
    referenceLabel: "Reference",
    methodCash: "Cash",
    methodCheck: "Cheque",
    methodTransfer: "Bank transfer",
    methodCard: "Card",
    methodCheckout: "Online payment",
    methodOther: "Other",
    statusIssued: "Issued",
    statusVoided: "Voided",
    statusSuperseded: "Superseded",
  },
  fr: {
    officialFeeReceipt: "Reçu officiel de frais",
    officialPayslip: "Bulletin de paie officiel",
    expenseReceipt: "Reçu de dépense",
    transactionReceipt: "Reçu de transaction",
    officialReceipt: "Reçu officiel",
    receiptNumber: "Reçu {{number}}",
    issuedAt: "Émis le {{when}}",
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
    details: "Détails du paiement",
    student: "Élève : {{name}}",
    category: "Catégorie : {{value}}",
    period: "Période : {{value}}",
    method: "Mode : {{value}}",
    paymentDate: "Date de paiement : {{when}}",
    balanceBefore: "Solde avant : {{currency}} {{amount}}",
    balanceAfter: "Solde après : {{currency}} {{amount}}",
    amountInWords: "Montant en lettres",
    placeOfIssue: "Lieu d'émission : {{value}}",
    note: "Remarque",
    receivedWithThanks:
      "Reçu avec remerciements. Ce reçu est généré par ordinateur et reste valable sans signature manuscrite.",
    receivedBy: "Reçu par : {{name}}",
    copy: "{{value}}",
    receiptNoLabel: "N° de reçu",
    issueDateLabel: "Date d'émission",
    referenceLabel: "Référence",
    methodCash: "Espèces",
    methodCheck: "Chèque",
    methodTransfer: "Virement bancaire",
    methodCard: "Carte",
    methodCheckout: "Paiement en ligne",
    methodOther: "Autre",
    statusIssued: "Émis",
    statusVoided: "Annulé",
    statusSuperseded: "Remplacé",
  },
  ar: {
    officialFeeReceipt: "إيصال رسوم رسمي",
    officialPayslip: "قسيمة راتب رسمية",
    expenseReceipt: "إيصال مصروف",
    transactionReceipt: "إيصال معاملة",
    officialReceipt: "إيصال رسمي",
    receiptNumber: "إيصال {{number}}",
    issuedAt: "صدر في {{when}}",
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
    details: "تفاصيل الدفع",
    student: "الطالب: {{name}}",
    category: "الفئة: {{value}}",
    period: "الفترة: {{value}}",
    method: "طريقة الدفع: {{value}}",
    paymentDate: "تاريخ الدفع: {{when}}",
    balanceBefore: "الرصيد قبل: {{currency}} {{amount}}",
    balanceAfter: "الرصيد بعد: {{currency}} {{amount}}",
    amountInWords: "المبلغ كتابةً",
    placeOfIssue: "مكان الإصدار: {{value}}",
    note: "ملاحظة",
    receivedWithThanks:
      "استُلم مع الشكر. هذا الإيصال صادر آليًا ويبقى ساريًا دون توقيع بخط اليد.",
    receivedBy: "استلمه: {{name}}",
    copy: "{{value}}",
    receiptNoLabel: "رقم الإيصال",
    issueDateLabel: "تاريخ الإصدار",
    referenceLabel: "المرجع",
    methodCash: "نقدًا",
    methodCheck: "شيك",
    methodTransfer: "تحويل بنكي",
    methodCard: "بطاقة",
    methodCheckout: "دفع إلكتروني",
    methodOther: "أخرى",
    statusIssued: "صادر",
    statusVoided: "ملغى",
    statusSuperseded: "مُستبدل",
  },
  es: {
    officialFeeReceipt: "Recibo oficial de cuotas",
    officialPayslip: "Nómina oficial",
    expenseReceipt: "Recibo de gasto",
    transactionReceipt: "Recibo de transacción",
    officialReceipt: "Recibo oficial",
    receiptNumber: "Recibo {{number}}",
    issuedAt: "Emitido {{when}}",
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
    details: "Detalles del pago",
    student: "Estudiante: {{name}}",
    category: "Categoría: {{value}}",
    period: "Período: {{value}}",
    method: "Método: {{value}}",
    paymentDate: "Fecha de pago: {{when}}",
    balanceBefore: "Saldo anterior: {{currency}} {{amount}}",
    balanceAfter: "Saldo posterior: {{currency}} {{amount}}",
    amountInWords: "Importe en letras",
    placeOfIssue: "Lugar de emisión: {{value}}",
    note: "Nota",
    receivedWithThanks:
      "Recibido con agradecimiento. Este recibo se genera por computadora y es válido sin firma manuscrita.",
    receivedBy: "Recibido por: {{name}}",
    copy: "{{value}}",
    receiptNoLabel: "N.º de recibo",
    issueDateLabel: "Fecha de emisión",
    referenceLabel: "Referencia",
    methodCash: "Efectivo",
    methodCheck: "Cheque",
    methodTransfer: "Transferencia bancaria",
    methodCard: "Tarjeta",
    methodCheckout: "Pago en línea",
    methodOther: "Otro",
    statusIssued: "Emitido",
    statusVoided: "Anulado",
    statusSuperseded: "Reemplazado",
  },
  de: {
    officialFeeReceipt: "Offizielle Gebührenquittung",
    officialPayslip: "Offizielle Gehaltsabrechnung",
    expenseReceipt: "Ausgabenbeleg",
    transactionReceipt: "Transaktionsbeleg",
    officialReceipt: "Offizielle Quittung",
    receiptNumber: "Quittung {{number}}",
    issuedAt: "Ausgestellt {{when}}",
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
    details: "Zahlungsdetails",
    student: "Schüler/in: {{name}}",
    category: "Kategorie: {{value}}",
    period: "Zeitraum: {{value}}",
    method: "Zahlungsart: {{value}}",
    paymentDate: "Zahlungsdatum: {{when}}",
    balanceBefore: "Saldo vorher: {{currency}} {{amount}}",
    balanceAfter: "Saldo nachher: {{currency}} {{amount}}",
    amountInWords: "Betrag in Worten",
    placeOfIssue: "Ausstellungsort: {{value}}",
    note: "Hinweis",
    receivedWithThanks:
      "Dankend erhalten. Dieser Beleg wurde computergeneriert und ist ohne handschriftliche Unterschrift gültig.",
    receivedBy: "Erhalten von: {{name}}",
    copy: "{{value}}",
    receiptNoLabel: "Belegnr.",
    issueDateLabel: "Ausstellungsdatum",
    referenceLabel: "Referenz",
    methodCash: "Bargeld",
    methodCheck: "Scheck",
    methodTransfer: "Banküberweisung",
    methodCard: "Karte",
    methodCheckout: "Online-Zahlung",
    methodOther: "Sonstiges",
    statusIssued: "Ausgestellt",
    statusVoided: "Storniert",
    statusSuperseded: "Ersetzt",
  },
  "zh-Hans": {
    officialFeeReceipt: "官方学费收据",
    officialPayslip: "官方工资单",
    expenseReceipt: "费用收据",
    transactionReceipt: "交易收据",
    officialReceipt: "官方收据",
    receiptNumber: "收据 {{number}}",
    issuedAt: "签发于 {{when}}",
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
    details: "付款详情",
    student: "学生：{{name}}",
    category: "类别：{{value}}",
    period: "期间：{{value}}",
    method: "方式：{{value}}",
    paymentDate: "付款日期：{{when}}",
    balanceBefore: "付款前余额：{{currency}} {{amount}}",
    balanceAfter: "付款后余额：{{currency}} {{amount}}",
    amountInWords: "金额大写",
    placeOfIssue: "签发地点：{{value}}",
    note: "备注",
    receivedWithThanks: "恭谢惠顾。本收据由计算机生成，无需手写签名即有效。",
    receivedBy: "经办人：{{name}}",
    copy: "{{value}}",
    receiptNoLabel: "收据编号",
    issueDateLabel: "签发日期",
    referenceLabel: "参考",
    methodCash: "现金",
    methodCheck: "支票",
    methodTransfer: "银行转账",
    methodCard: "银行卡",
    methodCheckout: "在线支付",
    methodOther: "其他",
    statusIssued: "已签发",
    statusVoided: "已作废",
    statusSuperseded: "已替换",
  },
  hi: {
    officialFeeReceipt: "आधिकारिक शुल्क रसीद",
    officialPayslip: "आधिकारिक वेतन पर्ची",
    expenseReceipt: "खर्च रसीद",
    transactionReceipt: "लेनदेन रसीद",
    officialReceipt: "आधिकारिक रसीद",
    receiptNumber: "रसीद {{number}}",
    issuedAt: "{{when}} को जारी",
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
    details: "भुगतान विवरण",
    student: "छात्र: {{name}}",
    category: "श्रेणी: {{value}}",
    period: "अवधि: {{value}}",
    method: "माध्यम: {{value}}",
    paymentDate: "भुगतान तिथि: {{when}}",
    balanceBefore: "पहले शेष: {{currency}} {{amount}}",
    balanceAfter: "बाद शेष: {{currency}} {{amount}}",
    amountInWords: "राशि शब्दों में",
    placeOfIssue: "जारी करने का स्थान: {{value}}",
    note: "टिप्पणी",
    receivedWithThanks:
      "धन्यवाद सहित प्राप्त। यह रसीद कंप्यूटर द्वारा जनित है और हस्तलिखित हस्ताक्षर के बिना भी मान्य है।",
    receivedBy: "प्राप्तकर्ता: {{name}}",
    copy: "{{value}}",
    receiptNoLabel: "रसीद संख्या",
    issueDateLabel: "जारी तिथि",
    referenceLabel: "संदर्भ",
    methodCash: "नकद",
    methodCheck: "चेक",
    methodTransfer: "बैंक हस्तांतरण",
    methodCard: "कार्ड",
    methodCheckout: "ऑनलाइन भुगतान",
    methodOther: "अन्य",
    statusIssued: "जारी",
    statusVoided: "रद्द",
    statusSuperseded: "प्रतिस्थापित",
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
  Record<
    | "number"
    | "when"
    | "status"
    | "name"
    | "ref"
    | "currency"
    | "amount"
    | "hash"
    | "value",
    string | number
  >
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
