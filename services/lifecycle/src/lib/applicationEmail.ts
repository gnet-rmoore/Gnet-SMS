/**
 * "Application received" confirmation email sent to applicants on public
 * submission. Best-effort / fire-and-forget: never throws.
 */
import { renderTransactionalEmail, sendTransactionalEmail } from "./mailClient";

export function appBaseUrl(): string {
  const raw = process.env.APP_URL || "http://localhost:8080";
  return raw.split(",")[0].trim().replace(/\/$/, "");
}

export function buildApplyStatusUrl(slug: string, id: string, token: string): string {
  return `${appBaseUrl()}/apply/${slug}/status?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#0f172a">${lines
    .map((l) => `<p style="margin:4px 0">${escapeHtml(l)}</p>`)
    .join("")}</div>`;
}

export async function sendApplicationReceivedEmail(opts: {
  schoolName: string;
  slug: string;
  locale?: string | null;
  application: {
    id: string;
    applicationNumber: string | null;
    statusToken?: string;
    studentName: string;
    studentEmail?: string | null;
    parentEmail?: string | null;
    gradeLevelName?: string | null;
  };
}): Promise<void> {
  try {
    const { application, schoolName, slug, locale } = opts;
    const recipient = String(application.studentEmail || application.parentEmail || "").trim();
    if (!recipient || !application.statusToken) return;

    const statusUrl = buildApplyStatusUrl(slug, application.id, application.statusToken);
    const rendered = await renderTransactionalEmail("applicationReceived", locale || "en", {
      schoolName,
      applicationNumber: application.applicationNumber || application.id.slice(0, 8),
      statusToken: application.statusToken,
      statusUrl,
      studentName: application.studentName,
      gradeLevelName: application.gradeLevelName || "—",
    });
    if (!rendered) return;

    await sendTransactionalEmail({
      to: recipient,
      subject: rendered.subject,
      text: rendered.text,
      html: textToHtml(rendered.text),
    });
  } catch (err: any) {
    console.warn("[lifecycle] application-received email failed:", err?.message || err);
  }
}