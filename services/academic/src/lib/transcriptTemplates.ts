/**
 * Official transcript print templates (server-rendered HTML for Puppeteer).
 *
 * Three variants ship with the product:
 *  - classic   : heritage parchment, serif, double rule, gold accents (Letter)
 *  - modern    : clean sans-serif, navy header band, information tiles (A4)
 *  - executive : dark frame, monogram crest, gold seal, formal registry look (Letter)
 *
 * Everything is inline CSS — no network fonts or assets — so PDFs are reproducible.
 */

export const TRANSCRIPT_TEMPLATE_KEYS = ["classic", "modern", "executive"] as const;
export type TranscriptTemplateKey = (typeof TRANSCRIPT_TEMPLATE_KEYS)[number];

export const DEFAULT_TRANSCRIPT_TEMPLATE: TranscriptTemplateKey = "classic";

export const TRANSCRIPT_TEMPLATES: Array<{
  key: TranscriptTemplateKey;
  name: string;
  description: string;
  pageSize: "A4" | "Legal";
}> = [
  {
    key: "classic",
    name: "Heritage Classic",
    description: "Traditional parchment with serif type, double rule and registrar seal.",
    pageSize: "A4",
  },
  {
    key: "modern",
    name: "Modern Minimal",
    description: "Contemporary layout with a navy header band and summary tiles.",
    pageSize: "A4",
  },
  {
    key: "executive",
    name: "Executive Registry",
    description: "Formal registry style with dark frame, monogram crest and gold seal.",
    pageSize: "A4",
  },
];

export function isTranscriptTemplateKey(value: unknown): value is TranscriptTemplateKey {
  return typeof value === "string" && (TRANSCRIPT_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function resolveTranscriptTemplateKey(value: unknown): TranscriptTemplateKey {
  return isTranscriptTemplateKey(value) ? value : DEFAULT_TRANSCRIPT_TEMPLATE;
}

export type TranscriptCourseRow = {
  subjectName: string;
  subjectCode?: string | null;
  term: string;
  score: number | null;
  letter: string;
  points: number;
  credits: number;
  remark?: string | null;
};

export type TranscriptSignatory = {
  name: string;
  title: string;
  signatureUrl?: string | null;
};

export type TranscriptPdfData = {
  transcriptId: string;
  verificationCode: string;
  studentName: string;
  studentEmail?: string | null;
  studentId: string;
  gradeLevel?: string | null;
  academicYear?: string | null;
  issuedAt: string;
  records: TranscriptCourseRow[];
  summary: {
    gpa: number;
    average: number;
    honors: string;
    credits: number;
    courseCount: number;
  };
  school: {
    name: string;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    logoUrl?: string | null;
    brandColor?: string | null;
  };
  registrar: TranscriptSignatory;
  approver: TranscriptSignatory;
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return "—";
  return `${Number(score).toFixed(1)}`;
}

function schoolLines(school: TranscriptPdfData["school"]): string {
  return [school.address, school.city, school.region, school.country]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map((part) => esc(part))
    .join(" &middot; ");
}

function contactLine(school: TranscriptPdfData["school"]): string {
  return [school.contactPhone, school.contactEmail]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map((part) => esc(part))
    .join(" &nbsp;|&nbsp; ");
}

function logoSafe(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function signatureBlock(sig: TranscriptSignatory, theme: "classic" | "modern" | "executive"): string {
  const img = logoSafe(sig.signatureUrl);
  const image = img
    ? `<img src="${esc(img)}" alt="" style="max-height:38px;max-width:180px;object-fit:contain;" />`
    : "&nbsp;";
  const labelColor =
    theme === "modern" ? "#0f172a" : theme === "executive" ? "#1e293b" : "#3f3a2f";
  return `
    <div style="text-align:center;min-width:190px;">
      <div style="height:42px;display:flex;align-items:flex-end;justify-content:center;">${image}</div>
      <div style="border-top:1px solid ${theme === "executive" ? "#c8a24a" : "#94a3b8"};margin-top:6px;padding-top:5px;">
        <div style="font-size:10.5px;font-weight:700;color:${labelColor};letter-spacing:.4px;">${esc(sig.name || "—")}</div>
        <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin-top:2px;">${esc(sig.title)}</div>
      </div>
    </div>`;
}

function gradingLegend(theme: "classic" | "modern" | "executive"): string {
  const rows: Array<[string, string, string, string]> = [
    ["A", "90 – 100", "Excellent", "4.00"],
    ["B", "80 – 89", "Very Good", "3.00"],
    ["C", "70 – 79", "Good", "2.00"],
    ["D", "60 – 69", "Pass", "1.00"],
    ["F", "0 – 59", "Fail", "0.00"],
  ];
  const border = theme === "executive" ? "#d8c48a" : theme === "modern" ? "#e2e8f0" : "#d6cfc0";
  const headBg = theme === "modern" ? "#f1f5f9" : theme === "executive" ? "#faf6ea" : "#f5f1e8";
  return `
    <table style="width:100%;border-collapse:collapse;font-size:8.5px;color:#475569;">
      <thead>
        <tr style="background:${headBg};">
          <th style="text-align:left;padding:4px 7px;border:1px solid ${border};">Grade</th>
          <th style="text-align:left;padding:4px 7px;border:1px solid ${border};">Range (%)</th>
          <th style="text-align:left;padding:4px 7px;border:1px solid ${border};">Remark</th>
          <th style="text-align:right;padding:4px 7px;border:1px solid ${border};">Points</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            ([g, range, remark, points]) => `
          <tr>
            <td style="padding:3.5px 7px;border:1px solid ${border};font-weight:700;">${g}</td>
            <td style="padding:3.5px 7px;border:1px solid ${border};">${range}</td>
            <td style="padding:3.5px 7px;border:1px solid ${border};">${remark}</td>
            <td style="padding:3.5px 7px;border:1px solid ${border};text-align:right;font-variant-numeric:tabular-nums;">${points}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function verificationBlock(data: TranscriptPdfData, theme: "classic" | "modern" | "executive"): string {
  const border = theme === "executive" ? "#c8a24a" : theme === "modern" ? "#cbd5e1" : "#c9bfa8";
  const bg = theme === "modern" ? "#f8fafc" : theme === "executive" ? "#fbf8ee" : "#faf7ef";
  return `
    <div style="border:1px solid ${border};background:${bg};border-radius:4px;padding:8px 11px;font-size:8.5px;color:#475569;line-height:1.5;">
      <div style="font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#334155;font-size:8px;margin-bottom:3px;">Document verification</div>
      <div><span style="color:#64748b;">Transcript no.</span> <strong style="color:#0f172a;font-family:ui-monospace,Consolas,monospace;">${esc(data.transcriptId.slice(0, 18).toUpperCase())}</strong></div>
      <div><span style="color:#64748b;">Verification code</span> <strong style="color:#0f172a;font-family:ui-monospace,Consolas,monospace;">${esc(data.verificationCode)}</strong></div>
      <div style="margin-top:3px;color:#64748b;">Authenticity can be confirmed by the Office of the Registrar.</div>
    </div>`;
}

/* -------------------------------------------------------------------------- */
/* Template 1 — Heritage Classic                                              */
/* -------------------------------------------------------------------------- */

function classicTemplate(data: TranscriptPdfData): string {
  const accent = data.school.brandColor || "#7c5c2b";
  const logo = logoSafe(data.school.logoUrl);
  const crest = logo
    ? `<img src="${esc(logo)}" alt="" style="width:64px;height:64px;object-fit:contain;" />`
    : `<div style="width:64px;height:64px;border:2px solid ${esc(accent)};border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:20px;font-weight:700;color:${esc(accent)};letter-spacing:1px;">${esc(initials(data.school.name))}</div>`;

  const rows = data.records
    .map(
      (row, index) => `
      <tr style="background:${index % 2 === 0 ? "#ffffff" : "#fbf8f1"};">
        <td style="padding:6px 10px;border-bottom:1px solid #e6ddca;font-weight:600;color:#2f2a20;">${esc(row.subjectName)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e6ddca;color:#6b6252;font-size:9.5px;text-align:center;">${esc(row.subjectCode || "—")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e6ddca;color:#6b6252;font-size:9.5px;">${esc(row.term)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e6ddca;text-align:center;font-variant-numeric:tabular-nums;">${fmtScore(row.score)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e6ddca;text-align:center;font-weight:700;color:${esc(accent)};">${esc(row.letter)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e6ddca;text-align:center;font-variant-numeric:tabular-nums;">${row.points.toFixed(2)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e6ddca;text-align:center;font-variant-numeric:tabular-nums;">${row.credits}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Official Academic Transcript — ${esc(data.studentName)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Georgia, "Times New Roman", serif; color: #2f2a20; background: #ffffff; }
  .page { position: relative; padding: 16px 20px; min-height: 100%; }
  .frame { border: 3px double ${esc(accent)}; padding: 22px 26px 18px; position: relative; }
  .inner { border: 1px solid #ddd3bd; padding: 18px 20px 14px; }
  .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .watermark span { font-size: 120px; font-weight: 700; color: ${esc(accent)}; opacity: .045; letter-spacing: 10px; transform: rotate(-18deg); }
  .header { text-align: center; }
  .school { font-size: 22px; font-weight: 700; letter-spacing: 2.6px; text-transform: uppercase; margin-top: 8px; color: #1f1b14; }
  .school-sub { font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase; color: #857a63; margin-top: 4px; }
  .doc-title { margin-top: 12px; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: ${esc(accent)}; font-weight: 700; }
  .doc-sub { font-size: 8.5px; letter-spacing: 2px; text-transform: uppercase; color: #8d836e; margin-top: 3px; }
  .rule { height: 2px; background: linear-gradient(90deg, transparent, ${esc(accent)}, transparent); margin: 12px 0 14px; opacity: .55; }
  .grid { display: flex; justify-content: space-between; gap: 22px; font-size: 10px; }
  .grid .col { width: 48%; }
  .label { font-size: 8px; letter-spacing: 1.4px; text-transform: uppercase; color: #94886f; }
  .value { font-size: 11px; font-weight: 700; color: #241f16; margin-top: 2px; }
  .meta-row { display: flex; gap: 8px; font-size: 9.5px; color: #5c5342; margin-top: 3px; }
  .meta-row .k { width: 96px; color: #94886f; }
  .section-title { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #7d7157; margin: 16px 0 7px; border-bottom: 1px solid #e3d9c3; padding-bottom: 4px; }
  table.courses { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.courses th { background: #f3eee1; color: #5f5541; font-size: 8px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 8px; border-top: 1px solid #d9cfb8; border-bottom: 1px solid #d9cfb8; text-align: left; }
  .summary { display: flex; gap: 10px; margin-top: 14px; }
  .summary .tile { flex: 1; border: 1px solid #ded4bf; background: #faf7ef; padding: 9px 11px; text-align: center; }
  .summary .tile .k { font-size: 7.5px; letter-spacing: 1.2px; text-transform: uppercase; color: #94886f; }
  .summary .tile .v { font-size: 17px; font-weight: 700; color: ${esc(accent)}; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .summary .tile .s { font-size: 8px; color: #6b6252; margin-top: 1px; }
  .lower { display: flex; gap: 18px; margin-top: 16px; }
  .lower .legend { width: 46%; }
  .lower .verify { width: 54%; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
  .signatures { display: flex; justify-content: space-between; gap: 24px; margin-top: 22px; padding-top: 6px; }
  .footer { margin-top: 12px; border-top: 1px solid #e3d9c3; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5px; color: #9a8f78; letter-spacing: .5px; }
</style>
</head>
<body>
  <div class="page">
    <div class="frame">
      <div class="watermark"><span>${esc(initials(data.school.name))}</span></div>
      <div class="inner">
        <div class="header">
          <div style="display:flex;justify-content:center;">${crest}</div>
          <div class="school">${esc(data.school.name)}</div>
          <div class="school-sub">${schoolLines(data.school) || "Office of the Registrar"}</div>
          <div class="school-sub">${contactLine(data.school)}</div>
          <div class="doc-title">Official Academic Transcript</div>
          <div class="doc-sub">Record of Scholastic Achievement</div>
        </div>
        <div class="rule"></div>

        <div class="grid">
          <div class="col">
            <div class="label">Student</div>
            <div class="value">${esc(data.studentName)}</div>
            <div class="meta-row"><span class="k">Student ID</span><span>${esc(data.studentId.slice(0, 18).toUpperCase())}</span></div>
            <div class="meta-row"><span class="k">Email</span><span>${esc(data.studentEmail || "—")}</span></div>
          </div>
          <div class="col" style="text-align:right;">
            <div class="label">Academic Record</div>
            <div class="value">${esc(data.gradeLevel || "—")}</div>
            <div class="meta-row" style="justify-content:flex-end;"><span class="k" style="width:auto;margin-right:8px;">Academic year</span><span>${esc(data.academicYear || "—")}</span></div>
            <div class="meta-row" style="justify-content:flex-end;"><span class="k" style="width:auto;margin-right:8px;">Issued</span><span>${fmtDate(data.issuedAt)}</span></div>
          </div>
        </div>

        <div class="section-title">Scholastic Record</div>
        <table class="courses">
          <thead>
            <tr>
              <th style="width:31%;">Subject</th>
              <th style="width:10%;text-align:center;">Code</th>
              <th style="width:24%;">Term / Examination</th>
              <th style="width:9%;text-align:center;">Score</th>
              <th style="width:8%;text-align:center;">Grade</th>
              <th style="width:10%;text-align:center;">Points</th>
              <th style="width:8%;text-align:center;">Credits</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="7" style="padding:22px;text-align:center;color:#94886f;font-style:italic;">No verified course records on file.</td></tr>`}
          </tbody>
        </table>

        <div class="summary">
          <div class="tile"><div class="k">Cumulative GPA</div><div class="v">${data.summary.gpa.toFixed(2)}</div><div class="s">out of 4.00</div></div>
          <div class="tile"><div class="k">Average</div><div class="v">${data.summary.average.toFixed(1)}%</div><div class="s">all courses</div></div>
          <div class="tile"><div class="k">Credits Earned</div><div class="v">${data.summary.credits}</div><div class="s">${data.summary.courseCount} course(s)</div></div>
          <div class="tile"><div class="k">Academic Standing</div><div class="v" style="font-size:11px;line-height:1.4;margin-top:5px;">${esc(data.summary.honors)}</div><div class="s">institutional honours</div></div>
        </div>

        <div class="lower">
          <div class="legend">
            <div class="section-title" style="margin-top:0;">Grading Scale</div>
            ${gradingLegend("classic")}
          </div>
          <div class="verify">
            ${verificationBlock(data, "classic")}
          </div>
        </div>

        <div class="signatures">
          ${signatureBlock(data.registrar, "classic")}
          ${signatureBlock(data.approver, "classic")}
        </div>

        <div class="footer">
          <span>Issued by the Office of the Registrar &middot; ${esc(data.school.name)}</span>
          <span>This document is invalid if altered or reproduced without authorisation.</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/* Template 2 — Modern Minimal                                                */
/* -------------------------------------------------------------------------- */

function modernTemplate(data: TranscriptPdfData): string {
  const accent = data.school.brandColor || "#1d4ed8";
  const logo = logoSafe(data.school.logoUrl);
  const crest = logo
    ? `<img src="${esc(logo)}" alt="" style="width:44px;height:44px;object-fit:contain;background:#fff;border-radius:8px;padding:3px;" />`
    : `<div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;">${esc(initials(data.school.name))}</div>`;

  const rows = data.records
    .map(
      (row, index) => `
      <tr style="background:${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="padding:6.5px 10px;border-bottom:1px solid #e8edf3;font-weight:600;color:#0f172a;">${esc(row.subjectName)}</td>
        <td style="padding:6.5px 8px;border-bottom:1px solid #e8edf3;color:#64748b;text-align:center;font-size:9px;letter-spacing:.4px;">${esc(row.subjectCode || "—")}</td>
        <td style="padding:6.5px 8px;border-bottom:1px solid #e8edf3;color:#64748b;font-size:9.5px;">${esc(row.term)}</td>
        <td style="padding:6.5px 8px;border-bottom:1px solid #e8edf3;text-align:center;font-variant-numeric:tabular-nums;font-weight:600;">${fmtScore(row.score)}</td>
        <td style="padding:6.5px 8px;border-bottom:1px solid #e8edf3;text-align:center;">
          <span style="display:inline-block;min-width:22px;padding:1.5px 5px;border-radius:4px;background:${esc(accent)}14;color:${esc(accent)};font-weight:700;font-size:9.5px;">${esc(row.letter)}</span>
        </td>
        <td style="padding:6.5px 8px;border-bottom:1px solid #e8edf3;text-align:center;font-variant-numeric:tabular-nums;color:#475569;">${row.points.toFixed(2)}</td>
        <td style="padding:6.5px 8px;border-bottom:1px solid #e8edf3;text-align:center;font-variant-numeric:tabular-nums;color:#475569;">${row.credits}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Academic Transcript — ${esc(data.studentName)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Arial, Helvetica, sans-serif; color: #0f172a; background: #ffffff; }
  .page { padding: 0 0 14px; }
  .band { background: ${esc(accent)}; color: #ffffff; padding: 20px 24px 18px; display: flex; align-items: center; gap: 14px; }
  .band .title { flex: 1; }
  .band .eyebrow { font-size: 8px; letter-spacing: 2.4px; text-transform: uppercase; opacity: .75; }
  .band .school { font-size: 19px; font-weight: 700; letter-spacing: .4px; margin-top: 2px; }
  .band .addr { font-size: 8.5px; opacity: .8; margin-top: 3px; }
  .band .doc { text-align: right; }
  .band .doc .big { font-size: 13px; font-weight: 700; letter-spacing: 2.2px; text-transform: uppercase; }
  .band .doc .small { font-size: 8px; letter-spacing: 1.4px; text-transform: uppercase; opacity: .78; margin-top: 2px; }
  .body { padding: 16px 24px 0; }
  .info { display: flex; gap: 10px; }
  .info .cell { flex: 1; border: 1px solid #e2e8f0; border-radius: 7px; padding: 8px 11px; }
  .info .cell .k { font-size: 7.5px; letter-spacing: 1.2px; text-transform: uppercase; color: #94a3b8; }
  .info .cell .v { font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .info .cell .s { font-size: 8.5px; color: #64748b; margin-top: 1px; }
  .strip { display: flex; gap: 8px; margin-top: 12px; }
  .strip .tile { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 8px 10px; }
  .strip .tile .k { font-size: 7.5px; letter-spacing: 1.1px; text-transform: uppercase; color: #94a3b8; }
  .strip .tile .v { font-size: 16px; font-weight: 700; color: ${esc(accent)}; margin-top: 1px; font-variant-numeric: tabular-nums; }
  .strip .tile .s { font-size: 8px; color: #64748b; }
  .section-title { display: flex; align-items: center; gap: 8px; margin: 16px 0 7px; font-size: 8.5px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: #475569; }
  .section-title:after { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
  table.courses { width: 100%; border-collapse: collapse; font-size: 9.5px; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; }
  table.courses th { background: #f1f5f9; color: #475569; font-size: 7.5px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  .lower { display: flex; gap: 14px; margin-top: 14px; }
  .lower .legend { width: 48%; }
  .lower .verify { width: 52%; }
  .signatures { display: flex; justify-content: flex-end; gap: 34px; margin-top: 18px; padding-top: 4px; }
  .footer { margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="page">
    <div class="band">
      ${crest}
      <div class="title">
        <div class="eyebrow">Office of the Registrar</div>
        <div class="school">${esc(data.school.name)}</div>
        <div class="addr">${schoolLines(data.school) || "Official student records"}</div>
        <div class="addr">${contactLine(data.school)}</div>
      </div>
      <div class="doc">
        <div class="big">Academic Transcript</div>
        <div class="small">Official record &middot; ${fmtDate(data.issuedAt)}</div>
      </div>
    </div>

    <div class="body">
      <div class="info">
        <div class="cell">
          <div class="k">Student</div>
          <div class="v">${esc(data.studentName)}</div>
          <div class="s">${esc(data.studentEmail || "—")}</div>
        </div>
        <div class="cell">
          <div class="k">Student ID</div>
          <div class="v" style="font-family:ui-monospace,Consolas,monospace;font-size:10px;">${esc(data.studentId.slice(0, 18).toUpperCase())}</div>
          <div class="s">${esc(data.gradeLevel || "Grade level not set")}</div>
        </div>
        <div class="cell">
          <div class="k">Academic Year</div>
          <div class="v">${esc(data.academicYear || "—")}</div>
          <div class="s">Issued ${fmtDate(data.issuedAt)}</div>
        </div>
        <div class="cell">
          <div class="k">Standing</div>
          <div class="v" style="font-size:10px;">${esc(data.summary.honors)}</div>
          <div class="s">${data.summary.courseCount} recorded course(s)</div>
        </div>
      </div>

      <div class="strip">
        <div class="tile"><div class="k">Cumulative GPA</div><div class="v">${data.summary.gpa.toFixed(2)}</div><div class="s">of 4.00</div></div>
        <div class="tile"><div class="k">Average</div><div class="v">${data.summary.average.toFixed(1)}%</div><div class="s">weighted mean</div></div>
        <div class="tile"><div class="k">Credits</div><div class="v">${data.summary.credits}</div><div class="s">earned</div></div>
      </div>

      <div class="section-title">Course Record</div>
      <table class="courses">
        <thead>
          <tr>
            <th style="width:31%;">Subject</th>
            <th style="width:10%;text-align:center;">Code</th>
            <th style="width:24%;">Term / Examination</th>
            <th style="width:9%;text-align:center;">Score</th>
            <th style="width:8%;text-align:center;">Grade</th>
            <th style="width:10%;text-align:center;">Points</th>
            <th style="width:8%;text-align:center;">Credits</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="7" style="padding:20px;text-align:center;color:#94a3b8;">No verified course records on file.</td></tr>`}
        </tbody>
      </table>

      <div class="lower">
        <div class="legend">
          <div class="section-title" style="margin-top:0;">Grading Scale</div>
          ${gradingLegend("modern")}
        </div>
        <div class="verify">
          <div class="section-title" style="margin-top:0;">Verification</div>
          ${verificationBlock(data, "modern")}
        </div>
      </div>

      <div class="signatures">
        ${signatureBlock(data.registrar, "modern")}
        ${signatureBlock(data.approver, "modern")}
      </div>

      <div class="footer">
        <span>${esc(data.school.name)} &middot; Office of the Registrar</span>
        <span>Transcript ${esc(data.transcriptId.slice(0, 8).toUpperCase())} &middot; Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/* Template 3 — Executive Registry                                            */
/* -------------------------------------------------------------------------- */

function executiveTemplate(data: TranscriptPdfData): string {
  const navy = "#0f1b2d";
  const gold = "#c8a24a";
  const logo = logoSafe(data.school.logoUrl);
  const crest = logo
    ? `<img src="${esc(logo)}" alt="" style="width:58px;height:58px;object-fit:contain;" />`
    : `<div style="width:58px;height:58px;border:1.5px solid ${gold};display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:17px;letter-spacing:1px;color:${gold};">${esc(initials(data.school.name))}</div>`;

  const rows = data.records
    .map(
      (row) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e7dfcb;font-weight:600;color:#1a2433;">${esc(row.subjectName)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e7dfcb;color:#6c7787;font-size:9px;text-align:center;">${esc(row.subjectCode || "—")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e7dfcb;color:#6c7787;font-size:9.5px;">${esc(row.term)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e7dfcb;text-align:center;font-variant-numeric:tabular-nums;">${fmtScore(row.score)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e7dfcb;text-align:center;font-weight:700;color:${navy};">${esc(row.letter)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e7dfcb;text-align:center;font-variant-numeric:tabular-nums;color:#475569;">${row.points.toFixed(2)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e7dfcb;text-align:center;font-variant-numeric:tabular-nums;color:#475569;">${row.credits}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Registry Transcript — ${esc(data.studentName)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Arial, Helvetica, sans-serif; color: #1a2433; background: #ffffff; }
  .page { padding: 14px 18px 12px; }
  .frame { border: 2px solid ${navy}; padding: 5px; position: relative; }
  .frame-inner { border: 1px solid ${gold}; padding: 18px 22px 15px; position: relative; overflow: hidden; }
  .watermark { position: absolute; right: -20px; bottom: 40px; font-family: Georgia, serif; font-size: 150px; color: ${navy}; opacity: .035; font-weight: 700; letter-spacing: 8px; transform: rotate(-12deg); pointer-events: none; }
  .topline { display: flex; align-items: center; gap: 14px; }
  .topline .center { flex: 1; text-align: center; }
  .school { font-family: Georgia, "Times New Roman", serif; font-size: 21px; letter-spacing: 2.4px; text-transform: uppercase; color: ${navy}; }
  .school-sub { font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase; color: #7a8494; margin-top: 3px; }
  .seal { width: 58px; height: 58px; border-radius: 50%; border: 1.5px solid ${gold}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: ${gold}; }
  .seal .l1 { font-size: 6px; letter-spacing: 1px; text-transform: uppercase; }
  .seal .l2 { font-family: Georgia, serif; font-size: 13px; font-weight: 700; line-height: 1; margin: 2px 0; }
  .doc-title { margin-top: 14px; text-align: center; padding: 7px 0; border-top: 1px solid ${gold}; border-bottom: 1px solid ${gold}; }
  .doc-title .t { font-family: Georgia, serif; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: ${navy}; }
  .doc-title .s { font-size: 7.5px; letter-spacing: 2px; text-transform: uppercase; color: #8a93a2; margin-top: 2px; }
  .band { display: flex; gap: 0; margin-top: 13px; border: 1px solid #e2d9c3; }
  .band .cell { flex: 1; padding: 8px 11px; border-right: 1px solid #e2d9c3; }
  .band .cell:last-child { border-right: 0; }
  .band .k { font-size: 7px; letter-spacing: 1.3px; text-transform: uppercase; color: #9aa2ae; }
  .band .v { font-size: 10.5px; font-weight: 700; color: #14202f; margin-top: 2px; }
  .band .s { font-size: 8px; color: #77808f; }
  .section-title { font-family: Georgia, serif; font-size: 9px; letter-spacing: 2.2px; text-transform: uppercase; color: ${navy}; margin: 15px 0 6px; display: flex; align-items: center; gap: 8px; }
  .section-title:after { content: ""; flex: 1; height: 1px; background: ${gold}; opacity: .6; }
  table.courses { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  table.courses th { background: ${navy}; color: #f4ecd9; font-size: 7px; letter-spacing: 1.1px; text-transform: uppercase; padding: 6px 8px; text-align: left; }
  .honors { margin-top: 12px; background: ${navy}; color: #f4ecd9; padding: 9px 14px; display: flex; align-items: center; justify-content: space-between; }
  .honors .k { font-size: 7.5px; letter-spacing: 1.6px; text-transform: uppercase; color: ${gold}; }
  .honors .v { font-family: Georgia, serif; font-size: 15px; letter-spacing: 1px; margin-top: 1px; }
  .honors .metrics { display: flex; gap: 26px; text-align: right; }
  .honors .metrics .m .k { color: #b9c2cf; }
  .honors .metrics .m .v { font-size: 12px; }
  .lower { display: flex; gap: 16px; margin-top: 13px; }
  .lower .legend { width: 47%; }
  .lower .verify { width: 53%; }
  .signatures { display: flex; justify-content: space-between; gap: 26px; margin-top: 18px; }
  .footer { margin-top: 12px; border-top: 1px solid #e2d9c3; padding-top: 5px; display: flex; justify-content: space-between; font-size: 7px; color: #9aa2ae; letter-spacing: .6px; }
</style>
</head>
<body>
  <div class="page">
    <div class="frame">
      <div class="frame-inner">
        <div class="watermark">${esc(initials(data.school.name))}</div>

        <div class="topline">
          ${crest}
          <div class="center">
            <div class="school">${esc(data.school.name)}</div>
            <div class="school-sub">${schoolLines(data.school) || "Office of the Registrar"}</div>
            <div class="school-sub">${contactLine(data.school)}</div>
          </div>
          <div class="seal">
            <div class="l1">Official</div>
            <div class="l2">${esc(data.summary.gpa.toFixed(2))}</div>
            <div class="l1">GPA</div>
          </div>
        </div>

        <div class="doc-title">
          <div class="t">Registry Academic Transcript</div>
          <div class="s">Official record of achievement &middot; issued ${fmtDate(data.issuedAt)}</div>
        </div>

        <div class="band">
          <div class="cell">
            <div class="k">Student</div>
            <div class="v">${esc(data.studentName)}</div>
            <div class="s">${esc(data.studentEmail || "—")}</div>
          </div>
          <div class="cell">
            <div class="k">Student ID</div>
            <div class="v" style="font-family:ui-monospace,Consolas,monospace;font-size:9.5px;">${esc(data.studentId.slice(0, 18).toUpperCase())}</div>
            <div class="s">${esc(data.gradeLevel || "—")}</div>
          </div>
          <div class="cell">
            <div class="k">Academic Year</div>
            <div class="v">${esc(data.academicYear || "—")}</div>
            <div class="s">${data.summary.courseCount} course(s) recorded</div>
          </div>
          <div class="cell">
            <div class="k">Transcript No.</div>
            <div class="v" style="font-family:ui-monospace,Consolas,monospace;font-size:9.5px;">${esc(data.transcriptId.slice(0, 14).toUpperCase())}</div>
            <div class="s">Verification ${esc(data.verificationCode)}</div>
          </div>
        </div>

        <div class="section-title">Academic Record</div>
        <table class="courses">
          <thead>
            <tr>
              <th style="width:31%;">Subject</th>
              <th style="width:10%;text-align:center;">Code</th>
              <th style="width:24%;">Term / Examination</th>
              <th style="width:9%;text-align:center;">Score</th>
              <th style="width:8%;text-align:center;">Grade</th>
              <th style="width:10%;text-align:center;">Points</th>
              <th style="width:8%;text-align:center;">Credits</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="7" style="padding:20px;text-align:center;color:#9aa2ae;font-style:italic;">No verified course records on file.</td></tr>`}
          </tbody>
        </table>

        <div class="honors">
          <div>
            <div class="k">Academic Standing</div>
            <div class="v">${esc(data.summary.honors)}</div>
          </div>
          <div class="metrics">
            <div class="m"><div class="k">GPA</div><div class="v">${data.summary.gpa.toFixed(2)} / 4.00</div></div>
            <div class="m"><div class="k">Average</div><div class="v">${data.summary.average.toFixed(1)}%</div></div>
            <div class="m"><div class="k">Credits</div><div class="v">${data.summary.credits}</div></div>
          </div>
        </div>

        <div class="lower">
          <div class="legend">
            <div class="section-title" style="margin-top:0;">Grading Scale</div>
            ${gradingLegend("executive")}
          </div>
          <div class="verify">
            <div class="section-title" style="margin-top:0;">Authentication</div>
            ${verificationBlock(data, "executive")}
          </div>
        </div>

        <div class="signatures">
          ${signatureBlock(data.registrar, "executive")}
          ${signatureBlock(data.approver, "executive")}
        </div>

        <div class="footer">
          <span>Office of the Registrar &middot; ${esc(data.school.name)}</span>
          <span>Unauthorised alteration voids this transcript &middot; Page 1 of 1</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildTranscriptHTML(templateKey: string, data: TranscriptPdfData): string {
  switch (resolveTranscriptTemplateKey(templateKey)) {
    case "modern":
      return modernTemplate(data);
    case "executive":
      return executiveTemplate(data);
    case "classic":
    default:
      return classicTemplate(data);
  }
}
