import React from "react";
import { format } from "date-fns";
import { RichContent } from "../online-exam/RichContent";

export type PaperQuestion = {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";
  prompt: string;
  points: number;
  orderIndex?: number;
  choices?: Array<{ id?: string; label: string; text: string }>;
};

export type ExamPaperDocumentSchool = {
  name?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  brandColor?: string | null;
};

export type ExamPaperDocumentExam = {
  id: string;
  title?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  duration?: number | null;
  instructions?: string | null;
  deliveryMode?: string | null;
};

export type ExamPaperDocumentPackage = {
  status?: string | null;
  deliveryMode?: string | null;
  revision?: number | null;
};

const NAVY = "#0b1f3b";
const NAVY_SOFT = "#102a4c";
const BORDER = "#d7deea";
const BORDER_STRONG = "#94a3b8";
const TEXT = "#0f172a";
const MUTED = "#475569";

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMMM d, yyyy");
  } catch {
    return "—";
  }
}

function formatDuration(minutes?: number | null) {
  if (minutes == null || Number.isNaN(Number(minutes))) return "—";
  const m = Math.max(0, Math.round(Number(minutes)));
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (!rem) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${h} hr ${rem} min`;
}

function totalPoints(questions: PaperQuestion[]) {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}

function questionTypeLabel(type: PaperQuestion["type"]) {
  if (type === "MULTIPLE_CHOICE") return "Multiple Choice";
  if (type === "TRUE_FALSE") return "True / False";
  if (type === "FILL_BLANK") return "Fill in the Blank";
  return "Essay";
}

function fillBlankLines(points: number) {
  return Math.max(1, Math.min(3, Math.ceil(points || 1)));
}

function essayLines(points: number) {
  const p = Math.max(1, Number(points) || 1);
  return Math.min(22, Math.max(8, p * 2));
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="ep-info-card"
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "10px 12px",
        background: "#f8fafc",
        minHeight: 60,
        height: "100%",
        display: "block",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 4,
          lineHeight: "12px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: TEXT, lineHeight: "18px" }}>{value}</div>
    </div>
  );
}

function QuestionBlock({ q, index }: { q: PaperQuestion; index: number }) {
  const points = Number(q.points) || 0;
  const marksText = `${points} ${points === 1 ? "mark" : "marks"}`;
  const qNum = index + 1;

  return (
    <section
      className="ep-question"
      data-question-index={index}
      style={{
        breakInside: "avoid",
        pageBreakInside: "avoid",
        marginBottom: 16,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "14px 16px",
        background: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "34px minmax(0,1fr) auto",
          alignItems: "start",
          columnGap: 12,
          marginBottom: 10,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: NAVY,
            color: "#fff",
            display: "block",
            textAlign: "center",
            lineHeight: "34px",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {qNum}
        </div>
        <div style={{ minWidth: 0, paddingTop: 1 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 5,
              lineHeight: "13px",
            }}
          >
            Question {qNum} · {questionTypeLabel(q.type)}
          </div>
          <div
            style={{
              fontSize: 14.5,
              lineHeight: 1.6,
              color: TEXT,
              fontWeight: 500,
              overflowWrap: "anywhere",
            }}
          >
            <RichContent content={q.prompt || ""} />
          </div>
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            color: NAVY,
            background: "#e8eef7",
            border: "1px solid #c8d6ea",
            borderRadius: 999,
            padding: "5px 12px",
            whiteSpace: "nowrap",
            lineHeight: "14px",
            marginTop: 2,
            display: "inline-block",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          {marksText}
        </div>
      </div>

      <div style={{ marginLeft: 46 }}>
        {q.type === "MULTIPLE_CHOICE" && (
          <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
            {(q.choices && q.choices.length ? q.choices : []).map((c, i) => {
              const label = c.label || String.fromCharCode(65 + i);
              return (
                <label
                  key={c.id || i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 24px minmax(0,1fr)",
                    alignItems: "start",
                    columnGap: 10,
                    minHeight: 44,
                    padding: "10px 12px",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ display: "block", paddingTop: 4, lineHeight: 0 }}>
                    <input
                      type="radio"
                      name={`q-${q.id || index}`}
                      aria-label={`Option ${label}`}
                      style={{ margin: 0, width: 14, height: 14, accentColor: NAVY, verticalAlign: "top" }}
                    />
                  </span>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: `1.5px solid ${BORDER_STRONG}`,
                      display: "block",
                      textAlign: "center",
                      lineHeight: "21px",
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: NAVY,
                      boxSizing: "border-box",
                      marginTop: 0,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: TEXT,
                      minWidth: 0,
                      overflowWrap: "anywhere",
                      paddingTop: 1,
                      display: "block",
                    }}
                  >
                    <RichContent content={c.text || ""} />
                  </span>
                </label>
              );
            })}
            {!q.choices?.length && (
              <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", padding: "8px 0", lineHeight: "20px" }}>
                No options provided.
              </div>
            )}
          </div>
        )}

        {q.type === "TRUE_FALSE" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(170px, 220px))", gap: 10, marginTop: 4 }}>
            {["True", "False"].map((label) => (
              <label
                key={label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px minmax(0,1fr)",
                  alignItems: "start",
                  columnGap: 10,
                  minHeight: 44,
                  padding: "10px 12px",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  background: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  color: TEXT,
                  boxSizing: "border-box",
                }}
              >
                <span style={{ display: "block", paddingTop: 3, lineHeight: 0 }}>
                  <input
                    type="radio"
                    name={`q-${q.id || index}`}
                    aria-label={label}
                    style={{ margin: 0, width: 15, height: 15, accentColor: NAVY, verticalAlign: "top" }}
                  />
                </span>
                <span style={{ lineHeight: "22px", display: "block", paddingTop: 0 }}>{label}</span>
              </label>
            ))}
          </div>
        )}

        {q.type === "FILL_BLANK" && (
          <div style={{ marginTop: 6 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: MUTED,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                lineHeight: "13px",
              }}
            >
              Answer
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {Array.from({ length: fillBlankLines(points) }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  name={`q${qNum}_answer_${i + 1}`}
                  aria-label={`Question ${qNum} answer line ${i + 1}`}
                  style={{
                    width: "100%",
                    maxWidth: 560,
                    height: 32,
                    border: "none",
                    borderBottom: `1.8px solid ${NAVY_SOFT}`,
                    borderRadius: 0,
                    padding: "4px 2px",
                    fontSize: 14,
                    lineHeight: "22px",
                    color: TEXT,
                    background: "transparent",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {q.type === "ESSAY" && (
          <div style={{ marginTop: 6 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: MUTED,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                lineHeight: "13px",
              }}
            >
              Response
            </div>
            <textarea
              name={`q${qNum}_response`}
              aria-label={`Question ${qNum} response`}
              rows={essayLines(points)}
              style={{
                width: "100%",
                minHeight: essayLines(points) * 28 + 12,
                border: `1px solid ${BORDER_STRONG}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                lineHeight: "28px",
                color: TEXT,
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent, transparent 27px, #e2e8f0 27px, #e2e8f0 28px)",
                backgroundAttachment: "local",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                display: "block",
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function PaperHeader({
  school,
  exam,
  pkg,
  questions,
}: {
  school: ExamPaperDocumentSchool;
  exam: ExamPaperDocumentExam;
  pkg?: ExamPaperDocumentPackage | null;
  questions: PaperQuestion[];
}) {
  const total = totalPoints(questions);
  const mode = pkg?.deliveryMode || exam.deliveryMode || "—";
  const contact = [school.address, school.contactPhone, school.contactEmail]
    .map((v) => (v || "").trim())
    .filter(Boolean);

  return (
    <header className="ep-header" style={{ marginBottom: 16, breakInside: "avoid", pageBreakInside: "avoid" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(220px, auto)",
          alignItems: "start",
          gap: 20,
          paddingBottom: 14,
          borderBottom: `2.5px solid ${NAVY}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt={school.name ? `${school.name} logo` : "School logo"}
              crossOrigin="anonymous"
              style={{
                width: 68,
                height: 68,
                objectFit: "contain",
                objectPosition: "center",
                flexShrink: 0,
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 12,
                background: NAVY,
                color: "#fff",
                display: "block",
                textAlign: "center",
                lineHeight: "68px",
                fontWeight: 800,
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {(school.name || "S").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.015em", color: NAVY, lineHeight: 1.2 }}>
              {school.name || "School"}
            </div>
            {contact.length > 0 && (
              <div style={{ marginTop: 5, display: "grid", gap: 2 }}>
                {contact.map((line, i) => (
                  <div key={i} style={{ fontSize: 12, color: MUTED, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right", justifySelf: "end" }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 6,
              lineHeight: "13px",
            }}
          >
            Examination Information
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: NAVY, lineHeight: 1.25 }}>Examination Paper</div>
          <div style={{ marginTop: 6, display: "grid", gap: 3, fontSize: 12, color: MUTED, justifyItems: "end" }}>
            <div style={{ lineHeight: "16px" }}>
              <strong style={{ color: TEXT }}>Mode:</strong> {mode}
            </div>
            {pkg?.revision ? (
              <div style={{ lineHeight: "16px" }}>
                <strong style={{ color: TEXT }}>Revision:</strong> {pkg.revision}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.18, fontWeight: 800, letterSpacing: "-0.02em", color: NAVY }}>
          {exam.title || "Examination"}
        </h1>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
          alignItems: "stretch",
        }}
      >
        <InfoCard label="Date" value={formatDate(exam.startDate)} />
        <InfoCard label="Duration" value={formatDuration(exam.duration)} />
        <InfoCard label="Total Marks" value={String(total)} />
        <InfoCard label="Questions" value={String(questions.length)} />
      </div>
    </header>
  );
}

function InstructionsBlock({ instructions }: { instructions?: string | null }) {
  if (!instructions) return null;
  return (
    <div
      className="ep-instructions"
      style={{
        border: "1px solid #c8d6ea",
        background: "#f3f6fb",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 16,
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: NAVY,
          marginBottom: 6,
          lineHeight: "13px",
        }}
      >
        General Instructions
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: TEXT, whiteSpace: "pre-wrap" }}>{instructions}</div>
    </div>
  );
}

export const ExamPaperDocument = React.forwardRef<
  HTMLDivElement,
  {
    school: ExamPaperDocumentSchool;
    exam: ExamPaperDocumentExam;
    pkg?: ExamPaperDocumentPackage | null;
    questions: PaperQuestion[];
  }
>(function ExamPaperDocument({ school, exam, pkg, questions }, ref) {
  return (
    <div
      ref={ref}
      id="exam-paper-document"
      className="ep-document"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        background: "#ffffff",
        color: TEXT,
        padding: "15mm 15mm 16mm",
        boxSizing: "border-box",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PaperHeader school={school} exam={exam} pkg={pkg} questions={questions} />
      <InstructionsBlock instructions={exam.instructions} />

      <main style={{ flex: 1 }}>
        {questions.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: MUTED, fontSize: 14, lineHeight: "22px" }}>
            No questions available for this paper.
          </div>
        ) : (
          questions.map((q, i) => <QuestionBlock key={q.id || i} q={q} index={i} />)
        )}
      </main>

      <footer
        className="ep-footer"
        style={{
          marginTop: "auto",
          paddingTop: 10,
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          fontSize: 10.5,
          color: MUTED,
          lineHeight: "16px",
        }}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {school.name || "School"} — {exam.title || "Examination"}
        </span>
        <span style={{ whiteSpace: "nowrap", fontWeight: 700, color: NAVY_SOFT }}>End of paper</span>
      </footer>

      <style>{`
        .ep-document, .ep-document * { box-sizing: border-box; }
        .ep-question { break-inside: avoid !important; page-break-inside: avoid !important; }
        .ep-header, .ep-instructions { break-inside: avoid !important; page-break-inside: avoid !important; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #exam-paper-document { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: auto !important; padding: 0 !important; }
          .ep-question { break-inside: avoid-page !important; page-break-inside: avoid !important; }
        }
        @page { size: A4 portrait; margin: 12mm; }
      `}</style>
    </div>
  );
});

function createPageShell(
  school: ExamPaperDocumentSchool,
  exam: ExamPaperDocumentExam,
  compactHeader: boolean
) {
  const page = document.createElement("div");
  page.className = "ep-page";
  page.style.width = "210mm";
  page.style.height = "297mm";
  page.style.padding = "15mm 15mm 14mm";
  page.style.boxSizing = "border-box";
  page.style.background = "#ffffff";
  page.style.color = TEXT;
  page.style.fontFamily =
    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  page.style.display = "flex";
  page.style.flexDirection = "column";
  page.style.overflow = "hidden";
  page.style.position = "relative";

  if (compactHeader) {
    const h = document.createElement("div");
    h.style.display = "grid";
    h.style.gridTemplateColumns = "1fr auto";
    h.style.alignItems = "center";
    h.style.borderBottom = `1.5px solid ${BORDER}`;
    h.style.paddingBottom = "8px";
    h.style.marginBottom = "14px";
    h.style.columnGap = "12px";
    const left = document.createElement("div");
    left.textContent = school.name || "School";
    left.style.fontSize = "11.5px";
    left.style.fontWeight = "700";
    left.style.color = NAVY;
    left.style.lineHeight = "16px";
    left.style.minWidth = "0";
    left.style.overflow = "hidden";
    left.style.textOverflow = "ellipsis";
    left.style.whiteSpace = "nowrap";
    const right = document.createElement("div");
    right.textContent = exam.title || "Examination";
    right.style.fontSize = "11px";
    right.style.color = MUTED;
    right.style.textAlign = "right";
    right.style.lineHeight = "16px";
    right.style.minWidth = "0";
    right.style.overflow = "hidden";
    right.style.textOverflow = "ellipsis";
    right.style.whiteSpace = "nowrap";
    h.appendChild(left);
    h.appendChild(right);
    page.appendChild(h);
  }

  const content = document.createElement("div");
  content.className = "ep-page-content";
  content.style.flex = "1";
  content.style.minHeight = "0";
  content.style.overflow = "hidden";
  page.appendChild(content);

  const footer = document.createElement("footer");
  footer.className = "ep-page-footer";
  footer.style.marginTop = "auto";
  footer.style.paddingTop = "10px";
  footer.style.borderTop = `1px solid ${BORDER}`;
  footer.style.display = "grid";
  footer.style.gridTemplateColumns = "1fr auto";
  footer.style.alignItems = "center";
  footer.style.columnGap = "12px";
  footer.style.fontSize = "10.5px";
  footer.style.color = MUTED;
  footer.style.lineHeight = "16px";
  const fLeft = document.createElement("span");
  fLeft.textContent = `${school.name || "School"} — ${exam.title || "Examination"}`;
  fLeft.style.minWidth = "0";
  fLeft.style.overflow = "hidden";
  fLeft.style.textOverflow = "ellipsis";
  fLeft.style.whiteSpace = "nowrap";
  const fRight = document.createElement("span");
  fRight.className = "ep-page-number";
  fRight.style.whiteSpace = "nowrap";
  fRight.style.fontWeight = "700";
  fRight.style.color = NAVY_SOFT;
  fRight.style.textAlign = "right";
  footer.appendChild(fLeft);
  footer.appendChild(fRight);
  page.appendChild(footer);

  return page;
}

export async function downloadExamPaperPdf(element: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const root = element.cloneNode(true) as HTMLElement;
  root.id = "exam-paper-export-root";
  root.style.margin = "0";
  root.style.boxShadow = "none";
  root.style.minHeight = "0";
  root.style.height = "auto";

  const footerText = root.querySelector(".ep-footer span")?.textContent || "";
  const parts = footerText.split(" — ");
  const school = { name: parts[0] || "School" } as ExamPaperDocumentSchool;
  const exam = { id: "", title: parts.slice(1).join(" — ") || "Examination" } as ExamPaperDocumentExam;

  const header = root.querySelector(".ep-header") as HTMLElement | null;
  const instructions = root.querySelector(".ep-instructions") as HTMLElement | null;
  const questions = Array.from(root.querySelectorAll(".ep-question")) as HTMLElement[];

  const staging = document.createElement("div");
  staging.style.position = "fixed";
  staging.style.left = "-10000px";
  staging.style.top = "0";
  staging.style.width = "210mm";
  staging.style.background = "#fff";
  staging.style.zIndex = "-1";
  document.body.appendChild(staging);

  try {
    const built: HTMLElement[] = [];
    let current = createPageShell(school, exam, false);
    staging.appendChild(current);
    let currentContent = current.querySelector(".ep-page-content") as HTMLElement;
    if (header) currentContent.appendChild(header.cloneNode(true));
    if (instructions) currentContent.appendChild(instructions.cloneNode(true));
    built.push(current);

    if (questions.length === 0) {
      const empty = document.createElement("div");
      empty.style.padding = "40px 0";
      empty.style.textAlign = "center";
      empty.style.color = MUTED;
      empty.style.fontSize = "14px";
      empty.style.lineHeight = "22px";
      empty.textContent = "No questions available for this paper.";
      currentContent.appendChild(empty);
    } else {
      for (const q of questions) {
        const clone = q.cloneNode(true) as HTMLElement;
        currentContent.appendChild(clone);
        if (currentContent.scrollHeight > currentContent.clientHeight + 1) {
          currentContent.removeChild(clone);
          current = createPageShell(school, exam, true);
          staging.appendChild(current);
          currentContent = current.querySelector(".ep-page-content") as HTMLElement;
          built.push(current);
          currentContent.appendChild(clone);
        }
      }
    }

    const totalPages = built.length;
    built.forEach((p, i) => {
      const num = p.querySelector(".ep-page-number") as HTMLElement | null;
      if (num) num.textContent = `Page ${i + 1} of ${totalPages}`;

      p.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]').forEach((input) => {
        const cell = input.parentElement as HTMLElement | null;
        const container = cell?.parentElement as HTMLElement | null;
        if (cell && container) {
          const cols = (container.style.gridTemplateColumns || "").replace(/\s+/g, " ").trim();
          if (cols.startsWith("20px 24px")) {
            container.style.gridTemplateColumns = "24px minmax(0,1fr)";
          } else if (cols.startsWith("18px")) {
            container.style.gridTemplateColumns = "minmax(0,1fr)";
          }
          cell.remove();
        } else {
          input.remove();
        }
      });
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    for (let i = 0; i < built.length; i++) {
      const pageEl = built[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: pageEl.offsetWidth,
        height: pageEl.offsetHeight,
        windowWidth: pageEl.scrollWidth,
        windowHeight: pageEl.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    }
    pdf.save(filename);
  } finally {
    if (staging.parentNode) staging.parentNode.removeChild(staging);
  }
}
