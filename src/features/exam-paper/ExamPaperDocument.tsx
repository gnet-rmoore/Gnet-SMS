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

function contactLine(school: ExamPaperDocumentSchool) {
  return [school.address, school.contactPhone, school.contactEmail]
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join("  •  ");
}

function totalPoints(questions: PaperQuestion[]) {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}

function QuestionBlock({ q, index }: { q: PaperQuestion; index: number }) {
  const points = Number(q.points) || 0;
  const typeLabel =
    q.type === "MULTIPLE_CHOICE"
      ? "Multiple Choice"
      : q.type === "TRUE_FALSE"
        ? "True / False"
        : q.type === "FILL_BLANK"
          ? "Fill in the Blank"
          : "Essay";

  return (
    <section
      className="ep-question"
      style={{ breakInside: "avoid", pageBreakInside: "avoid", marginBottom: 22 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#0f172a",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#64748b",
                marginBottom: 4,
              }}
            >
              {typeLabel}
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.65, color: "#0f172a", fontWeight: 500 }}>
              <RichContent content={q.prompt || ""} />
            </div>
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            color: "#334155",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: 999,
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {points} {points === 1 ? "mark" : "marks"}
        </div>
      </div>

      <div style={{ marginTop: 12, marginLeft: 40 }}>
        {q.type === "MULTIPLE_CHOICE" && (
          <div style={{ display: "grid", gap: 8 }}>
            {(q.choices && q.choices.length ? q.choices : []).map((c, i) => (
              <div
                key={c.id || i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: "1.5px solid #94a3b8",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#334155",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {c.label || String.fromCharCode(65 + i)}
                </span>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "#0f172a" }}>
                  <RichContent content={c.text || ""} />
                </div>
              </div>
            ))}
            {!q.choices?.length && (
              <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>
                No options provided.
              </div>
            )}
          </div>
        )}

        {q.type === "TRUE_FALSE" && (
          <div style={{ display: "flex", gap: 24, paddingTop: 4 }}>
            {["True", "False"].map((label) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#0f172a" }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: "1.5px solid #64748b",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {q.type === "FILL_BLANK" && (
          <div style={{ paddingTop: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Answer
            </div>
            <div style={{ borderBottom: "1.5px solid #334155", height: 28, maxWidth: 520 }} />
          </div>
        )}

        {q.type === "ESSAY" && (
          <div style={{ paddingTop: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Response
            </div>
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                minHeight: 140,
                background:
                  "repeating-linear-gradient(to bottom, transparent, transparent 27px, #e2e8f0 28px)",
              }}
            />
          </div>
        )}
      </div>
    </section>
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
  const contact = contactLine(school);
  const total = totalPoints(questions);
  const mode = pkg?.deliveryMode || exam.deliveryMode || "—";

  return (
    <div
      ref={ref}
      id="exam-paper-document"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        background: "#ffffff",
        color: "#0f172a",
        padding: "18mm 16mm 20mm",
        boxSizing: "border-box",
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        position: "relative",
      }}
    >
      <header style={{ borderBottom: "2px solid #0f172a", paddingBottom: 16, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: "#fff",
                padding: 4,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: school.brandColor || "#1e293b",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {(school.name || "S").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", color: "#0f172a" }}>
              {school.name || "School"}
            </div>
            {contact && (
              <div style={{ marginTop: 4, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                {contact}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              Examination Paper
            </div>
            {pkg?.revision ? (
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Revision {pkg.revision}</div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#020617",
            }}
          >
            {exam.title || "Examination"}
          </h1>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            { label: "Date", value: formatDate(exam.startDate) },
            { label: "Duration", value: formatDuration(exam.duration) },
            { label: "Total Marks", value: String(total) },
            { label: "Questions", value: String(questions.length) },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "8px 10px",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
                {item.label}
              </div>
              <div style={{ marginTop: 3, fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: "#475569" }}>
          <span><strong style={{ color: "#0f172a" }}>Delivery mode:</strong> {mode}</span>
        </div>
      </header>

      {exam.instructions ? (
        <div
          style={{
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3730a3", marginBottom: 4 }}>
            General Instructions
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#1e1b4b", whiteSpace: "pre-wrap" }}>
            {exam.instructions}
          </div>
        </div>
      ) : null}

      <main>
        {questions.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: 14 }}>
            No questions available for this paper.
          </div>
        ) : (
          questions.map((q, i) => <QuestionBlock key={q.id || i} q={q} index={i} />)
        )}
      </main>

      <footer
        style={{
          marginTop: 24,
          paddingTop: 12,
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#64748b",
        }}
      >
        <span>{school.name || "School"} — {exam.title || "Examination"}</span>
        <span>End of paper</span>
      </footer>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #exam-paper-document { box-shadow: none !important; margin: 0 !important; }
        }
        @page { size: A4; margin: 12mm; }
      `}</style>
    </div>
  );
});

export async function downloadExamPaperPdf(element: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  const pageHeight = pdf.internal.pageSize.getHeight();

  let heightLeft = pdfHeight;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
