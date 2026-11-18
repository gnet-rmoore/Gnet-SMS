import {
  IPREP_PROGRESS_MODERN,
  IPREP_SEMESTER_BOOKLET,
  iprepProgressVariant,
  resolveReportCardTemplateKey,
} from "./registry";
import type { ReportCardColumn, ReportCardPayload } from "./types";

const FAIL_THRESHOLD = 70;

const CONDUCT_ROWS = [
  "Is a good listener",
  "Is kind and helpful",
  "Shares with others",
  "Shows respect to others",
  "Expresses ideas clearly verbally",
  "Expresses ideas in drawing",
];
const ATTENDANCE_ROWS = ["Unexcused Absence", "Day(s) Late"];
const ATTITUDE_ROWS = [
  "Tidy / properly dressed",
  "Obeys rules and regulations",
  "Shows appropriate manners",
  "Responsible",
  "Kindness / Sharing",
  "Tardiness",
];
const PROGRESS_ROWS = [
  "Demonstrates understanding and application at grade-level",
  "Engages in classroom activities",
  "Completes and turns in assignments: within expected timeframe",
  "Listens attentively and follows instructions clearly",
  "Demonstrates a positive attitude towards learning",
  "Shows enthusiasm for learning and willingness to engage",
  "Consistency, effort, and attitude towards learning",
  "Demonstrates good communication skills",
  "Behavior in classroom (disruptive)",
];
const CONDUCT_NOTE =
  "There's an urgent need for consultation with the homeroom &amp; Instructional if your child receives between 1 and 3 in the assessment of their conduct: (1 - Not Yet, 2 - Sometimes, 3 - Almost Always, 4 - Always)";

function esc(value: unknown): string {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function val(value: unknown): string {
  return value == null || value === "" ? "—" : esc(value);
}

function num(value: number | null | undefined, digits = 1): string {
  return value == null || Number.isNaN(value) ? "—" : Number(value).toFixed(digits);
}

function dataImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return /^data:image\//i.test(url) ? url : null;
}

function failClass(score: number | null | undefined): string {
  return score == null || Number.isNaN(score) || score >= FAIL_THRESHOLD ? "" : "fail";
}

function humanize(value: unknown): string {
  const text = String(value ?? "");
  return text ? text.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "";
}

function formatDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function assessmentValue(
  payload: ReportCardPayload,
  section: "conduct" | "attitude" | "progress",
  label: string
): string {
  return payload.assessments?.[section]?.[label] ?? "—";
}

function ratingWidth(value: string): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, (score / 4) * 100));
}

function logoHtml(payload: ReportCardPayload, size = 72): string {
  if (payload.school.logoUrl) {
    return `<img src="${esc(payload.school.logoUrl)}" alt="" style="width:${size}px;height:${size}px;object-fit:contain">`;
  }
  const initials = (payload.school.name || "S")
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border:1px solid #1F4E79;display:grid;place-items:center;font-weight:800;color:#1F4E79;background:#EAF1F8">${esc(initials)}</div>`;
}

function signatureHtml(payload: ReportCardPayload): string {
  const slots = [
    ["Vice Principal for Instruction", payload.officialSignatures?.academic || payload.officialSignatures?.principal],
    ["General Manager / Co-Founder", payload.officialSignatures?.vpa || payload.officialSignatures?.principal],
  ] as const;
  return `<div class="sigs">${slots.map(([label, slot]) => {
    const url = dataImageUrl(slot?.signatureUrl);
    return `
    <div class="sig">
      <div class="sig-line">${url ? `<img src="${esc(url)}" alt="">` : ""}</div>
      <div class="sig-name">${val(slot?.name)}</div>
      <div class="sig-role">${esc(label)}</div>
    </div>`;
  }).join("")}</div>`;
}

function subjectRowsHtml(payload: ReportCardPayload, columns: ReportCardColumn[]): string {
  if (!payload.subjects.length) {
    return `<tr><td class="empty" colspan="${columns.length + 2}" style="padding:24px">No released grades for this period yet.</td></tr>`;
  }
  return payload.subjects.map((subject) => `
    <tr>
      <td class="l">${esc(subject.name)}</td>
      ${columns.map((column) => {
        const cell = subject.cells[column.key];
        const score = cell?.score;
        const cls = cell?.incomplete ? "inc" : score == null ? "empty" : failClass(score);
        return `<td class="${cls}">${cell?.incomplete ? "INC" : num(score, 0)}</td>`;
      }).join("")}
      <td class="avg">${num(subject.average)}</td>
    </tr>`).join("");
}

function legendHtml(payload: ReportCardPayload): string {
  const hasInc = payload.legend.some((row) => String(row.letter || "").toUpperCase() === "INC");
  const incRow = hasInc ? "" : `<tr><td class="l">Incomplete</td><td>—</td><td>INC</td><td>0</td></tr>`;
  return `${payload.legend.map((row) => `
    <tr>
      <td class="l">${val(row.detail)}</td>
      <td>${esc(row.min)} – ${esc(row.max)}</td>
      <td>${val(row.letter)}</td>
      <td>${val(row.gpa)}</td>
    </tr>`).join("")}${incRow}`;
}

function promoHtml(payload: ReportCardPayload, modern: boolean): string {
  const promotion = payload.promotion;
  if (!promotion) return "";
  const deficient = `<div>(To attend Enrichment Classes) Deficient in ${val(promotion.deficientSubjects)}</div>`;
  if (modern) {
    return `<div class="promo"><b>Promotion<br><span style="font-size:6.6px;font-weight:400">Certificate</span></b><div>Promoted to Grade ${val(promotion.toGrade)}<br>Failed: required to repeat ${val(promotion.toGrade)} Grade.</div>${deficient}</div>`;
  }
  return `<div class="promo"><b>Promotion Certificate</b><div>Promoted to Grade ${val(promotion.toGrade)}</div><div>Failed: required to repeat ${val(promotion.toGrade)} Grade.</div>${deficient}</div>`;
}

function progressHtml(payload: ReportCardPayload, modern: boolean): string {
  const columns = payload.columns.length ? payload.columns : [
    { key: "T1", label: "Term 1" },
    { key: "T2", label: "Term 2" },
    { key: "T3", label: "Term 3 (Final)" },
  ];
  if (modern) {
    const rating = (section: "conduct" | "attitude" | "progress") => (label: string) => {
      const value = assessmentValue(payload, section, label);
      return `<div class="rating"><span>${esc(label)}</span><div class="track"><div style="width:${ratingWidth(value)}%"></div></div><b>${val(value)}</b></div>`;
    };
    const legendRows = payload.legend.map((row) => `<div><span class="dot"></span><b>${val(row.letter)}</b><span>${val(row.detail)}</span><span style="margin-left:auto">${esc(row.min)}–${esc(row.max)}</span></div>`).join("");
    const incLegend = payload.legend.some((row) => String(row.letter || "").toUpperCase() === "INC")
      ? ""
      : `<div><span class="dot" style="background:#C6BEDF"></span><b>INC</b><span>Incomplete</span><span style="margin-left:auto">—</span></div>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(payload.student.name)} — Academic Progress Report</title><style>
      @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#F3F0FA;color:#241640;font-family:'Segoe UI',Arial,sans-serif;font-size:9px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{width:210mm;height:297mm;padding:9mm 11mm 8mm;overflow:hidden}.header{display:flex;align-items:center;gap:12px;background:linear-gradient(120deg,#3B1E70,#6C4AB6);color:#fff;border-radius:10px;padding:9px 14px;margin-bottom:8px}
      .header .text{flex:1}.header .name{font-size:13.5px;font-weight:700}.header .tag{font-style:italic;font-size:8.6px;opacity:.9}.badge{background:#F2B705;color:#3B1E70;font-weight:700;font-size:8.6px;padding:4px 10px;border-radius:999px;text-transform:uppercase}
      .strip{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:8px}.chip{background:#fff;border:1px solid #E4DEF2;border-radius:8px;padding:5px 8px}.chip span{display:block;font-size:6.8px;color:#6B6480;text-transform:uppercase}.chip b{font-size:9.2px}
      .grid{display:grid;grid-template-columns:1.62fr 1fr;gap:8px}.card{background:#fff;border:1px solid #E4DEF2;border-radius:10px;padding:9px 10px;margin-bottom:8px}.card h3{margin:0 0 6px;font-size:10px;color:#3B1E70}
      table{width:100%;border-collapse:collapse;font-size:8px}th{text-align:left;font-size:7.2px;color:#6B6480;text-transform:uppercase;border-bottom:1.5px solid #E4DEF2;padding:3px 4px}td{padding:3px 4px;border-bottom:1px solid #E4DEF2}td.subj{font-weight:600}td.num,th.num{text-align:center}
      .legend{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 8px}.legend div{display:flex;gap:5px;align-items:center;border:1px solid #E4DEF2;border-radius:6px;padding:3px 5px;font-size:7.4px}.dot{width:9px;height:9px;border-radius:50%;background:#3B7FD4}
      .rating{display:grid;grid-template-columns:1fr 46px 22px;gap:6px;font-size:7.4px;padding:2.5px 0;border-bottom:1px dashed #E4DEF2}.track{height:6px;background:#EDEAF7;border-radius:5px}.track div{height:100%;width:0;background:#6C4AB6;border-radius:5px}
      .rank-row{font-size:7.8px;color:#6B6480;margin-top:5px}.mini-note{font-size:6.8px;color:#6B6480;line-height:1.35;margin-top:6px}
      .promo{background:linear-gradient(120deg,#3B1E70,#6C4AB6);color:#fff;border-radius:10px;padding:9px 12px;margin-bottom:8px;display:flex;gap:18px;font-size:8px}.promo b{display:block;font-size:9.5px;text-transform:uppercase}
      .sigs{display:grid;grid-template-columns:1fr 1fr;gap:24px}.sig{text-align:center;background:#fff;border:1px solid #E4DEF2;border-radius:10px;padding:6px 10px 8px}.sig-line{height:38px;border:1px dashed #C6BEDF;border-radius:6px;background:#FAF9FE;display:flex;align-items:flex-end;justify-content:center}.sig-line img{max-height:36px}.sig-name{font-weight:700;font-size:8.6px;border-top:1.5px solid #3B1E70;margin-top:2px;padding-top:3px}.sig-role{font-size:7.4px;color:#6B6480}
    </style></head><body><div class="page">
      <div class="header"><div style="width:46px;height:46px;border-radius:50%;background:#fff;border:2px solid #F2B705;display:flex;align-items:center;justify-content:center">${logoHtml(payload, 42)}</div><div class="text"><div class="name">${val(payload.school.name)}</div><div class="tag">"Education For The Future"</div></div><div class="badge">Academic Progress Report</div></div>
      <div class="strip">
        ${[["Name", payload.student.name], ["Gender", payload.student.sex], ["Grade", payload.student.gradeLevelLabel], ["Student ID", payload.student.id], ["Academic Year", payload.academicYear.label]].map(([label, itemValue]) => `<div class="chip"><span>${esc(label)}</span><b>${val(itemValue)}</b></div>`).join("")}
      </div>
      <div class="grid"><div>
        <div class="card"><h3>Subject Performance <span style="float:right">Overall Avg: ${num(payload.aggregates.overallAverage)}</span></h3>
          <table><thead><tr><th>Subject</th>${columns.map((column) => `<th class="num">${esc(column.key)}</th>`).join("")}<th class="num">Final Avg.</th></tr></thead><tbody>${subjectRowsHtml(payload, columns)}</tbody></table>
          <div class="rank-row">Class Rank: <b>${val(payload.aggregates.classPosition)}</b></div>
        </div>
        <div class="card"><h3>Grading System</h3><div class="legend">${legendRows}${incLegend}</div></div>
      </div><div>
        <div class="card"><h3>Conduct</h3>${CONDUCT_ROWS.map(rating("conduct")).join("")}${ATTENDANCE_ROWS.map(rating("conduct")).join("")}</div>
        <div class="card"><h3>Attitude &amp; Values</h3>${ATTITUDE_ROWS.map(rating("attitude")).join("")}</div>
        <div class="card"><h3>Academic Progress</h3>${PROGRESS_ROWS.map(rating("progress")).join("")}<div class="mini-note">${CONDUCT_NOTE}</div></div>
      </div></div>
      ${promoHtml(payload, true)}
      ${signatureHtml(payload)}
    </div></body></html>`;
  }

  const ratingTable = (title: string, rows: string[], section: "conduct" | "attitude" | "progress") => `<h3>${esc(title)}</h3><table><tbody>${rows.map((row) => `<tr><td>${esc(row)}</td><td class="num">${val(assessmentValue(payload, section, row))}</td></tr>`).join("")}</tbody></table>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(payload.student.name)} — Academic Progress Report</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{width:210mm;height:297mm;padding:6mm 7mm;overflow:hidden}.header{display:flex;align-items:flex-start;gap:8px;border-bottom:1.5px solid #000;padding-bottom:3px;margin-bottom:4px}.header .text{flex:1;text-align:center}.school{font-size:16px;font-weight:bold}.tag{font-style:italic;font-size:12px}.title{font-size:14.5px;font-weight:bold;margin-top:2px}
    .student{display:grid;grid-template-columns:1fr 1fr;gap:1px 14px;margin-bottom:4px}.columns{display:grid;grid-template-columns:3fr 1.4fr;gap:0 4mm}h3{font-size:12px;margin:4px 0 2px}
    table{width:100%;border-collapse:collapse;font-size:11.5px}th,td{border:1px solid #000;padding:1.8px 4px;vertical-align:middle}th{background:#fff;text-align:center}.l{text-align:left}.num{text-align:center}.fail{color:#b5232f;font-weight:700}.inc{color:#b26a00;font-weight:700}.empty{color:#94a3b8}.avg{background:#f3f5fa;font-weight:700}
    .promo{border:1px solid #000;padding:4px 8px;margin-top:5px}.note-box{border:1px solid #000;font-size:10px;line-height:1.3;padding:3px 5px;margin-top:3px}.sigs{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:8px;text-align:center}.sig-line{height:38px;border:1px dashed #999}.sig-name{font-weight:bold;font-size:11.5px}.sig-role{font-size:10.5px;color:#333}
  </style></head><body><div class="page">
    <div class="header">${logoHtml(payload)}<div class="text"><div class="school">${val(payload.school.name)}</div><div class="tag">"Education For The Future"</div><div class="title">ACADEMIC PROGRESS REPORT</div></div><div style="width:82px"></div></div>
    <div class="student">
      ${[["Name", payload.student.name], ["Gender", payload.student.sex], ["Grade", payload.student.gradeLevelLabel], ["Student ID", payload.student.id], ["Academic Year", payload.academicYear.label]].map(([label, itemValue]) => `<div><b>${esc(label)}:</b> ${val(itemValue)}</div>`).join("")}
    </div>
    <div class="columns"><div>
      <table><thead><tr><th class="l">Subjects</th>${columns.map((column) => `<th>${esc(column.label)}</th>`).join("")}<th>Final Avg.</th></tr></thead><tbody>${subjectRowsHtml(payload, columns)}</tbody>
      <tfoot><tr><td class="l"><b>Average</b></td>${columns.map(() => "<td></td>").join("")}<td><b>${num(payload.aggregates.overallAverage)}</b></td></tr><tr><td class="l"><b>Rank</b></td>${columns.map(() => "<td></td>").join("")}<td><b>${val(payload.aggregates.classPosition)}</b></td></tr></tfoot></table>
      <h3>Grading System</h3><table><thead><tr><th>Remarks</th><th>%</th><th>Letter</th><th>Points</th></tr></thead><tbody>${legendHtml(payload)}</tbody></table>
    </div><div>
      ${ratingTable("Conduct", [...CONDUCT_ROWS, ...ATTENDANCE_ROWS], "conduct")}
      ${ratingTable("Attitude & Values", ATTITUDE_ROWS, "attitude")}
      ${ratingTable("Academic progress", PROGRESS_ROWS, "progress")}
      <div class="note-box">${CONDUCT_NOTE}</div>
    </div></div>
    ${promoHtml(payload, false)}
    ${signatureHtml(payload)}
  </div></body></html>`;
}

function bookletHtml(payload: ReportCardPayload): string {
  const school = payload.school;
  const student = payload.student;
  const promotion = payload.promotion;
  const groups: Array<{ key: string; columns: ReportCardColumn[] }> = [];
  for (const column of payload.columns) {
    const key = /^(SEM\d)_/.exec(column.key)?.[1] || "ALL";
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, columns: [] };
      groups.push(group);
    }
    group.columns.push(column);
  }
  const semesterName = (key: string) => (key === "SEM1" ? "First semester" : key === "SEM2" ? "Second semester" : "Marks");
  const head = `<tr><th class="l" rowspan="2">Subject</th>${groups.map((group, index) => `<th colspan="${group.columns.length + (group.key === "ALL" ? 0 : 1)}" style="background:${index % 2 ? "#7a1a24" : "#223b86"}">${semesterName(group.key)}</th>`).join("")}<th rowspan="2">Yearly average</th><th rowspan="2">Grade</th></tr>
    <tr>${groups.map((group, index) => `${group.columns.map((column) => `<th style="background:${index % 2 ? "#7a1a24" : "#223b86"}">${esc(column.label)}</th>`).join("")}${group.key === "ALL" ? "" : `<th style="background:${index % 2 ? "#7a1a24" : "#223b86"}">Avg</th>`}`).join("")}</tr>`;
  const rows = payload.subjects.map((subject) => `<tr><td class="l">${esc(subject.name)}</td>${groups.map((group) => `${group.columns.map((column) => {
    const cell = subject.cells[column.key];
    const cls = cell?.incomplete ? "inc" : failClass(cell?.score);
    return `<td class="${cls}">${cell?.incomplete ? "INC" : num(cell?.score, 0)}</td>`;
  }).join("")}${group.key === "ALL" ? "" : `<td class="avg">${num(group.key === "SEM1" ? subject.sem1Avg : group.key === "SEM2" ? subject.sem2Avg : subject.average)}</td>`}`).join("")}<td class="yr">${num(subject.yearlyAvg ?? subject.average)}</td><td>${val(subject.letter)}</td></tr>`).join("");
  const bodyRows = payload.subjects.length
    ? rows
    : `<tr><td class="empty" colspan="${payload.columns.length + 5}" style="padding:12mm">No released grades for this period yet.</td></tr>`;
  const poBox = school.poBox
    ? /^p\.?\s*o\.?\s*box/i.test(school.poBox.trim())
      ? school.poBox.trim()
      : `P.O. Box ${school.poBox.trim()}`
    : null;
  const contact = [school.address, poBox, school.contactPhone, school.contactEmail]
    .filter(Boolean)
    .map((part) => esc(part))
    .join(" · ");
  const showMoe = school.branding ? school.branding !== "SCHOOL_LOGO" : school.country === "Liberia";
  const conditioned = promotion?.conditionedSubjects?.length
    ? `<div style="grid-column:span 2"><span>Conditioned subjects</span><b>${promotion.conditionedSubjects.map((item) => esc(typeof item === "string" ? item : item.name)).join(", ")}</b></div>`
    : "";
  const probation = promotion?.probationWeeks
    ? `<div><span>Probation</span><b>${esc(promotion.probationWeeks)} weeks</b></div>`
    : "";
  const promotionHtml = promotion
    ? `<h4>Promotion</h4><div class="pm">
        <div><span>Outcome</span><b>${val(promotion.outcome ? humanize(promotion.outcome) : null)}</b></div>
        <div><span>Promoted to</span><b>${val(promotion.toGrade)}</b></div>
        ${conditioned}${probation}
        <div style="grid-column:span 2"><span>Remarks</span><b style="font-weight:500">${val(promotion.remarks)}</b></div>
        <div><span>Finalised</span><b>${val(formatDate(promotion.finalizedAt))}</b></div>
      </div>`
    : "";
  const gradingLegend = payload.legend.some((row) => String(row.letter || "").toUpperCase() === "INC")
    ? payload.legend
    : [...payload.legend, { letter: "INC", min: 0, max: 0, detail: "Incomplete" }];
  const gradingScaleHtml = `<div class="grade-scale">
      <h4 style="margin-top:0">Grading system</h4>
      <table>
        <thead><tr><th>Grade</th>${gradingLegend.map((row) => `<th>${val(row.letter)}</th>`).join("")}</tr></thead>
        <tbody>
          <tr><th>Score range</th>${gradingLegend.map((row) => `<td>${String(row.letter || "").toUpperCase() === "INC" ? "—" : `${val(row.min)} – ${val(row.max)}`}</td>`).join("")}</tr>
          <tr><th>Meaning</th>${gradingLegend.map((row) => `<td>${val(row.detail)}</td>`).join("")}</tr>
        </tbody>
      </table>
    </div>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(student.name)} — Learner Progress Report</title><style>
    @page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;color:#14203d;font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{position:relative;width:210mm;height:297mm;background:#fff;overflow:hidden;break-after:page}.page:last-child{break-after:auto}.frame{position:absolute;inset:9mm;border:1.2mm double #1b2f6b;padding:11mm 12mm;display:flex;flex-direction:column}.page.grades .frame{inset:7mm;padding:9mm 8mm}.center{align-items:center;text-align:center}
    .gov{font-size:9pt;letter-spacing:2pt;text-transform:uppercase;color:#b5232f;font-weight:700}.gov span{display:block;color:#1b2f6b;font-size:8pt;letter-spacing:1.4pt}.logo{width:38mm;height:38mm;object-fit:contain;margin:14mm 0 6mm}.serif{font-family:Georgia,serif}.cv h1{margin:0;font-size:25pt;color:#1b2f6b}.cv h2{margin:16mm 0 2mm;font-size:21pt}.yr{display:inline-block;background:#1b2f6b;color:#fff;padding:1.6mm 7mm;border-radius:10mm;font-weight:700;letter-spacing:1pt}
    .card{margin-top:14mm;width:130mm;border:.4mm solid #1b2f6b;border-radius:2mm;text-align:left}.card div{display:flex;justify-content:space-between;padding:3mm 5mm;border-bottom:.2mm solid #cfd5e3}.card span{color:#5f6a82}.card b{font-size:11pt}.cover-promo{width:100%;margin-top:auto;text-align:left}.cover-promo h4{margin-top:0}.cover-promo + .ft{margin-top:4mm}.ft{margin-top:auto;font-size:8pt;color:#5f6a82}
    .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.6mm solid #1b2f6b;padding-bottom:3mm}.hd h3{margin:0;font-size:14pt;color:#1b2f6b}.hd small{color:#5f6a82}.hd .rt{text-align:right}.hd .rt b{font-size:12pt}
    table{width:100%;border-collapse:collapse;margin-top:5mm;font-size:8.6pt}.grades table{table-layout:fixed;font-size:7.8pt}.grades th,.grades td{padding:1.5mm .45mm;overflow-wrap:anywhere}.grades th.l,.grades td.l{padding-left:1.4mm}.grade-scale{margin-top:auto}.grade-scale table{font-size:7.2pt;margin-top:2mm;table-layout:fixed}.grade-scale th,.grade-scale td{padding:1.2mm .6mm;overflow-wrap:anywhere;text-align:center}th{background:#1b2f6b;color:#fff;padding:1.6mm .8mm;border:.2mm solid #fff}th.l,td.l{text-align:left;padding-left:2mm}td{padding:2.1mm .8mm;text-align:center;border:.2mm solid #cfd5e3}td.avg{background:#f3f5fa;font-weight:700}td.yr{background:#e8ecf7;font-weight:800}td.fail{color:#b5232f;font-weight:700}td.inc{color:#b26a00;font-weight:700}
    .kp{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-top:6mm}.kp div{border:.3mm solid #cfd5e3;border-top:1mm solid #1b2f6b;border-radius:1.5mm;padding:2.5mm 3mm}.kp span{display:block;font-size:7.4pt;color:#5f6a82;text-transform:uppercase}.kp b{font-size:14pt}
    h4{margin:6mm 0 2mm;font-size:11pt;color:#1b2f6b;border-bottom:.3mm solid #cfd5e3;padding-bottom:1mm}.pm{border:.4mm solid #1b2f6b;border-radius:2mm;padding:4mm 5mm;display:grid;grid-template-columns:1fr 1fr;gap:2.5mm 8mm}.pm span{display:block;font-size:7.4pt;color:#5f6a82;text-transform:uppercase}.pm b{font-size:10.5pt}
    .sigs{display:flex;gap:8mm;margin-top:6mm;padding-top:0}.sig{flex:1;text-align:center;font-size:8pt;color:#5f6a82}.sig .ln{height:13mm;border-bottom:.3mm solid #14203d;margin-bottom:1.2mm;display:flex;align-items:flex-end;justify-content:center}.sig img{max-height:12mm}.sig b{display:block;color:#14203d;font-size:9pt}.gen{text-align:center;font-size:7.5pt;color:#5f6a82;margin-top:4mm}
  </style></head><body>
    <section class="page"><div class="frame center">
      <div class="gov">${showMoe ? "Republic of Liberia<span>Ministry of Education</span>" : ""}</div>${school.logoUrl ? `<img class="logo" src="${esc(school.logoUrl)}" alt="">` : `<div class="logo" style="border:.6mm solid #1b2f6b;border-radius:50%;display:grid;place-items:center;font-size:34pt;font-weight:800;color:#1b2f6b">${esc((school.name || "SCHOOL").split(/\s+/).map((word) => word[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "S")}</div>`}
      <h1 class="serif">${val(school.name)}</h1><div style="font-size:9pt;color:#5f6a82">${contact}</div>
      <h2 class="serif">Learner Progress Report</h2><div class="yr">${val(payload.academicYear.label)}</div>
      <div class="card"><div><span>Learner</span><b>${val(student.name)}</b></div><div><span>Class</span><b>${val(student.classLabel)}</b></div><div><span>Grade level</span><b>${val(student.gradeLevelLabel)}</b></div><div><span>Learner ID</span><b>${val(student.id)}</b></div></div>
      ${promotion ? `<div class="cover-promo">${promotionHtml}</div>` : ""}
      <div class="ft">${val([school.district, school.county && `${school.county} County`, school.country].filter(Boolean).join(" · "))}</div>
    </div></section>
    <section class="page grades"><div class="frame">
      <div class="hd"><div><h3 class="serif">${val(student.name)}</h3><small>${val(student.classLabel)} · ${val(payload.academicYear.label)}</small></div><div class="rt"><b>${val(school.name)}</b><br><small>Academic record</small></div></div>
      <table><thead>${head}</thead><tbody>${bodyRows}</tbody></table>
      <div class="kp"><div><span>Overall average</span><b>${num(payload.aggregates.overallAverage)}</b></div><div><span>GPA</span><b>${num(payload.aggregates.gpa, 2)}</b></div><div><span>Class position</span><b>${val(payload.aggregates.classPosition)}</b></div><div><span>Attendance</span><b>${payload.aggregates.attendanceRate == null ? "—" : `${num(payload.aggregates.attendanceRate, 0)}%`}</b></div></div>
      <p style="margin-top:4mm;font-size:8pt;color:#5f6a82">Scores shown in <b style="color:#b5232f">red</b> fall in the failing band of the school's grading system. — means no released score.</p>
      ${gradingScaleHtml}
      <div class="sigs">${([
        { label: "Principal", slot: payload.officialSignatures?.principal },
        { label: "Registrar", slot: payload.officialSignatures?.registrar },
        { label: "Academic head", slot: payload.officialSignatures?.academic },
      ] as const).map(({ label, slot }) => {
        const url = dataImageUrl(slot?.signatureUrl);
        return `<div class="sig"><div class="ln">${url ? `<img src="${esc(url)}" alt="">` : ""}</div><b>${val(slot?.name)}</b><span>${esc(label)}</span></div>`;
      }).join("")}</div>
      <div class="gen">Generated ${val(formatDate(payload.generatedAt))}</div>
    </div></section>
  </body></html>`;
}

export function renderReportCardHtml(templateKeyOrLegacy: string | null | undefined, payload: ReportCardPayload): string {
  const templateKey = resolveReportCardTemplateKey(templateKeyOrLegacy || payload.templateKey);
  if (templateKey === IPREP_SEMESTER_BOOKLET) return bookletHtml(payload);
  if (templateKey === IPREP_PROGRESS_MODERN || iprepProgressVariant(templateKey) === "modern") {
    return progressHtml(payload, true);
  }
  return progressHtml(payload, false);
}
