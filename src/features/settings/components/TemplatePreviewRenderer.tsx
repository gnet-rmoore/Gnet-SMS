import React from "react";
import {
  assembleReportCardPayload,
  getReportCardTemplateDef,
  InternationalReportCard,
  iprepProgressVariant,
  IprepProgressReport,
  IprepSemesterBifold,
  IprepSemesterBooklet,
  isIprepReportCardTemplate,
  isIprepSemesterBifoldTemplate,
  isIprepSemesterTemplate,
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
import {
  resolveDocumentSignatory,
  type DocumentSignatories,
  type StaffSignatureRef,
} from "../../../lib/documentSignatories";
import { getTranscriptTemplateOption } from "../../transcripts/api";
import {
  SAMPLE_TRANSCRIPT_RECORDS,
  TranscriptPreview,
} from "../../transcripts/components/TranscriptPreview";

export type TemplatePreviewSchool = {
  id?: string | null;
  name?: string | null;
  address?: string | null;
  poBox?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  country?: string | null;
  county?: string | null;
  district?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  branding?: string | null;
  motto?: string | null;
  crestInitials?: string | null;
};

export type TemplatePreviewCalendar = {
  name?: string | null;
  periods?: Array<{
    label?: string | null;
    shortCode?: string | null;
    periodNumber?: number | null;
    startDate?: string | null;
    endDate?: string | null;
  }> | null;
} | null;

export type TemplatePreviewOptions = {
  school?: TemplatePreviewSchool | null;
  calendar?: TemplatePreviewCalendar;
  documentSignatories?: DocumentSignatories | null;
  staff?: StaffSignatureRef[] | null;
  logoUrl?: string | null;
  brandColor?: string | null;
};

export type TemplatePreviewProps = {
  templateId: string;
  type?: "GRADE" | "REPORT" | "TRANSCRIPT" | "CERT";
  schoolName?: string;
  address?: string;
  opts?: TemplatePreviewOptions;
};

type Identity = {
  id?: string;
  name: string;
  address: string;
  poBox: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  country: string | null;
  county: string | null;
  district: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  branding: string | null;
  motto: string | null;
  crestInitials: string;
  contact: string;
  location: string;
};

type Academic = {
  yearLabel: string;
  periodLabel: string;
  examTitle: string;
  termLabel: string;
  issueDate: string;
  nowIso: string;
  periods: Array<{ label: string; shortCode: string; orderIndex: number }>;
};

type Signatures = {
  principal: { name: string | null; signatureUrl: string | null };
  registrar: { name: string | null; signatureUrl: string | null };
  academic: { name: string | null; signatureUrl: string | null };
  vpi: { name: string | null; signatureUrl: string | null };
  vpa: { name: string | null; signatureUrl: string | null };
};

const PREVIEW_STUDENT = {
  id: "PREVIEW-0001",
  name: "Sample Learner",
  sex: "—",
  classLabel: "Grade 10 · A",
  gradeLevelLabel: "Grade 10",
  section: "A",
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
  conditionedSubjects: "None",
  remarks: "Promoted on the basis of sustained work and satisfactory attendance.",
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

function clean(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function yearFromDate(value: unknown): number | null {
  const match = clean(value).match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function schoolIdentity(
  fallbackName: string,
  fallbackAddress: string,
  opts?: TemplatePreviewOptions
): Identity {
  const source = opts?.school;
  const name = clean(source?.name) || clean(fallbackName) || "Current School";
  const address = clean(source?.address) || clean(fallbackAddress);
  const contactPhone = clean(source?.contactPhone);
  const contactEmail = clean(source?.contactEmail);
  const district = clean(source?.district);
  const county = clean(source?.county);
  const country = clean(source?.country);
  return {
    id: clean(source?.id) || undefined,
    name,
    address,
    poBox: clean(source?.poBox) || null,
    contactPhone: contactPhone || null,
    contactEmail: contactEmail || null,
    country: country || null,
    county: county || null,
    district: district || null,
    logoUrl: source?.logoUrl ?? opts?.logoUrl ?? null,
    brandColor: source?.brandColor ?? opts?.brandColor ?? null,
    branding: clean(source?.branding) || null,
    motto: clean(source?.motto) || null,
    crestInitials: clean(source?.crestInitials) || initialsFor(name),
    contact: [contactPhone, contactEmail].filter(Boolean).join(" · "),
    location: [district, county, country].filter(Boolean).join(", "),
  };
}

function academicContext(calendar?: TemplatePreviewCalendar): Academic {
  const now = new Date();
  const rawPeriods = calendar?.periods || [];
  const periods = rawPeriods
    .map((period, index) => ({
      label: clean(period.label) || `Period ${index + 1}`,
      shortCode: clean(period.shortCode) || `P${index + 1}`,
      orderIndex: period.periodNumber ?? index,
    }))
    .filter((period) => period.label || period.shortCode);
  const startYear =
    yearFromDate(rawPeriods.find((period) => yearFromDate(period.startDate) != null)?.startDate) ??
    now.getFullYear();
  const endYear =
    yearFromDate(
      [...rawPeriods].reverse().find((period) => yearFromDate(period.endDate) != null)?.endDate
    ) ?? startYear + 1;
  const yearLabel = startYear === endYear ? String(startYear) : `${startYear} - ${endYear}`;
  const periodLabel = periods[0]?.label || "Current Term";
  return {
    yearLabel,
    periodLabel,
    examTitle: periods[0] ? `${periods[0].label} Examination` : `${yearLabel} Examination`,
    termLabel: `${periodLabel} — ${yearLabel}`,
    issueDate: now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    nowIso: now.toISOString(),
    periods,
  };
}

function previewSignatures(opts?: TemplatePreviewOptions): Signatures {
  const resolve = (slot: "principal" | "registrar" | "vpi" | "vpa") => {
    const signature = resolveDocumentSignatory(slot, opts?.documentSignatories, opts?.staff);
    return { name: signature.name || null, signatureUrl: signature.signatureUrl };
  };
  const academic = resolve("vpi");
  return {
    principal: resolve("principal"),
    registrar: resolve("registrar"),
    academic,
    vpi: academic,
    vpa: resolve("vpa"),
  };
}

function previewHeader(label: string, basis?: string | null) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-3 self-start">
      {label}
      {basis ? ` · ${basis}` : ""}
    </p>
  );
}

function reportCardSchool(school: Identity) {
  return {
    id: school.id,
    name: school.name,
    address: school.address,
    poBox: school.poBox,
    logoUrl: school.logoUrl,
    brandColor: school.brandColor,
    branding: school.branding,
    motto: school.motto,
    country: school.country,
    county: school.county,
    district: school.district,
    contactPhone: school.contactPhone,
    contactEmail: school.contactEmail,
  };
}

/** Render grade-sheet / report-card / certificate template previews. */
export function renderTemplatePreview({
  templateId,
  type = "GRADE",
  schoolName = "",
  address = "",
  opts,
}: TemplatePreviewProps) {
  const school = schoolIdentity(schoolName, address, opts);
  const academic = academicContext(opts?.calendar);
  const signatures = previewSignatures(opts);

  if (type === "CERT") {
    const key = resolveCertificateTemplateKey(templateId);
    const def = getCertificateTemplateDef(key);
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        {previewHeader(`Letter landscape · 11 × 8.5 in · ${def.name}`)}
        <CertificateView
          templateId={key}
          data={sampleCertificateData(school.name, {
            address: school.address,
            logoUrl: school.logoUrl,
            brandColor: school.brandColor,
          })}
          compact
        />
      </div>
    );
  }

  if (type === "TRANSCRIPT") {
    const transcriptDef = getTranscriptTemplateOption(templateId);
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        {previewHeader(`A4 · 210 × 297 mm · ${transcriptDef.key}`, "Transcript")}
        <TranscriptPreview
          templateKey={transcriptDef.key}
          schoolName={school.name}
          address={[school.address, school.location].filter(Boolean).join(" · ")}
          logoUrl={school.logoUrl}
          studentName={PREVIEW_STUDENT.name}
          studentId={PREVIEW_STUDENT.id}
          gradeLevel={PREVIEW_STUDENT.gradeLevelLabel}
          academicYear={academic.yearLabel}
          records={SAMPLE_TRANSCRIPT_RECORDS}
          honors="Good standing"
          preparedBy={signatures.registrar.name || "Registrar"}
          reviewedBy={signatures.principal.name || "Principal"}
        />
      </div>
    );
  }

  if (type === "REPORT" && isIprepReportCardTemplate(templateId)) {
    const semester = isIprepSemesterTemplate(templateId);
    const bifold = isIprepSemesterBifoldTemplate(templateId);
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
        classroom: { name: PREVIEW_STUDENT.classLabel },
      }))
    );
    const payload = assembleReportCardPayload({
      templateKey: templateId,
      school: reportCardSchool(school),
      student: {
        id: PREVIEW_STUDENT.id,
        name: PREVIEW_STUDENT.name,
        sex: PREVIEW_STUDENT.sex,
        classLabel: PREVIEW_STUDENT.classLabel,
        gradeLevelLabel: PREVIEW_STUDENT.gradeLevelLabel,
      },
      academicYearLabel: academic.yearLabel,
      grades: mockGrades,
    });
    payload.aggregates.classPosition = "1 of 32";
    payload.aggregates.attendanceRate = 96;
    payload.assessments = PREVIEW_ASSESSMENTS;
    payload.promotion = {
      ...PREVIEW_PROMOTION,
      toGrade: semester ? "11" : "3",
      finalizedAt: academic.nowIso,
    };
    payload.officialSignatures = signatures;
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        {previewHeader(
          bifold
            ? "A4 landscape · 297 × 210 mm · bi-fold"
            : "A4 · 210 × 297 mm · actual print size",
          basis
        )}
        {bifold ? (
          <IprepSemesterBifold payload={payload} preview />
        ) : semester ? (
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
        classroom: { name: PREVIEW_STUDENT.classLabel },
      }))
    );
    const payload = assembleReportCardPayload({
      templateKey: templateId,
      school: reportCardSchool(school),
      student: {
        id: PREVIEW_STUDENT.id,
        name: PREVIEW_STUDENT.name,
        sex: PREVIEW_STUDENT.sex,
        classLabel: PREVIEW_STUDENT.classLabel,
        gradeLevelLabel: PREVIEW_STUDENT.gradeLevelLabel,
      },
      academicYearLabel: academic.yearLabel,
      grades: mockGrades,
    });
    payload.aggregates.classPosition = "4 of 38";
    payload.aggregates.attendanceRate = 94;
    payload.promotion = {
      ...PREVIEW_PROMOTION,
      toGrade: "11",
      finalizedAt: academic.nowIso,
    };
    payload.officialSignatures = signatures;
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        {previewHeader("A4 · 210 × 297 mm · actual print size", basis)}
        <LiberianReportCardBooklet payload={payload} preview />
      </div>
    );
  }

  if (type === "REPORT") {
    const basis = getReportCardTemplateDef(templateId).basisLabel;
    const periods = academic.periods.length
      ? academic.periods
      : ["Q1", "Q2", "Q3", "Q4"].map((shortCode, index) => ({
          label: `Term ${index + 1}`,
          shortCode,
          orderIndex: index,
        }));
    const periodKeys = periods.map((period) => period.shortCode);
    const calendarPeriods = periods.map((period) => ({
      label: period.label,
      shortCode: period.shortCode,
      orderIndex: period.orderIndex,
    }));
    const intlGrades = WISTERIA_SUBJECTS.flatMap((subject, subjectIndex) =>
      periodKeys.map((key, periodIndex) => ({
        id: `${subject.id}-${key}`,
        score: WISTERIA_SCORES[subject.id][periodIndex],
        status: "RELEASED",
        subject: { id: subject.id, name: subject.name, code: subject.code },
        examComponent: { shortCode: key, label: key },
        classroom: { name: PREVIEW_STUDENT.classLabel },
      }))
    );
    const attendanceDays = {
      total: periodKeys.length * 45,
      present: periodKeys.length * 43,
      absent: periodKeys.length * 2,
      byPeriod: Object.fromEntries(
        periodKeys.map((key) => [key, { total: 45, present: 43, absent: 2 }])
      ),
    };
    return (
      <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
        {previewHeader("A4 · 210 × 297 mm · actual print size", basis)}
        <InternationalReportCard
          templateKey={templateId}
          studentName={PREVIEW_STUDENT.name}
          examTitle={academic.examTitle}
          examDate={academic.nowIso}
          grades={intlGrades}
          school={{
            name: school.name,
            address: school.address,
            brandColor: school.brandColor || (templateId === "INTL_WISTERIA_GREEN" ? "#0f766e" : undefined),
            logoUrl: school.logoUrl,
            contactPhone: school.contactPhone,
            contactEmail: school.contactEmail,
          }}
          academicYearLabel={academic.yearLabel}
          calendarPeriods={calendarPeriods}
          attendanceDays={attendanceDays}
          studentId={PREVIEW_STUDENT.id}
          attendanceRate={96}
          classPosition="2 of 32"
          gpa={3.6}
          teacherComment="The learner shows strong command across the reporting periods, especially in Algebra and Computer Studies. Continued reading practice will strengthen written expression."
          officialSignatures={signatures}
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

  return (
    <div className="bg-slate-300/70 p-4 rounded-2xl inline-flex flex-col items-center min-w-min mx-auto">
      {previewHeader(sizeLabel, basis)}
      <GradeSheetView
        templateId={key}
        studentName={PREVIEW_STUDENT.name}
        examTitle={academic.examTitle}
        examDate={academic.nowIso}
        grades={[]}
        school={{ name: school.name, address: school.address }}
        compact
        data={sampleGradeSheetData(school.name, school.address, {
          school: {
            address: school.address,
            contact: school.contact,
            phone: school.contactPhone,
            email: school.contactEmail,
            motto: school.motto,
            crestInitials: school.crestInitials,
            logoUrl: school.logoUrl,
          },
          term: {
            label: academic.termLabel,
            periodLabel: academic.periodLabel,
            examName: academic.examTitle,
            issueDate: academic.issueDate,
            academicYear: academic.yearLabel,
            schoolYear: academic.yearLabel,
          },
          student: {
            name: PREVIEW_STUDENT.name,
            id: PREVIEW_STUDENT.id,
            admissionNo: PREVIEW_STUDENT.id,
            classLabel: PREVIEW_STUDENT.classLabel,
            gradeLevel: PREVIEW_STUDENT.gradeLevelLabel,
            section: PREVIEW_STUDENT.section,
          },
          signatures: {
            teacher: { name: null },
            principal: signatures.principal,
          },
          issuedOn: academic.issueDate,
        })}
      />
    </div>
  );
}
