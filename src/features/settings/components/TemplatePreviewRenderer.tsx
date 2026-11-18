import React from "react";
import {
  assembleReportCardPayload,
  getReportCardTemplateDef,
  InternationalReportCard,
  iprepProgressVariant,
  IprepProgressReport,
  IprepSemesterBooklet,
  isIprepReportCardTemplate,
  isIprepSemesterBookletTemplate,
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

const PREVIEW_SIGNATURES = {
  principal: { name: "Dr. Hannah G. Brown" },
  registrar: { name: "Mrs. Grace Z. Williams" },
  academic: { name: "Mrs. Louise K. Harris" },
  vpi: { name: "Mrs. Louise K. Harris" },
  vpa: { name: "Mr. Jonathan P. Smith" },
};

const PREVIEW_ASSESSMENTS = {
  conduct: {
    "Is a good listener": "4",
    "Is kind and helpful": "4",
    "Shares with others": "3",
    "Shows respect to others": "4",
    "Expresses ideas clearly verbally": "3",
    "Expresses ideas in drawing": "3",
    "Unexcused Absence": "0",
    "Day(s) Late": "1",
  },
  attitude: {
    "Tidy / properly dressed": "4",
    "Obeys rules and regulations": "4",
    "Shows appropriate manners": "4",
    Responsible: "3",
    "Kindness / Sharing": "4",
    Tardiness: "3",
  },
  progress: {
    "Demonstrates understanding and application at grade-level": "4",
    "Engages in classroom activities": "4",
    "Completes and turns in assignments within expected timeframe": "3",
    "Listens attentively and follows instructions clearly": "4",
    "Demonstrates a positive attitude towards learning": "4",
    "Shows enthusiasm and willingness to engage": "3",
    "Consistency, effort, and attitude towards learning": "3",
    "Demonstrates good communication skills": "4",
    "Behavior in classroom (disruptive)": "4",
  },
};

const PREVIEW_PROMOTION = {
  outcome: "PROMOTED",
  toGrade: "3",
  conditionedSubjects: "None",
  remarks: "Promoted on the basis of sustained work and satisfactory attendance.",
  finalizedAt: "2026-06-28T09:00:00.000Z",
};

const IPREP_SUBJECTS = [
  { id: "m", name: "Mathematics", code: "MTH" },
  { id: "e", name: "English Language", code: "ENG" },
  { id: "s", name: "Integrated Science", code: "SCI" },
  { id: "h", name: "Social Studies", code: "SST" },
  { id: "r", name: "Religious Education", code: "REL" },
  { id: "f", name: "French", code: "FRN" },
  { id: "c", name: "Creative Arts", code: "CRT" },
  { id: "p", name: "Physical Education", code: "PED" },
] as const;

const IPREP_TERM_SCORES: Record<string, number[]> = {
  m: [94, 91, 96],
  e: [88, 92, 90],
  s: [86, 89, 92],
  h: [82, 85, 88],
  r: [95, 93, 94],
  f: [78, 82, 85],
  c: [90, 92, 91],
  p: [92, 94, 93],
};

const IPREP_SEMESTER_SCORES: Record<string, number[]> = {
  m: [92, 88, 94, 95, 91, 96, 93, 94],
  e: [86, 90, 88, 91, 89, 92, 94, 93],
  s: [84, 88, 91, 89, 90, 93, 92, 95],
  h: [80, 84, 86, 88, 85, 89, 90, 91],
  r: [94, 92, 95, 93, 96, 94, 95, 96],
  f: [76, 80, 83, 85, 82, 86, 88, 87],
  c: [89, 91, 90, 93, 92, 94, 93, 95],
  p: [91, 93, 92, 94, 93, 95, 94, 96],
};

const WISTERIA_SUBJECTS = [
  { id: "m", name: "Algebra I", code: "MTH" },
  { id: "e", name: "English Language", code: "ENG" },
  { id: "s", name: "Physical Science", code: "SCI" },
  { id: "h", name: "World History", code: "HIS" },
  { id: "f", name: "French", code: "FRN" },
  { id: "c", name: "Visual Arts", code: "ART" },
  { id: "p", name: "Physical Education", code: "PED" },
  { id: "t", name: "Computer Studies", code: "ICT" },
] as const;

const WISTERIA_SCORES: Record<string, number[]> = {
  m: [94, 91, 96, 93],
  e: [88, 92, 90, 94],
  s: [86, 89, 92, 90],
  h: [82, 85, 88, 91],
  f: [78, 82, 85, 87],
  c: [90, 92, 91, 94],
  p: [92, 94, 93, 95],
  t: [89, 87, 92, 94],
};

function previewHeader(label: string, basis?: string | null) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-3 self-start">
      {label}
      {basis ? ` · ${basis}` : ""}
    </p>
  );
}

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
        {previewHeader(`Letter landscape · 11 × 8.5 in · ${def.name}`)}
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

  if (type === "REPORT" && isIprepReportCardTemplate(templateId)) {
    const semester = isIprepSemesterBookletTemplate(templateId);
    const basis = getReportCardTemplateDef(templateId).basisLabel;
    const columnKeys = semester
      ? ["SEM1_P1", "SEM1_P2", "SEM1_P3", "SEM1_EX", "SEM2_P4", "SEM2_P5", "SEM2_P6", "SEM2_EX"]
      : ["T1", "T2", "T3"];
    const scoresBySubject = semester ? IPREP_SEMESTER_SCORES : IPREP_TERM_SCORES;
    const mockGrades = IPREP_SUBJECTS.flatMap((subject, subjectIndex) =>
      columnKeys.map((key, columnIndex) => ({
        id: `${subject.id}-${key}`,
        score: scoresBySubject[subject.id][columnIndex],
        status: "RELEASED",
        subject: { id: subject.id, name: subject.name, code: subject.code },
        examComponent: { shortCode: key, label: key },
        classroom: { name: semester ? "Grade 10 · B" : "Grade 2 · A" },
      }))
    );
    const payload = assembleReportCardPayload({
      templateKey: templateId,
      school: {
        name: schoolName || "Innovation Preparatory International Academy — IPREP",
        address: address || "Education For The Future · Monrovia, Liberia",
        logoUrl: opts?.logoUrl || null,
        brandColor: opts?.brandColor || null,
        country: "Liberia",
        county: "Montserrado",
        district: "Monrovia",
        poBox: "P.O. Box 10-1234",
        contactPhone: "+231 77 000 0142",
        contactEmail: "records@iprep.edu.lr",
      },
      student: {
        id: "IPREP-2025-0142",
        name: semester ? "Grace K. Johnson" : "Mbumen Aelys-Shadya",
        sex: "Female",
        classLabel: semester ? "Grade 10 · B" : "Grade 2 · A",
        gradeLevelLabel: semester ? "Grade 10" : "Grade 2",
      },
      academicYearLabel: "2025 - 2026",
      grades: mockGrades,
    });
    payload.aggregates.classPosition = "1 of 32";
    payload.aggregates.attendanceRate = 96;
    payload.assessments = PREVIEW_ASSESSMENTS;
    payload.promotion = {
      ...PREVIEW_PROMOTION,
      toGrade: semester ? "11" : "3",
    };
    payload.officialSignatures = PREVIEW_SIGNATURES;
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        {previewHeader("A4 · 210 × 297 mm · actual print size", basis)}
        {semester ? (
          <IprepSemesterBooklet payload={payload} preview />
        ) : (
          <IprepProgressReport
            payload={payload}
            variant={iprepProgressVariant(templateId)}
            preview
          />
        )}
      </div>
    );
  }

  if (type === "REPORT" && isLiberianReportCardTemplate(templateId)) {
    const basis = getReportCardTemplateDef(templateId).basisLabel;
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
        status: "RELEASED",
        subject: { id: sub.id, name: sub.name, code: sub.code },
        examComponent: { shortCode: key, label: key },
        classroom: { name: "Grade 10 · A" },
      }))
    );
    const payload = assembleReportCardPayload({
      templateKey: templateId,
      school: {
        name: schoolName || "Sample Liberian School",
        address: address || "Monrovia, Republic of Liberia",
        logoUrl: opts?.logoUrl || null,
        brandColor: opts?.brandColor || null,
        country: "Liberia",
        county: "Montserrado",
        district: "Monrovia",
        poBox: "P.O. Box 2048",
      },
      student: {
        id: "LIB-2025-0088",
        name: "Grace K. Johnson",
        sex: "Female",
        classLabel: "Grade 10 · A",
        gradeLevelLabel: "Grade 10",
      },
      academicYearLabel: "2025 - 2026",
      grades: mockGrades,
    });
    payload.aggregates.classPosition = "4 of 38";
    payload.aggregates.attendanceRate = 94;
    payload.promotion = { ...PREVIEW_PROMOTION, toGrade: "11" };
    payload.officialSignatures = PREVIEW_SIGNATURES;
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        {previewHeader("A4 · 210 × 297 mm · actual print size", basis)}
        <LiberianReportCardBooklet payload={payload} preview />
      </div>
    );
  }

  if (type === "REPORT") {
    const basis = getReportCardTemplateDef(templateId).basisLabel;
    const periodKeys = ["Q1", "Q2", "Q3", "Q4"];
    const intlGrades = WISTERIA_SUBJECTS.flatMap((subject, subjectIndex) =>
      periodKeys.map((key, periodIndex) => ({
        id: `${subject.id}-${key}`,
        score: WISTERIA_SCORES[subject.id][periodIndex],
        status: "RELEASED",
        subject: { id: subject.id, name: subject.name, code: subject.code },
        examComponent: { shortCode: key, label: key },
        classroom: { name: "Grade 10 · Section A" },
      }))
    );
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        {previewHeader("A4 · 210 × 297 mm · actual print size", basis)}
        <InternationalReportCard
          templateKey={templateId}
          studentName="Mbumen Aelys-Shadya"
          examTitle="Academic Year 2025 - 2026"
          examDate="2026-06-28T09:00:00.000Z"
          grades={intlGrades}
          school={{
            name: schoolName || "International Preparatory Academy",
            address: address || "Global Campus · Monrovia, Liberia",
            brandColor: opts?.brandColor || (templateId === "INTL_WISTERIA_GREEN" ? "#0f766e" : undefined),
            logoUrl: opts?.logoUrl || null,
          }}
          academicYearLabel="2025 - 2026"
          calendarPeriods={[
            { label: "Term 1", shortCode: "Q1", orderIndex: 0 },
            { label: "Term 2", shortCode: "Q2", orderIndex: 1 },
            { label: "Term 3", shortCode: "Q3", orderIndex: 2 },
            { label: "Term 4", shortCode: "Q4", orderIndex: 3 },
          ]}
          attendanceDays={{
            total: 180,
            present: 172,
            absent: 8,
            byPeriod: {
              Q1: { total: 45, present: 43, absent: 2 },
              Q2: { total: 45, present: 44, absent: 1 },
              Q3: { total: 45, present: 42, absent: 3 },
              Q4: { total: 45, present: 43, absent: 2 },
            },
          }}
          studentId="STU-2025-0142"
          attendanceRate={96}
          classPosition="2 of 32"
          gpa={3.6}
          teacherComment="Mbumen shows strong command across the four terms, especially in Algebra and Computer Studies. Continued reading practice will strengthen written expression in the final term."
          officialSignatures={PREVIEW_SIGNATURES}
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
  const basis =
    key === "INTL_STANDARD_TERM" || key === "INTL_EXECUTIVE"
      ? "Term-based · single term"
      : null;
  const schoolLabel = schoolName || "Innovation Preparatory International Academy — IPREP";
  const addressLabel = address || "Education For The Future · Monrovia, Liberia";

  return (
    <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
      {previewHeader(sizeLabel, basis)}
      <GradeSheetView
        templateId={key}
        studentName="Grace K. Johnson"
        examTitle="First Term Examination"
        examDate="2026-11-16T09:00:00.000Z"
        grades={[]}
        school={{ name: schoolLabel, address: addressLabel }}
        compact
        data={sampleGradeSheetData(schoolLabel, addressLabel)}
      />
    </div>
  );
}
