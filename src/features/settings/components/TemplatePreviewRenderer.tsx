import React from "react";
import {
  assembleReportCardPayload,
  InternationalReportCard,
  isLiberianReportCardTemplate,
  LiberianReportCardBooklet,
} from "../../report-cards";
import {
  getGradeSheetTemplateDef,
  GradeSheetView,
  resolveGradeSheetTemplateKey,
  sampleGradeSheetData,
} from "../../gradesheets";
import {
  CertificateView,
  getCertificateTemplateDef,
  resolveCertificateTemplateKey,
  sampleCertificateData,
} from "../../certificates";

export type TemplatePreviewProps = {
  templateId: string;
  type?: "GRADE" | "REPORT" | "CERT";
  schoolName?: string;
  address?: string;
  logoUrl?: string | null;
  brandColor?: string | null;
};

/** Render grade-sheet / report-card / certificate template previews. */
export function renderTemplatePreview(
  templateId: string,
  type: "GRADE" | "REPORT" | "CERT" = "GRADE",
  schoolName = "",
  address = "",
  opts?: { logoUrl?: string | null; brandColor?: string | null }
) {
  if (type === "CERT") {
    const key = resolveCertificateTemplateKey(templateId);
    const def = getCertificateTemplateDef(key);
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-3 self-start">
          Letter landscape · 11 × 8.5 in · {def.name}
        </p>
        <CertificateView
          templateId={key}
          data={sampleCertificateData(schoolName, {
            address,
            logoUrl: opts?.logoUrl,
            brandColor: opts?.brandColor,
          })}
          compact
        />
      </div>
    );
  }

  if (type === "REPORT" && isLiberianReportCardTemplate(templateId)) {
    const subjects = [
      { id: "m", name: "Mathematics", code: "MATH" },
      { id: "e", name: "English", code: "ENG" },
      { id: "b", name: "Bible", code: "BIB" },
      { id: "s", name: "G. Science", code: "SCI" },
    ] as const;
    const periodScores: Record<string, number[]> = {
      m: [88, 76, 82, 80, 85, 70, 78, 75],
      e: [75, 86, 70, 60, 77, 78, 70, 70],
      b: [80, 85, 79, 70, 80, 60, 70, 70],
      s: [70, 96, 75, 80, 81, 80, 86, 86],
    };
    const colKeys = [
      "SEM1_P1",
      "SEM1_P2",
      "SEM1_P3",
      "SEM1_EX",
      "SEM2_P4",
      "SEM2_P5",
      "SEM2_P6",
      "SEM2_EX",
    ] as const;
    const mockGrades = subjects.flatMap((sub, si) =>
      colKeys.map((key, ki) => ({
        id: `${si}-${ki}`,
        score: periodScores[sub.id][ki],
        subject: { id: sub.id, name: sub.name, code: sub.code },
        examComponent: { shortCode: key, label: key },
      }))
    );
    const payload = assembleReportCardPayload({
      templateKey: templateId,
      school: {
        name: schoolName || "Sample Liberian School",
        address: address || "Monrovia, Republic of Liberia",
      },
      student: {
        id: "preview",
        name: "Sample Student",
        classLabel: "10A",
        gradeLevelLabel: "Grade 10",
      },
      academicYearLabel: "2025 - 2026",
      grades: mockGrades,
    });
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-3 self-start">
          A4 · 210 × 297 mm · actual print size
        </p>
        <LiberianReportCardBooklet payload={payload} preview />
      </div>
    );
  }

  if (type === "REPORT") {
    const isWisteria =
      templateId === "INTL_WISTERIA_GREEN" || templateId === "INTL_WISTERIA_NAVY";
    const mockData = isWisteria
      ? [
          { sub: "Physical Sciences", tot: 88, q: "Q1" },
          { sub: "Algebra", tot: 76, q: "Q1" },
          { sub: "Language", tot: 91, q: "Q1" },
          { sub: "English Literature", tot: 69, q: "Q2" },
          { sub: "History", tot: 82, q: "Q2" },
          { sub: "Writing and Composition", tot: 74, q: "Q2" },
          { sub: "Music", tot: 85, q: "Q3" },
          { sub: "Arts", tot: 79, q: "Q3" },
          { sub: "Physical Education", tot: 90, q: "Q3" },
          { sub: "Computer Science", tot: 94, q: "Q4" },
          { sub: "Geography", tot: 71, q: "Q4" },
          { sub: "Biology", tot: 83, q: "Q1" },
          { sub: "Chemistry", tot: 77, q: "Q2" },
          { sub: "French", tot: 68, q: "Q3" },
          { sub: "Literature", tot: 80, q: "Q4" },
          { sub: "Religious Education", tot: 86, q: "Q1" },
          { sub: "Agriculture", tot: 72, q: "Q2" },
        ]
      : [
          { sub: "Mathematics", tot: 86, q: "Q1" },
          { sub: "English Language", tot: 78, q: "Q1" },
          { sub: "Physics", tot: 93, q: "Q1" },
          { sub: "Chemistry", tot: 77, q: "Q1" },
          { sub: "Biology", tot: 85, q: "Q1" },
        ];
    const intlGrades = mockData.map((item, i) => ({
      id: String(i + 1),
      score: item.tot,
      status: "RELEASED",
      subject: {
        id: `s${i}`,
        name: item.sub,
        code: item.sub.slice(0, 3).toUpperCase(),
      },
      classroom: { name: "Grade 10 — Section A" },
      examComponent: isWisteria ? { shortCode: item.q } : undefined,
    }));
    const previewPeriods = isWisteria
      ? [
          { label: "Fall", shortCode: "Q1", orderIndex: 0 },
          { label: "Winter", shortCode: "Q2", orderIndex: 1 },
          { label: "Spring", shortCode: "Q3", orderIndex: 2 },
          { label: "Summer", shortCode: "Q4", orderIndex: 3 },
        ]
      : null;
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-3 self-start">
          A4 · 210 × 297 mm · actual print size
        </p>
        <InternationalReportCard
          templateKey={templateId}
          studentName="Sample Student"
          examTitle={isWisteria ? "2nd Grading Period" : "Term 1 Assessment"}
          examDate={new Date().toISOString()}
          grades={intlGrades}
          school={{
            name: schoolName || "International Academy",
            address: address || "Global Campus",
            brandColor: isWisteria ? "#0f766e" : undefined,
          }}
          academicYearLabel="2025 - 2026"
          calendarPeriods={previewPeriods}
          studentId="STU-001"
          attendanceRate={isWisteria ? 94 : null}
          teacherComment="Consistent effort across core subjects with clear progress in analytical work."
          preview
        />
      </div>
    );
  }

  const key = resolveGradeSheetTemplateKey(templateId);
  const def = getGradeSheetTemplateDef(key);
  const sizeLabel =
    def.pageSize === "legal"
      ? "Legal · 8.5 × 14 in · actual print size"
      : "A4 · 210 × 297 mm · actual print size";

  return (
    <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-3 self-start">
        {sizeLabel}
      </p>
      <GradeSheetView
        templateId={key}
        studentName="Sample Student"
        examTitle="End-of-Term Examination"
        examDate={new Date().toISOString()}
        grades={[]}
        school={{ name: schoolName, address }}
        compact
        data={sampleGradeSheetData(schoolName, address)}
      />
    </div>
  );
}
