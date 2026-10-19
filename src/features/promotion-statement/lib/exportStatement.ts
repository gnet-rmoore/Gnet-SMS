import type { PromotionStatement, StatementCell } from "../../year-transition/api";

const CELL_COLUMNS: Array<{ key: Extract<keyof StatementCell, string>; label: string }> = [
  { key: "opening", label: "Opening" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
  { key: "unknown", label: "Unknown" },
  { key: "promoted", label: "Promoted" },
  { key: "repeat", label: "Repeat" },
  { key: "graduated", label: "Graduated" },
  { key: "droppedOut", label: "Dropped out" },
  { key: "doNotReturn", label: "Do not return" },
  { key: "suspended", label: "Suspended" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
];

function scopeLabel(statement: PromotionStatement) {
  if (statement.scope === "TERM" && statement.period) {
    return `${statement.period.label} (${statement.period.shortCode})`;
  }
  return "Full year";
}

function summaryRows(statement: PromotionStatement): Array<Array<string | number>> {
  const t = statement.totals;
  return [
    ["Total students (beginning)", t.totalStudentsBeginning],
    ["Male", t.maleStudents],
    ["Female", t.femaleStudents],
    ["Other / unknown", t.otherStudents + t.unknownGender],
    ["Promoted", t.promoted],
    ["Repeating", t.repeat],
    ["Graduated", t.graduated],
    ["Dropped out", t.droppedOut],
    ["Do not return", t.doNotReturn],
    ["Suspended", t.suspended],
    ["Passed", t.passed],
    ["Failed", t.failed],
    ["Average score", `${statement.academic.averageScore}%`],
    ["Average attendance", `${statement.attendance.averageRate}%`],
    ["Suspension days", statement.discipline.totalSuspensionDays],
  ];
}

function matrixRows(statement: PromotionStatement): Array<Array<string | number>> {
  const header = ["Division", "Grade", "Class", ...CELL_COLUMNS.map((c) => c.label)];
  const rows: Array<Array<string | number>> = [header];
  for (const div of statement.divisions) {
    for (const row of div.classes) {
      rows.push([
        div.divisionName,
        row.gradeName,
        row.classroomName,
        ...CELL_COLUMNS.map((c) => row[c.key]),
      ]);
    }
    rows.push([
      `${div.divisionName} — total`,
      "",
      "",
      ...CELL_COLUMNS.map((c) => div.totals[c.key]),
    ]);
  }
  rows.push([
    "WHOLE SCHOOL",
    "",
    "",
    ...CELL_COLUMNS.map((c) => statement.school[c.key]),
  ]);
  return rows;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function baseFilename(statement: PromotionStatement) {
  const scope = statement.scope === "TERM" && statement.period ? `-${statement.period.shortCode}` : "";
  return `promotion-statement-${statement.schoolYearKey}${scope}`;
}

export async function exportStatementXlsx(statement: PromotionStatement) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ["Promotion Statement"],
    ["School", statement.schoolInfo?.name || ""],
    ["Academic year", statement.schoolYearKey],
    ["Scope", scopeLabel(statement)],
    ["Status", statement.run?.status || (statement.draft ? "DRAFT" : "")],
    [],
    ["Metric", "Value"],
    ...summaryRows(statement),
  ]);
  XLSX.utils.book_append_sheet(wb, summary, "Summary");

  const matrix = XLSX.utils.aoa_to_sheet(matrixRows(statement));
  XLSX.utils.book_append_sheet(wb, matrix, "By class");

  if (statement.bestAcademicPerformers.length) {
    const performers = XLSX.utils.aoa_to_sheet([
      ["Position", "Student", "Grade", "Average %"],
      ...statement.bestAcademicPerformers.map((p) => [p.position, p.name, p.gradeName, p.overallAverage]),
    ]);
    XLSX.utils.book_append_sheet(wb, performers, "Top performers");
  }

  if (statement.bestAttendance.length) {
    const attendance = XLSX.utils.aoa_to_sheet([
      ["Student", "Grade", "Attendance %", "Present", "Records"],
      ...statement.bestAttendance.map((a) => [a.name, a.gradeName, a.attendanceRate, a.present, a.total]),
    ]);
    XLSX.utils.book_append_sheet(wb, attendance, "Attendance");
  }

  XLSX.writeFile(wb, `${baseFilename(statement)}.xlsx`);
}

export async function exportStatementDocx(statement: PromotionStatement) {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } =
    docx;

  const cell = (text: string | number, opts: { bold?: boolean; align?: "left" | "center" } = {}) =>
    new TableCell({
      children: [
        new Paragraph({
          alignment: opts.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: String(text), bold: opts.bold })],
        }),
      ],
    });

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: summaryRows(statement).map(
      (r) => new TableRow({ children: [cell(r[0], { bold: false }), cell(r[1] as any, { align: "center" })] })
    ),
  });

  const matrixHeader = ["Division", "Grade", "Class", ...CELL_COLUMNS.map((c) => c.label)];
  const matrixTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: matrixHeader.map((h) => cell(h, { bold: true, align: h === "Division" || h === "Grade" || h === "Class" ? "left" : "center" })),
      }),
      ...statement.divisions.flatMap((div) => [
        ...div.classes.map(
          (row) =>
            new TableRow({
              children: [
                cell(div.divisionName),
                cell(row.gradeName),
                cell(row.classroomName),
                ...CELL_COLUMNS.map((c) => cell(row[c.key], { align: "center" })),
              ],
            })
        ),
        new TableRow({
          children: [
            cell(`${div.divisionName} — total`, { bold: true }),
            cell(""),
            cell(""),
            ...CELL_COLUMNS.map((c) => cell(div.totals[c.key], { bold: true, align: "center" })),
          ],
        }),
      ]),
      new TableRow({
        children: [
          cell("WHOLE SCHOOL", { bold: true }),
          cell(""),
          cell(""),
          ...CELL_COLUMNS.map((c) => cell(statement.school[c.key], { bold: true, align: "center" })),
        ],
      }),
    ],
  });

  const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: statement.schoolInfo?.name || "", bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Promotion Statement", bold: true })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Academic year ${statement.schoolYearKey} · ${scopeLabel(statement)}${statement.run ? ` · ${statement.run.status}` : ""}` })],
    }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: "School summary", bold: true })] }),
    summaryTable,
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: "Enrollment & outcomes by class", bold: true })] }),
    matrixTable,
    new Paragraph({ children: [] }),
  ];

  if (statement.bestAcademicPerformers.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: "Best academic performers", bold: true })] }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("#", { bold: true, align: "center" }), cell("Student", { bold: true }), cell("Grade", { bold: true }), cell("Average %", { bold: true, align: "center" })] }),
          ...statement.bestAcademicPerformers.map(
            (p) => new TableRow({ children: [cell(p.position, { align: "center" }), cell(p.name), cell(p.gradeName), cell(p.overallAverage, { align: "center" })] })
          ),
        ],
      })
    );
    children.push(new Paragraph({ children: [] }));
  }

  if (statement.bestAttendance.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: "Best attendance", bold: true })] }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("Student", { bold: true }), cell("Grade", { bold: true }), cell("Attendance %", { bold: true, align: "center" }), cell("Present / records", { bold: true, align: "center" })] }),
          ...statement.bestAttendance.map(
            (a) => new TableRow({ children: [cell(a.name), cell(a.gradeName), cell(a.attendanceRate, { align: "center" }), cell(`${a.present} / ${a.total}`, { align: "center" })] })
          ),
        ],
      })
    );
    children.push(new Paragraph({ children: [] }));
  }

  children.push(new Paragraph({ children: [new TextRun({ text: `Generated ${new Date().toLocaleString()}` })] }));

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${baseFilename(statement)}.docx`);
}

export async function exportStatementPdf(statement: PromotionStatement) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text(statement.schoolInfo?.name || "School", doc.internal.pageSize.getWidth() / 2, 40, { align: "center" });
  doc.setFontSize(13);
  doc.text("Promotion Statement", doc.internal.pageSize.getWidth() / 2, 60, { align: "center" });
  doc.setFontSize(10);
  doc.text(
    `Academic year ${statement.schoolYearKey} · ${scopeLabel(statement)}${statement.run ? ` · ${statement.run.status}` : ""}`,
    doc.internal.pageSize.getWidth() / 2,
    76,
    { align: "center" }
  );

  autoTable(doc, {
    startY: 92,
    head: [["Metric", "Value"]],
    body: summaryRows(statement).map((r) => [String(r[0]), String(r[1])]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 18,
    head: [["Division", "Grade", "Class", ...CELL_COLUMNS.map((c) => c.label)]],
    body: [
      ...statement.divisions.flatMap((div) => [
        ...div.classes.map((row) => [
          div.divisionName,
          row.gradeName,
          row.classroomName,
          ...CELL_COLUMNS.map((c) => String(row[c.key])),
        ]),
        [`${div.divisionName} — total`, "", "", ...CELL_COLUMNS.map((c) => String(div.totals[c.key]))],
      ]),
      ["WHOLE SCHOOL", "", "", ...CELL_COLUMNS.map((c) => String(statement.school[c.key]))],
    ],
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], fontSize: 7 },
  });

  if (statement.bestAcademicPerformers.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [["#", "Student", "Grade", "Average %"]],
      body: statement.bestAcademicPerformers.map((p) => [String(p.position), p.name, p.gradeName, `${p.overallAverage}`]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
  }

  if (statement.bestAttendance.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [["Student", "Grade", "Attendance %", "Present / records"]],
      body: statement.bestAttendance.map((a) => [a.name, a.gradeName, `${a.attendanceRate}%`, `${a.present} / ${a.total}`]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
  }

  doc.save(`${baseFilename(statement)}.pdf`);
}

export function exportStatementCsv(statement: PromotionStatement) {
  const lines = matrixRows(statement).map((row) =>
    row
      .map((v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? JSON.stringify(s) : s;
      })
      .join(",")
  );
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${baseFilename(statement)}.csv`);
}
