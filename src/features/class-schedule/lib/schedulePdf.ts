import { jsPDF } from "jspdf";
import { DAY_LABELS, GRID_DAYS, cellKey, type SchedulePeriodDto, type TimetableEntryDto } from "../types";

type DraftLike = {
  subjectName: string | null;
  teacherName: string;
};

async function loadImageData(
  url?: string | null
): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl.startsWith("data:image/")) return null;
    return {
      dataUrl,
      format: dataUrl.includes("image/png") ? "PNG" : "JPEG",
    };
  } catch {
    return null;
  }
}

/** Landscape weekly timetable PDF for one classroom. */
export async function downloadScheduleWeekPdf(opts: {
  classroomName: string;
  bellName: string;
  periods: SchedulePeriodDto[];
  /** Map of `${day}|${periodId}` → cell */
  cells: Record<string, DraftLike>;
  schoolName?: string;
  academicYear?: string;
  logoUrl?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const margin = 12;
  let y = margin;

  const logo = await loadImageData(opts.logoUrl);
  if (logo) {
    try {
      const props = doc.getImageProperties(logo.dataUrl);
      const maxW = 22;
      const maxH = 16;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      doc.addImage(logo.dataUrl, logo.format, 297 - margin - w, margin, w, h);
    } catch {
      /* logo is optional */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.classroomName || "Classroom timetable", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const meta = [
    opts.schoolName,
    opts.academicYear ? `Academic year ${opts.academicYear}` : null,
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
