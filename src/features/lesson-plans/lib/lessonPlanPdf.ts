import { jsPDF } from "jspdf";
import type { LessonPlan } from "../types";
import {
  formatDayLabel,
  parseActivities,
  parseMaterials,
  parseObjectives,
  statusLabel,
} from "../utils";

function addWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/** Single lesson plan PDF download. */
export function downloadLessonPlanPdf(plan: LessonPlan, schoolName?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const maxW = 210 - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(plan.title || "Lesson plan", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  y = addWrapped(
    doc,
    [
      schoolName || "",
      `${formatDayLabel(plan.lessonDate)} · ${plan.durationMinutes} min`,
      plan.periodLabel || "",
      `${plan.subjectName}${plan.gradeLevelName ? ` · ${plan.gradeLevelName}` : ""}`,
      plan.teacherName,
      `Status: ${statusLabel(plan.status)}`,
    ]
      .filter(Boolean)
      .join("  ·  "),
    margin,
    y,
    maxW
  );
  y += 4;
  doc.setDrawColor(220);
  doc.line(margin, y, 210 - margin, y);
  y += 8;
  doc.setTextColor(20);

  const section = (title: string, body: string) => {
    if (!body.trim()) return;
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = addWrapped(doc, body, margin, y, maxW, 5);
    y += 6;
  };

  const objectives = parseObjectives(plan.objectives);
  section(
    "Objectives",
    objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")
  );
  if (plan.standards) section("Standards", plan.standards);
  if (plan.warmUp) section("Warm-up", plan.warmUp);

  const acts = parseActivities(plan.activities);
  section(
    "Activities",
    acts
      .map((a) => {
        const mins = a.minutes != null ? ` (${a.minutes} min)` : "";
        return `• ${a.title}${mins}${a.description ? `\n  ${a.description}` : ""}`;
      })
      .join("\n")
  );

  const mats = parseMaterials(plan.materials);
  if (mats.length) section("Materials", mats.map((m) => `• ${m}`).join("\n"));
  if (plan.assessment) section("Assessment", plan.assessment);
  if (plan.differentiation) section("Differentiation", plan.differentiation);
  if (plan.homework) section("Homework", plan.homework);

  const safe = (plan.title || "lesson-plan").replace(/[^\w\-]+/g, "_").slice(0, 40);
  doc.save(`${safe}-${plan.lessonDate}.pdf`);
}

/** Multi-plan week pack PDF. */
export function downloadWeekPackPdf(
  plans: LessonPlan[],
  weekLabel: string,
  schoolName?: string
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const maxW = 210 - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Lesson plan week pack", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  y = addWrapped(
    doc,
    [schoolName, weekLabel, `${plans.length} plan(s)`].filter(Boolean).join(" · "),
    margin,
    y,
    maxW
  );
  y += 6;
  doc.setTextColor(20);

  const sorted = [...plans].sort((a, b) => a.lessonDate.localeCompare(b.lessonDate));
  for (const plan of sorted) {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(230);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y - 4, maxW, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(plan.title, margin + 2, y + 2);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    y = addWrapped(
      doc,
      `${formatDayLabel(plan.lessonDate)} · ${plan.subjectName} · ${statusLabel(plan.status)} · ${plan.durationMinutes}m`,
      margin,
      y,
      maxW,
      4.5
    );
    doc.setTextColor(20);
    y += 2;

    const objectives = parseObjectives(plan.objectives).slice(0, 4);
    if (objectives.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Objectives", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      y = addWrapped(
        doc,
        objectives.map((o, i) => `${i + 1}. ${o}`).join("\n"),
        margin,
        y,
        maxW,
        4.2
      );
      y += 3;
    }

    const acts = parseActivities(plan.activities).slice(0, 5);
    if (acts.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Activities", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      y = addWrapped(
        doc,
        acts.map((a) => `• ${a.title}${a.minutes != null ? ` (${a.minutes}m)` : ""}`).join("\n"),
        margin,
        y,
        maxW,
        4.2
      );
    }
    y += 8;
  }

  doc.save(`lesson-week-pack-${weekLabel.replace(/\s+/g, "-")}.pdf`);
}
