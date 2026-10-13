import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import Mustache from "mustache";
import {
  getReceiptTemplateDef,
  type ReceiptTemplateId,
} from "./receiptTemplateRegistry";
import { buildReceiptContext } from "./receiptContext";
import type { ReceiptPdfInput } from "./receiptPdf";

const htmlCache = new Map<ReceiptTemplateId, string>();

function templateDir(): string {
  const candidates = [
    path.join(typeof __dirname !== "undefined" ? __dirname : ".", "..", "receipt-templates"),
    path.join(process.cwd(), "services/finance/src/receipt-templates"),
    path.join(process.cwd(), "src/receipt-templates"),
    path.join(process.cwd(), "receipt-templates"),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, "classic-ledger.html"))) return dir;
  }
  return candidates[0];
}

export function getTemplateHtml(id: ReceiptTemplateId): string {
  if (!htmlCache.has(id)) {
    const def = getReceiptTemplateDef(id);
    if (!def.slug) {
      throw new Error(`Template ${id} has no HTML file`);
    }
    const filePath = path.join(templateDir(), `${def.slug}.html`);
    htmlCache.set(id, readFileSync(filePath, "utf-8"));
  }
  return htmlCache.get(id)!;
}

export async function renderReceiptHtml(
  templateId: ReceiptTemplateId,
  input: ReceiptPdfInput
): Promise<string> {
  const template = getTemplateHtml(templateId);
  const context = await buildReceiptContext(input);
  return Mustache.render(template, context);
}
