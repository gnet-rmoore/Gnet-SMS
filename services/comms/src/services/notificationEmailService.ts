import { getIdentityUser } from "../lib/identityClient";
import { sendTransactionalEmail } from "../lib/mailClient";

export type NotificationEmailInput = {
  schoolId: string;
  userId: string;
  eventKey: string;
  title: string;
  body: string;
  href?: string | null;
  /** When the caller already resolved the recipient, skip Identity lookup. */
  recipientEmail?: string | null;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function appBaseUrl(): string {
  const raw = process.env.APP_URL || "http://localhost:8080";
  return raw.split(",")[0].trim().replace(/\/$/, "");
}

export function buildNotificationEmail(input: Pick<NotificationEmailInput, "title" | "body" | "href">) {
  const link = input.href
    ? `${appBaseUrl()}/${String(input.href).replace(/^\//, "")}`
    : null;
  const text = link ? `${input.body}\n\nView in SMS: ${link}` : input.body;
  const html = `<p>${escapeHtml(input.body)}</p>${
    link ? `<p><a href="${escapeHtml(link)}">View in SMS</a></p>` : ""
  }`;
  return { subject: input.title, text, html, link };
}

export const notificationEmailService = {
  async sendForNotification(input: NotificationEmailInput): Promise<{ sent: boolean; reason?: string }> {
    const email =
      String(input.recipientEmail || "").trim() ||
      (await getIdentityUser(input.userId))?.email?.trim() ||
      "";
    if (!email) {
      return { sent: false, reason: "no_email" };
    }

    const { subject, text, html } = buildNotificationEmail(input);
    const result = await sendTransactionalEmail({ to: email, subject, text, html });
    if (!result.ok) {
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  },
};
