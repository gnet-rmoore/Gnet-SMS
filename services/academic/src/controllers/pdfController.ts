import type { Request, Response } from "express";
import { generatePDF } from "../lib/pdfService";
import { getGradeSheetTemplateDef, resolveGradeSheetTemplateKey } from "../features/gradesheets";
import prisma from "../lib/prisma";

const GRADE_SHEET_TEMPLATES = {
  TEMPLATE_1: "LedgerReport",
  TEMPLATE_2: "MasteryBarsReport",
  TEMPLATE_3: "OfficialRecordReport",
} as const;

function getGradeSheetHTML(
  templateId: string,
  data: any,
  school: any,
  legends: any[],
  signatures: any,
  exam: any
): string {
  const templateName = GRADE_SHEET_TEMPLATES[templateId as keyof typeof GRADE_SHEET_TEMPLATES] || "LedgerReport";
  const templateDef = getGradeSheetTemplateDef(templateId);

  // Build the HTML for the grade sheet using React components server-side
  // For now, we'll use a simplified HTML generation approach
  // In production, you'd use ReactDOMServer.renderToStaticMarkup

  const studentName = data.studentName || "Student";
  const examTitle = data.examTitle || "Examination";
  const examDate = data.examDate || new Date().toISOString();
  const grades = data.grades || [];
  const schoolName = school?.name || "School";

  const legendsHTML = legends.map((l: any) => `
    <tr>
      <td>${l.gradeLetter || l.letter}</td>
      <td>${l.minScore || l.min} - ${l.maxScore || l.max}</td>
      <td>${l.remark || l.gpaPoints || ""}</td>
    </tr>
  `).join("");

  const gradesHTML = grades.map((g: any) => `
    <tr>
      <td>${g.subject?.name || g.subjectName || ""}</td>
      <td>${g.subject?.code || g.subjectCode || ""}</td>
      <td>${g.classroom?.name || g.className || ""}</td>
      <td>${g.score !== null && g.score !== undefined ? g.score : "—"}</td>
      <td>${g.status || "—"}</td>
    </tr>
  `).join("");

  const principalSig = signatures?.principal
    ? `<img src="${signatures.principal}" alt="Principal Signature" style="max-height: 40px; max-width: 150px;" />`
    : "<div style='border-bottom: 1px solid #000; width: 150px; height: 40px;'></div>";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${studentName} - ${examTitle} - Grade Sheet</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #000; }
    .container { max-width: 100%; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .exam-title { font-size: 18px; color: #333; margin-bottom: 5px; }
    .student-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
    .student-info div { flex: 1; }
    .student-info label { font-weight: bold; display: block; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .legend-table { margin-top: 30px; }
    .signature-block { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature-line { text-align: center; width: 200px; }
    .signature-line img { max-height: 50px; }
    .signature-line .line { border-bottom: 1px solid #000; margin-top: 30px; padding-bottom: 5px; }
    .signature-line .title { font-size: 11px; color: #666; }
    @page { margin: 20mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    .no-print { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="school-name">${schoolName}</div>
      <div class="exam-title">${examTitle}</div>
      <div>Grade Sheet</div>
    </div>

    <div class="student-info">
      <div>
        <label>Student Name</label>
        <span>${studentName}</span>
      </div>
      <div>
        <label>Exam Date</label>
        <span>${new Date(examDate).toLocaleDateString()}</span>
      </div>
      <div>
        <label>Template</label>
        <span>${templateDef?.name || templateId}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Code</th>
          <th>Class</th>
          <th>Score</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${gradesHTML}
      </tbody>
    </table>

    ${legends.length > 0 ? `
    <table class="legend-table">
      <thead>
        <tr>
          <th>Grade</th>
          <th>Range</th>
          <th>Remark</th>
        </tr>
      </thead>
      <tbody>
        ${legendsHTML}
      </tbody>
    </table>
    ` : ""}

    <div class="signature-block">
      <div class="signature-line">
        <div>${principalSig}</div>
        <div class="line"></div>
        <div class="title">Principal</div>
      </div>
      <div class="signature-line">
        <div class="line"></div>
        <div class="title">Class Teacher</div>
      </div>
      <div class="signature-line">
        <div class="line"></div>
        <div class="title">Parent / Guardian</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

async function getGradeSheetData(examId: string, studentId: string, schoolId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new Error("Exam not found");

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found");

  // Get grades for this student and exam
  const gradeEntries = await prisma.gradeEntry.findMany({
    where: { examId, studentId, schoolId },
    include: {
      subject: true,
      exam: true,
      classroom: true,
    },
  });

  const gradeLegends = await prisma.gradeLegend.findMany({
    where: { schoolId },
    include: { scales: true },
  });

  const legends = gradeLegends.flatMap((lg) => lg.scales);

  // Get signatures
  const signatures = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { documentSignatories: true },
  });

  let principalSig = null;
  if (signatures?.documentSignatories) {
    try {
      const sigs = JSON.parse(signatures.documentSignatories);
      principalSig = sigs.principal;
    } catch {}
  }

  return {
    studentName: student.name,
    examTitle: exam.title,
    examDate: exam.startDate,
    grades: gradeEntries.map((g) => ({
      subject: { name: g.subject?.name, code: g.subject?.code },
      classroom: { name: g.classroom?.name },
      score: g.score,
      status: g.status,
    })),
    legends,
    signatures: { principal: principalSig },
    schoolName: school.name,
    templateId: resolveGradeSheetTemplateKey(school.gradeSheetTemplate),
  };
}

export const pdfController = {
  async generateGradeSheetPDF(req: Request, res: Response) {
    const { examId, studentId } = req.params;
    const user = (req as any).user;

    // Authorization: student can only view own, parent needs link, staff can view all
    if (user.role === "STUDENT" && user.id !== studentId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (user.role === "PARENT") {
      const { assertParentLinked } = await import("../lib/identityClient");
      const ok = await assertParentLinked(user.id, studentId);
      if (!ok) return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const schoolId = user.schoolId;
      const data = await getGradeSheetData(examId, studentId, schoolId);
      const templateId = resolveGradeSheetTemplateKey(
        (await prisma.school.findUnique({ where: { id: schoolId }, select: { gradeSheetTemplate: true } }))?.gradeSheetTemplate
      );
      const templateDef = getGradeSheetTemplateDef(templateId);

      const html = getGradeSheetHTML(templateId, data, { name: data.schoolName }, data.legends, data.signatures, { title: data.examTitle, startDate: data.examDate });

      const pdfBuffer = await generatePDF({
        html,
        format: templateDef.pageSize === "legal" ? "Legal" : "A4",
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
        printBackground: true,
      });

      const filename = `${data.studentName.replace(/\s+/g, "_")}_GradeSheet_${data.examTitle.replace(/\s+/g, "_")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("[pdf] Grade sheet PDF generation failed:", err);
      res.status(500).json({ error: err.message || "Failed to generate PDF" });
    }
  },

  async generateReportCardPDF(req: Request, res: Response) {
    const { examId, studentId } = req.params;
    const user = (req as any).user;

    // Similar authorization as grade sheet
    if (user.role === "STUDENT" && user.id !== studentId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (user.role === "PARENT") {
      const { assertParentLinked } = await import("../lib/identityClient");
      const ok = await assertParentLinked(user.id, studentId);
      if (!ok) return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const schoolId = user.schoolId;
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      if (!school) throw new Error("School not found");

      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (!exam) throw new Error("Exam not found");

      const student = await prisma.user.findUnique({ where: { id: studentId } });
      if (!student) throw new Error("Student not found");

      const templateId = school.reportCardTemplate || "TEMPLATE_1";

      // For report cards, we use the existing client-side template approach
      // but render it server-side. This is a simplified version.
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${student.name} - Report Card</title>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .school-name { font-size: 24px; font-weight: bold; }
    .exam-title { font-size: 18px; margin-top: 5px; }
    .student-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #f0f0f0; }
    @page { margin: 20mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${school.name}</div>
    <div class="exam-title">Report Card - ${exam.title}</div>
  </div>
  <div class="student-info">
    <div><strong>Student:</strong> ${student.name}</div>
    <div><strong>Exam:</strong> ${exam.title}</div>
    <div><strong>Date:</strong> ${new Date(exam.startDate).toLocaleDateString()}</div>
  </div>
  <p>Report Card PDF generation - Server-side rendering</p>
</body>
</html>
      `;

      const pdfBuffer = await generatePDF({
        html,
        format: "A4",
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
        printBackground: true,
      });

      const filename = `${student.name.replace(/\s+/g, "_")}_ReportCard_${exam.title.replace(/\s+/g, "_")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("[pdf] Report card PDF generation failed:", err);
      res.status(500).json({ error: err.message || "Failed to generate PDF" });
    }
  },

  async generateBulkGradeSheetPDF(req: Request, res: Response) {
    const { examId, classId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const schoolId = user.schoolId;

      // Get all students in the class
      const classroom = await prisma.classroom.findUnique({ where: { id: classId } });
      if (!classroom) throw new Error("Classroom not found");

      const members = await prisma.classroomMember.findMany({
        where: { classroomId: classId, role: "STUDENT" },
        include: { user: true },
      });

      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (!exam) throw new Error("Exam not found");

      // For bulk, we'd typically generate a ZIP file with multiple PDFs
      // For now, return a simple response
      res.json({
        message: "Bulk PDF generation would create a ZIP with individual grade sheets",
        count: members.length,
        examTitle: exam.title,
        className: classroom.name,
      });
    } catch (err: any) {
      console.error("[pdf] Bulk grade sheet PDF failed:", err);
      res.status(500).json({ error: err.message || "Failed to generate bulk PDFs" });
    }
  },
};