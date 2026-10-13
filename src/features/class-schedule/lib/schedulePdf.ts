import { jsPDF } from "jspdf";
import { DAY_LABELS, GRID_DAYS, cellKey, type SchedulePeriodDto, type TimetableEntryDto } from "../types";

type DraftLike = {
  subjectName: string | null;
  teacherName: string;
};

/** Landscape weekly timetable PDF for one classroom. */
export function downloadScheduleWeekPdf(opts: {
  classroomName: string;
  bellName: string;
  periods: SchedulePeriodDto[];
  /** Map of `${day}|${periodId}` → cell */
  cells: Record<string, DraftLike>;
  schoolName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const margin = 12;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.classroomName || "Classroom timetable", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const meta = [
    opts.schoolName,
    opts.bellName,
    opts.effectiveFrom || opts.effectiveTo
      ? `Effective ${opts.effectiveFrom || "…"} → ${opts.effectiveTo || "open"}`
      : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (meta) {
    doc.text(meta, margin, y);
    y += 8;
  } else {
    y += 4;
  }

  doc.setTextColor(0);
  const pageW = 297 - margin * 2;
  const periodColW = 28;
  const dayColW = (pageW - periodColW) / GRID_DAYS.length;
  const rowH = 16;
  const startY = y;

  // Header
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, startY, pageW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Period", margin + 2, startY + 5.5);
  GRID_DAYS.forEach((d, i) => {
    doc.text(DAY_LABELS[d] || String(d), margin + periodColW + i * dayColW + 2, startY + 5.5);
  });

  let rowY = startY + 8;
  doc.setFont("helvetica", "normal");
  opts.periods.forEach((period, idx) => {
    if (rowY + rowH > 200) {
      doc.addPage();
      rowY = margin;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, rowY, pageW, rowH, "F");
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, rowY, pageW, rowH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(period.shortCode || period.label, margin + 2, rowY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`${period.startTime}–${period.endTime}`, margin + 2, rowY + 10);
    doc.setTextColor(0);

    GRID_DAYS.forEach((d, i) => {
      const x = margin + periodColW + i * dayColW;
      doc.line(x, rowY, x, rowY + rowH);
      const cell = opts.cells[cellKey(d, period.id)];
      if (cell) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        const sub = (cell.subjectName || "Class").slice(0, 28);
        doc.text(sub, x + 2, rowY + 5, { maxWidth: dayColW - 4 });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(90);
        doc.text((cell.teacherName || "").slice(0, 28), x + 2, rowY + 10, {
          maxWidth: dayColW - 4,
        });
        doc.setTextColor(0);
      }
    });
    rowY += rowH;
  });

  const safeName = (opts.classroomName || "timetable").replace(/[^\w\-]+/g, "_").slice(0, 40);
  doc.save(`${safeName}-schedule.pdf`);
}

/** Build cell map from timetable entries for PDF. */
export function entriesToPdfCells(entries: TimetableEntryDto[]): Record<string, DraftLike> {
  const out: Record<string, DraftLike> = {};
  for (const e of entries) {
    out[cellKey(e.dayOfWeek, e.schedulePeriodId)] = {
      subjectName: e.subjectName,
      teacherName: e.teacherName,
    };
  }
  return out;
}
