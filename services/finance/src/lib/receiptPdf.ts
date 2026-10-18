import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { receiptChrome, resolveReceiptLocale } from "../i18n/receiptChrome";
import { amountToWords } from "./amountInWords";
import { formatReceiptDateTime, methodChromeKey, statusChromeKey, titleCase } from "./receiptFormat";

export type ReceiptPdfInput = {
  title: string;
  receiptNumber: string;
  issuedAt: Date;
  schoolName: string;
  schoolAddress?: string | null;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
  schoolLogoUrl?: string | null;
  brandColor?: string | null;
  payerName: string;
  payeeName: string;
  currency: string;
  amount: number;
  lineItems: Array<{ label: string; amount: number }>;
  sourceRef: string;
  payloadHash: string;
  verifyUrl: string;
  status: string;
  locale?: string;
  /** Official staff signature image (data URL) for authorized signature line */
  authorizedSignatureUrl?: string | null;
  authorizedSignerName?: string | null;
  authorizedSignerTitle?: string | null;
  /** IANA timezone of the school, used to render dates in local wall-clock time. */
  schoolTimezone?: string | null;
  /** Payment method code: CASH | CHECK | TRANSFER | CARD | OTHER | CHECKOUT */
  paymentMethod?: string | null;
  /** Actual payment date (may differ from the receipt issue date). */
  paidAt?: Date | null;
  /** Student the payment relates to (fee receipts). */
  studentName?: string | null;
  /** Fee/payroll/expense category surfaced under details. */
  categoryLabel?: string | null;
  /** School year or billing month/period label. */
  periodLabel?: string | null;
  /** Balance owed before this payment (fee receipts). */
  balanceBefore?: number | null;
  /** Balance owed after this payment (fee receipts). */
  balanceAfter?: number | null;
  /** Place the receipt was issued from. */
  placeOfIssue?: string | null;
  /** Free-text note shown above the statement. */
  note?: string | null;
  /** Staff member who received/recorded the payment. */
  cashierName?: string | null;
  /** Copy designation, e.g. "Original" / "School Copy". */
  copyLabel?: string | null;
};

/** Normalize to #RRGGBB (PDFKit needs hex or 0–1 RGB — never raw 0–255). */
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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix brand toward white for light panels. */
function tintHex(hex: string, amount = 0.88): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

async function fetchLogoBuffer(url?: string | null): Promise<Buffer | null> {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("data:")) {
      const match = trimmed.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
      if (!match?.[1]) return null;
      return Buffer.from(match[1], "base64");
    }

    let fetchUrl = trimmed;
    if (fetchUrl.startsWith("/")) {
      const base =
        process.env.S3_PUBLIC_URL ||
        process.env.APP_URL?.split(",")[0]?.trim() ||
        "http://localhost:8080";
      fetchUrl = `${base.replace(/\/$/, "")}${fetchUrl}`;
    }
    if (process.env.S3_ENDPOINT) {
      fetchUrl = fetchUrl
        .replace("http://localhost:9000", process.env.S3_ENDPOINT)
        .replace("http://127.0.0.1:9000", process.env.S3_ENDPOINT);
    }

    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (ctype && !ctype.startsWith("image/") && !ctype.includes("octet-stream")) {
      return null;
    }
    const bytes = await res.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 2_000_000) return null;
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export async function renderReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  const locale = resolveReceiptLocale(input.locale);
  const { t } = receiptChrome(locale);
  const issuedWhen = formatReceiptDateTime(input.issuedAt, locale, input.schoolTimezone);
  const paidAtDisplay = input.paidAt
    ? formatReceiptDateTime(input.paidAt, locale, input.schoolTimezone)
    : "";
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

  const [qrDataUrl, logoBuf] = await Promise.all([
    QRCode.toDataURL(input.verifyUrl, {
      margin: 1,
      width: 140,
      errorCorrectionLevel: "M",
    }),
    fetchLogoBuffer(input.schoolLogoUrl),
  ]);
  const qrBuf = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");

  const brand = normalizeHex(input.brandColor);
  const brandSoft = tintHex(brand, 0.9);
  const headerInk = "#0f172a";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const left = 48;
    const right = pageW - 48;
    const contentW = right - left;
    const headerH = 132;

    const logoSize = 64;
    const headerPadY = 28;
    let textLeft = left;
    let textMaxW = contentW;

    if (logoBuf) {
      try {
        doc.image(logoBuf, left, headerPadY, {
          fit: [logoSize, logoSize],
          align: "center",
          valign: "center",
        });
        textLeft = left + logoSize + 18;
        textMaxW = contentW - logoSize - 18;
      } catch {
        /* fall through to monogram */
      }
    }

    if (!logoBuf || textLeft === left) {
      const initial = (input.schoolName || "S").trim().charAt(0).toUpperCase() || "S";
      doc
        .roundedRect(left, headerPadY, logoSize, logoSize, 10)
        .lineWidth(1)
        .strokeColor("#e2e8f0")
        .stroke();
      doc
        .fillColor(headerInk)
        .font("Helvetica-Bold")
        .fontSize(26)
        .text(initial, left, headerPadY + 18, { width: logoSize, align: "center" });
      textLeft = left + logoSize + 18;
      textMaxW = contentW - logoSize - 18;
    }

    doc
      .fillColor(headerInk)
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(input.schoolName || "School", textLeft, headerPadY + 2, {
        width: textMaxW,
        lineGap: 1,
      });

    let y = doc.y + 6;
    doc.font("Helvetica").fontSize(9).fillColor(headerInk);
    if (input.schoolAddress) {
      doc.text(input.schoolAddress, textLeft, y, { width: textMaxW, lineGap: 1 });
      y = doc.y + 3;
    }
    const contactParts = [input.schoolEmail, input.schoolPhone].filter(Boolean) as string[];
    if (contactParts.length) {
      doc.text(contactParts.join("   ·   "), textLeft, y, { width: textMaxW });
    }

    doc
      .moveTo(left, headerH)
      .lineTo(right, headerH)
      .lineWidth(1)
      .strokeColor("#e2e8f0")
      .stroke();

    // —— Title row ——
    let bodyY = headerH + 28;
    doc
      .fillColor(brand)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(input.title, left, bodyY, { width: contentW * 0.55 });

    const metaX = left + contentW * 0.52;
    doc.font("Helvetica").fontSize(9).fillColor("#64748b");
    doc.text(t("receiptNumber", { number: input.receiptNumber }), metaX, bodyY, {
      width: contentW * 0.48,
      align: "right",
    });
    doc.text(t("issuedAt", { when: issuedWhen }), metaX, bodyY + 12, {
      width: contentW * 0.48,
      align: "right",
    });
    doc
      .fillColor(brand)
      .font("Helvetica-Bold")
      .text(t("status", { status: statusLabel }), metaX, bodyY + 24, {
        width: contentW * 0.48,
        align: "right",
      });
    if (copyLabel) {
      doc
        .fillColor("#94a3b8")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(copyLabel.toUpperCase(), metaX, bodyY + 38, {
          width: contentW * 0.48,
          align: "right",
        });
    }

    doc.y = Math.max(doc.y, bodyY + 52);
    doc
      .moveTo(left, doc.y)
      .lineTo(right, doc.y)
      .lineWidth(1)
      .strokeColor(brandSoft)
      .stroke();
    doc.moveDown(1);

    // —— Parties ——
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text(t("parties"));
    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(10).fillColor("#334155");
    doc.text(t("payer", { name: input.payerName }));
    doc.text(t("payee", { name: input.payeeName }));
    doc.text(t("reference", { ref: input.sourceRef }));

    // —— Payment details (two-column) ——
    const detailStrings: string[] = [];
    if (methodLabel) detailStrings.push(t("method", { value: methodLabel }));
    if (paidAtDisplay) detailStrings.push(t("paymentDate", { when: paidAtDisplay }));
    if (categoryLabel) detailStrings.push(t("category", { value: categoryLabel }));
    if (periodLabel) detailStrings.push(t("period", { value: periodLabel }));
    if (studentName) detailStrings.push(t("student", { name: studentName }));
    if (placeOfIssue) detailStrings.push(t("placeOfIssue", { value: placeOfIssue }));
    if (typeof input.balanceBefore === "number") {
      detailStrings.push(
        t("balanceBefore", {
          currency: input.currency,
          amount: Number(input.balanceBefore).toFixed(2),
        })
      );
    }
    if (typeof input.balanceAfter === "number") {
      detailStrings.push(
        t("balanceAfter", {
          currency: input.currency,
          amount: Number(input.balanceAfter).toFixed(2),
        })
      );
    }
    if (cashierName) detailStrings.push(t("receivedBy", { name: cashierName }));

    if (detailStrings.length) {
      doc.moveDown(0.8);
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text(t("details"));
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(9.5).fillColor("#334155");
      const colW = contentW / 2;
      const rowH = 15;
      let rowY = doc.y;
      for (let i = 0; i < detailStrings.length; i += 2) {
        doc.text(detailStrings[i], left, rowY, { width: colW - 10, lineBreak: false });
        if (detailStrings[i + 1]) {
          doc.text(detailStrings[i + 1], left + colW, rowY, { width: colW - 10, lineBreak: false });
        }
        rowY += rowH;
      }
      doc.y = rowY + 4;
    }

    doc.moveDown(1);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text(t("lineItems"));
    doc.moveDown(0.35);

    const startY = doc.y;
    // Column header bar in soft brand
    doc.rect(left, startY - 4, contentW, 22).fillColor(brandSoft).fill();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(brand);
    doc.text(t("description"), left + 8, startY + 2, { width: 340 });
    doc.text(t("amount"), 400, startY + 2, { width: right - 400 - 8, align: "right" });

    doc.y = startY + 24;
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a");
    for (const item of input.lineItems) {
      const rowY = doc.y;
      doc.text(item.label, left + 8, rowY, { width: 340 });
      doc.text(`${input.currency} ${Number(item.amount).toFixed(2)}`, 400, rowY, {
        width: right - 400 - 8,
        align: "right",
      });
      doc.moveDown(0.65);
    }

    doc.moveDown(0.5);
    const totalLabel = t("total", {
      currency: input.currency,
      amount: Number(input.amount).toFixed(2),
    });
    const totalY = doc.y;
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(totalLabel, left, totalY, {
        width: contentW,
        align: "right",
      });
    doc.y = totalY + 20;

    // —— Amount in words + note + statement ——
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text(t("amountInWords"), left, doc.y, {
      width: contentW,
    });
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(
      amountToWords(input.amount, input.currency),
      left,
      doc.y,
      { width: contentW }
    );
    if (note) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text(t("note"), left, doc.y, {
        width: contentW,
      });
      doc.moveDown(0.15);
      doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(note, left, doc.y, {
        width: contentW,
      });
    }
    doc.moveDown(0.7);
    doc
      .moveTo(left, doc.y)
      .lineTo(right, doc.y)
      .lineWidth(1)
      .strokeColor(brandSoft)
      .stroke();
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(8.5).fillColor("#64748b").text(
      t("receivedWithThanks"),
      left,
      doc.y,
      { width: contentW, lineGap: 1 }
    );

    if (input.status === "VOIDED") {
      doc.save();
      doc.rotate(-30, { origin: [300, 400] });
      doc.font("Helvetica-Bold").fontSize(48).fillColor("#f43f5e").opacity(0.25);
      doc.text(t("voided"), 120, 360);
      doc.restore();
      doc.opacity(1);
    }

    const footerY = 700;

    // —— Authorized signature (handwritten from Profile) ——
    const sigY = Math.min(Math.max(doc.y + 26, footerY - 110), 600);
    const sigDataUrl = input.authorizedSignatureUrl?.trim();
    if (sigDataUrl?.startsWith("data:image/")) {
      try {
        const match = sigDataUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
        if (match?.[1]) {
          const sigBuf = Buffer.from(match[1], "base64");
          doc.image(sigBuf, left, sigY, { width: 120, height: 40, fit: [120, 40] });
        }
      } catch {
        /* blank line only */
      }
    }
    doc
      .moveTo(left, sigY + 44)
      .lineTo(left + 160, sigY + 44)
      .lineWidth(0.8)
      .strokeColor("#94a3b8")
      .stroke();
    doc.font("Helvetica").fontSize(8).fillColor("#64748b");
    const signerName = input.authorizedSignerName?.trim() || "";
    const signerTitle = input.authorizedSignerTitle?.trim() || "Authorized signature";
    if (signerName) {
      doc.text(signerName, left, sigY + 48, { width: 180 });
      doc.text(signerTitle, left, sigY + 60, { width: 180 });
    } else {
      doc.text(signerTitle, left, sigY + 48, { width: 180 });
    }

    // —— Footer ——
    doc.rect(0, footerY - 16, pageW, 4).fillColor(brandSoft).fill();
    doc.image(qrBuf, left, footerY, { width: 72, height: 72 });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(brand);
    doc.text(t("verifyAuthenticity"), 132, footerY + 8, { width: 360 });
    doc.font("Helvetica").fontSize(8).fillColor("#64748b");
    doc.text(input.verifyUrl, 132, footerY + 22, {
      width: 360,
      link: input.verifyUrl,
    });
    doc
      .fillColor("#94a3b8")
      .text(t("fingerprint", { hash: input.payloadHash.slice(0, 16) }), 132, footerY + 48);

    doc.end();
  });
}
