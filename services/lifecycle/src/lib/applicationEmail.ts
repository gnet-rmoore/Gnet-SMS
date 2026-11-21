/**
 * "Application received" confirmation email sent to applicants on submission.
 * Best-effort / fire-and-forget: never throws.
 */
import { renderTransactionalEmail, sendTransactionalEmail } from "./mailClient";

export function appBaseUrl(): string {
  const raw = process.env.APP_URL || "http://localhost:8080";
  return raw.split(",")[0].trim().replace(/\/$/, "");
}

export function buildStatusUrl(slug: string): string {
  return `${appBaseUrl()}/apply/${encodeURIComponent(slug)}/status`;
}

export function buildEntranceUrl(slug: string, token: string): string {
  return `${appBaseUrl()}/entrance/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`;
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

export type ParentEmailRecipient = {
  email: string;
  role: "FATHER" | "MOTHER" | "GUARDIAN" | "STUDENT";
};

const ROLE_LABEL: Record<ParentEmailRecipient["role"], string> = {
  FATHER: "father",
  MOTHER: "mother",
  GUARDIAN: "guardian",
  STUDENT: "student",
};

const AVAILABILITY_LABEL: Record<string, string> = {
  en: "Entrance availability",
  fr: "Disponibilités pour l'entrée",
  ar: "مواعيد الاختبار المتاحة",
  es: "Disponibilidad de ingreso",
  de: "Verfügbare Aufnahmetermine",
  "zh-Hans": "入学测评可预约时间",
  hi: "प्रवेश समय उपलब्धता",
};

export function normalizeParentEmails(
  data: unknown,
  fallback?: string | null
): ParentEmailRecipient[] {
  const out: ParentEmailRecipient[] = [];
  const seen = new Set<string>();
  const push = (email: unknown, role: ParentEmailRecipient["role"]) => {
    const value = String(email || "").trim().toLowerCase();
    if (!value || !value.includes("@") || seen.has(`${role}:${value}`)) return;
    seen.add(`${role}:${value}`);
    out.push({ email: value, role });
  };
  if (Array.isArray(data)) {
    for (const entry of data as Array<{ email?: unknown; role?: unknown }>) {
      const rawRole = String(entry?.role || "").toUpperCase();
      const role: ParentEmailRecipient["role"] =
        rawRole === "FATHER" || rawRole === "MOTHER" || rawRole === "GUARDIAN"
          ? rawRole
          : "GUARDIAN";
      push(entry?.email, role);
    }
  }
  if (!out.length) push(fallback, "GUARDIAN");
  return out;
}

export async function sendApplicationReceivedEmail(opts: {
  schoolName: string;
  slug: string;
  locale?: string | null;
  application: {
    id: string;
    applicationNumber: string | null;
    studentName: string;
    studentEmail?: string | null;
    parentEmail?: string | null;
    gradeLevelName?: string | null;
    entranceToken?: string | null;
    entranceEnabled?: boolean;
    entranceDeadline?: string | null;
    entranceAvailabilityNote?: string | null;
    parentEmails?: ParentEmailRecipient[];
  };
}): Promise<void> {
  try {
    const { application, schoolName, slug, locale } = opts;
    const recipients = normalizeParentEmails(application.parentEmails, application.parentEmail);
    if (!recipients.length && application.studentEmail) {
      recipients.push({ email: application.studentEmail.trim().toLowerCase(), role: "STUDENT" });
    }
    if (!recipients.length) return;

    const referenceNumber = application.applicationNumber || application.id.slice(0, 8);
    const statusUrl = buildStatusUrl(slug);
    const entranceUrl =
      application.entranceEnabled && application.entranceToken
        ? buildEntranceUrl(slug, application.entranceToken)
        : "";
    const availabilityNote = String(application.entranceAvailabilityNote || "").trim();
    const lang = locale || "en";
    const availabilityLine = availabilityNote
      ? `\n\n${AVAILABILITY_LABEL[lang] || AVAILABILITY_LABEL.en}: ${availabilityNote}`
      : "";

    await Promise.all(
      recipients.map(async (recipient) => {
        const rendered = await renderTransactionalEmail(
          "applicationReceived",
          locale || "en",
          {
            schoolName,
            studentName: application.studentName,
            gradeLevelName: application.gradeLevelName || "—",
            referenceNumber,
            statusUrl,
            entranceUrl,
            entranceDeadline: application.entranceDeadline || "",
            parentRole: ROLE_LABEL[recipient.role],
            parentEmail: recipient.email,
          }
        );
        if (!rendered) return;
        const text = `${rendered.text}${availabilityLine}`;
        await sendTransactionalEmail({
          to: recipient.email,
          subject: rendered.subject,
          text,
          html: textToHtml(text),
        });
      })
    );
  } catch (err: any) {
    console.warn("[lifecycle] application-received email failed:", err?.message || err);
  }
}

export async function sendEntranceScheduledEmail(opts: {
  slug: string;
  locale?: string | null;
  recipients: ParentEmailRecipient[];
  application: {
    applicationNumber: string | null;
    studentName: string;
    schoolName: string;
    dateTime: string;
    location: string;
  };
}): Promise<void> {
  try {
    const statusUrl = buildStatusUrl(opts.slug);
    const rendered = await renderTransactionalEmail("entranceScheduled", opts.locale || "en", {
      schoolName: opts.application.schoolName,
      studentName: opts.application.studentName,
      referenceNumber: opts.application.applicationNumber || "",
      dateTime: opts.application.dateTime,
      location: opts.application.location,
      statusUrl,
    });
    if (!rendered) return;
    await Promise.all(
      opts.recipients.map((recipient) =>
        sendTransactionalEmail({
          to: recipient.email,
          subject: rendered.subject,
          text: rendered.text,
          html: textToHtml(rendered.text),
        })
      )
    );
  } catch (err: any) {
    console.warn("[lifecycle] entrance-scheduled email failed:", err?.message || err);
  }
}
