import { renderReceiptPdf, type ReceiptPdfInput } from "./receiptPdf";
import { renderReceiptHtml } from "./receiptHtmlBuilder";
import { htmlToPdf } from "./receiptHtmlToPdf";
import {
  isHtmlReceiptTemplate,
  resolveReceiptTemplateId,
  type ReceiptTemplateId,
} from "./receiptTemplateRegistry";

export async function renderReceiptDocument(
  templateId: ReceiptTemplateId | string | null | undefined,
  input: ReceiptPdfInput
): Promise<Buffer> {
  const resolved = resolveReceiptTemplateId(templateId);
  if (!isHtmlReceiptTemplate(resolved)) {
    return renderReceiptPdf(input);
  }

  try {
    const html = await renderReceiptHtml(resolved, input);
    return await htmlToPdf(html);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[finance] HTML receipt render failed (${resolved}), falling back to PDFKit:`, message);
    return renderReceiptPdf(input);
  }
}

export async function renderReceiptPreviewHtml(
  templateId: ReceiptTemplateId | string | null | undefined,
  input: ReceiptPdfInput
): Promise<string> {
  const resolved = resolveReceiptTemplateId(templateId);
  if (!isHtmlReceiptTemplate(resolved)) {
    throw Object.assign(new Error("Preview is only available for HTML receipt templates"), {
      status: 400,
    });
  }
  return renderReceiptHtml(resolved, input);
}
