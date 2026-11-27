import prisma from "../../lib/prisma";
import {
  getIdentitySchool,
  getIdentityUser,
  getSchoolLocality,
  type IdentityUserRef,
} from "../../lib/identityClient";
import {
  IPREP_PROGRESS_CLASSIC,
  isIprepReportCardTemplate,
  isIprepSemesterTemplate,
  resolveReportCardTemplateKey,
} from "./registry";
import type {
  ReportCardColumn,
  ReportCardPayload,
  ReportCardSignature,
  ReportCardSubject,
} from "./types";
import {
  canonicalSubjectName,
  parseGradeLabel,
  reportGradeLabel,
} from "../../../../../src/features/academics-shared/gradeSubjectLabels";

type ScaleLike = {
  minScore: number;
  maxScore: number;
  gradeLetter: string;
  gpaPoints?: number | null;
  remark?: string | null;
};

type LegendLike = { category?: string | null; scales: ScaleLike[] };

const IPREP_LEGEND: ScaleLike[] = [
  { minScore: 95, maxScore: 100, gradeLetter: "A+", gpaPoints: 4, remark: "Academic Excellence" },
  { minScore: 90, maxScore: 94, gradeLetter: "A", gpaPoints: 3.5, remark: "Exceptional Performance" },
  { minScore: 85, maxScore: 89, gradeLetter: "B+", gpaPoints: 3, remark: "Excellent Performance" },
  { minScore: 80, maxScore: 84, gradeLetter: "B-", gpaPoints: 2.5, remark: "Great Performance" },
  { minScore: 75, maxScore: 79, gradeLetter: "C", gpaPoints: 2, remark: "Satisfactorily / Average Performance" },
  { minScore: 70, maxScore: 74, gradeLetter: "D", gpaPoints: 1.5, remark: "Below Average Performance" },
  { minScore: 60, maxScore: 69, gradeLetter: "F", gpaPoints: 1, remark: "Failed (Needs Serious Improvement)" },
];

const TERM_COLUMNS: ReportCardColumn[] = [
  { key: "T1", label: "Term 1" },
  { key: "T2", label: "Term 2" },
  { key: "T3", label: "Term 3 (Final)" },
];

const SEMESTER_COLUMNS: ReportCardColumn[] = [
  { key: "SEM1_P1", label: "1st Period", roman: "I" },
  { key: "SEM1_P2", label: "2nd Period", roman: "II" },
  { key: "SEM1_P3", label: "3rd Period", roman: "III" },
  { key: "SEM1_EX", label: "Sem 1 Exam" },
  { key: "SEM2_P4", label: "4th Period", roman: "IV" },
  { key: "SEM2_P5", label: "5th Period", roman: "V" },
  { key: "SEM2_P6", label: "6th Period", roman: "VI" },
  { key: "SEM2_EX", label: "Sem 2 Exam" },
];

const SEM1_KEYS = ["SEM1_P1", "SEM1_P2", "SEM1_P3", "SEM1_EX"];
const SEM2_KEYS = ["SEM2_P4", "SEM2_P5", "SEM2_P6", "SEM2_EX"];

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function pickScales(legends: LegendLike[]): ScaleLike[] {
  if (!Array.isArray(legends) || legends.length === 0) return IPREP_LEGEND;
  const preferred = legends.find((legend) => (legend.category || "CLASS") === "CLASS") || legends[0];
  return preferred?.scales?.length ? preferred.scales : IPREP_LEGEND;
}

function normalizeCode(value?: string | null): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function matchTerm(codeOrLabel?: string | null): string | null {
  const raw = normalizeCode(codeOrLabel);
  if (!raw) return null;
  const aliases: Record<string, string[]> = {
    T1: ["T1", "TERM1", "FIRSTTERM", "Q1", "QUARTER1", "P1", "MID", "SEM1P1", "SEM1P2"],
    T2: ["T2", "TERM2", "SECONDTERM", "Q2", "QUARTER2", "P2", "SEM1P3", "SEM2P4"],
    T3: ["T3", "TERM3", "THIRDTERM", "FINAL", "FIN", "Q3", "QUARTER3", "P3", "SEM1EX", "SEM2EX", "EXAM"],
  };
  for (const [key, values] of Object.entries(aliases)) {
    if (values.some((alias) => raw === alias || raw.includes(alias))) return key;
  }
  if (raw === "1" || raw === "FIRST") return "T1";
  if (raw === "2" || raw === "SECOND") return "T2";
  if (raw === "3" || raw === "THIRD") return "T3";
  return null;
}

function matchSemester(codeOrLabel?: string | null): string | null {
  const raw = normalizeCode(codeOrLabel);
  const aliases: Record<string, string[]> = {
    SEM1_P1: ["SEM1P1", "FIRSTPERIOD", "P1"],
    SEM1_P2: ["SEM1P2", "SECONDPERIOD", "P2"],
    SEM1_P3: ["SEM1P3", "THIRDPERIOD", "P3"],
    SEM1_EX: ["SEM1EX", "FIRSTSEMESTEREXAMS", "S1EX"],
    SEM2_P4: ["SEM2P4", "FOURTHPERIOD", "P4"],
    SEM2_P5: ["SEM2P5", "FIFTHPERIOD", "P5"],
    SEM2_P6: ["SEM2P6", "SIXTHPERIOD", "P6"],
    SEM2_EX: ["SEM2EX", "SECONDSEMESTEREXAMS", "S2EX"],
  };
  for (const [key, values] of Object.entries(aliases)) {
    if (values.some((alias) => raw === alias || raw.includes(alias))) return key;
  }
  return null;
}

function letterFor(score: number, scales: ScaleLike[]): string {
  const scale = [...scales].sort((a, b) => b.minScore - a.minScore).find((row) => score >= row.minScore && score <= row.maxScore);
  return scale?.gradeLetter || "—";
}

function yearLabel(date: Date | string | null | undefined): string {
  const value = date ? new Date(date) : new Date();
  const year = value.getFullYear();
  return value.getMonth() >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function dataImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return /^data:image\//i.test(url) ? url : null;
}

function signatureSlot(value: unknown): ReportCardSignature | null {
  if (!value || typeof value !== "object") return null;
  const slot = value as Record<string, unknown>;
  const signatureUrl = dataImageUrl(slot.signatureUrl ?? slot.url ?? slot.signature);
  const name = slot.name == null ? null : String(slot.name);
  if (!signatureUrl && !name) return null;
  return { name, signatureUrl };
}

function slotUserId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const userId = (value as Record<string, unknown>).userId;
  return typeof userId === "string" && userId.trim() ? userId.trim() : null;
}

function signatureFromUser(user: IdentityUserRef | undefined): ReportCardSignature | null {
  if (!user) return null;
  return {
    name: user.name || null,
    signatureUrl: dataImageUrl(user.signatureUrl),
  };
}

async function resolveSignatories(
  raw?: string | null
): Promise<ReportCardPayload["officialSignatures"]> {
  if (!raw) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const roleMap: Record<string, keyof NonNullable<ReportCardPayload["officialSignatures"]>> = {
    principal: "principal",
    registrar: "registrar",
    vpi: "academic",
    vpa: "vpa",
  };
  const ids: string[] = [];
  for (const [role, value] of Object.entries(parsed)) {
    const userId = slotUserId(value);
    if (roleMap[role.trim().toLowerCase()] && userId) ids.push(userId);
  }
  const users = new Map<string, IdentityUserRef>();
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      const user = await getIdentityUser(id);
      if (user) users.set(id, user);
    })
  );

  const slots: NonNullable<ReportCardPayload["officialSignatures"]> = {};
  for (const [role, target] of Object.entries(roleMap)) {
    const value = parsed[role] ?? parsed[role.toUpperCase()];
    const userId = slotUserId(value);
    const resolved = signatureFromUser(userId ? users.get(userId) : undefined) ?? signatureSlot(value);
    if (resolved) slots[target] = resolved;
  }
  if (!slots.academic && slots.principal) slots.academic = slots.principal;
  return Object.keys(slots).length ? slots : null;
}

export async function buildReportCardContext(
  examId: string,
  studentId: string,
  schoolId: string
): Promise<ReportCardPayload> {
  const [exam, student, school] = await Promise.all([
    prisma.exam.findUnique({ where: { id: examId } }),
    prisma.user.findUnique({ where: { id: studentId } }),
    prisma.school.findUnique({ where: { id: schoolId } }),
  ]);
  if (!exam) throw new Error("Exam not found");
  if (!student) throw new Error("Student not found");
  if (!school) throw new Error("School not found");

  const templateKey = resolveReportCardTemplateKey(school.reportCardTemplate);
  const semester = isIprepSemesterTemplate(templateKey);
  const useIprep = isIprepReportCardTemplate(templateKey);
  const columns = semester ? SEMESTER_COLUMNS : TERM_COLUMNS;

  const [locality, identitySchool, gradeEntries, gradeLegends, officialSignatures] = await Promise.all([
    getSchoolLocality(schoolId),
    getIdentitySchool(schoolId),
    prisma.gradeEntry.findMany({
      where: {
        studentId,
        schoolId,
        status: { in: ["RELEASED", "ACCEPTED"] },
        ...(useIprep ? {} : { examId }),
      },
      include: { subject: true, examComponent: true, classroom: true },
      orderBy: [{ subject: { name: "asc" } }],
    }),
    prisma.gradeLegend.findMany({
      where: { schoolId },
      include: { scales: true },
      orderBy: [{ category: "asc" }],
    }),
    resolveSignatories(school.documentSignatories),
  ]);

  const scales = pickScales(gradeLegends);
  const legendRows = [...scales]
    .sort((a, b) => b.minScore - a.minScore)
    .map((scale) => ({
      letter: scale.gradeLetter,
      min: scale.minScore,
      max: scale.maxScore,
      detail: scale.remark || undefined,
      gpa: scale.gpaPoints ?? undefined,
    }));

  const bySubject = new Map<string, ReportCardSubject>();
  for (const grade of gradeEntries) {
    const id = grade.subjectId || grade.subject?.id || grade.id;
    if (!bySubject.has(id)) {
      bySubject.set(id, {
        subjectId: id,
        name: canonicalSubjectName(grade.subject?.name) || "Subject",
        code: grade.subject?.code || "",
        cells: Object.fromEntries(columns.map((column) => [column.key, { score: null, letter: null }])),
        sem1Avg: null,
        sem2Avg: null,
        yearlyAvg: null,
        average: null,
        letter: null,
        remark: null,
      });
    }
    const row = bySubject.get(id)!;
    const key = semester
      ? matchSemester(grade.examComponent?.shortCode) || matchSemester(grade.examComponent?.label)
      : matchTerm(grade.examComponent?.shortCode) || matchTerm(grade.examComponent?.label);
    const columnKey = key || columns.find((column) => row.cells[column.key]?.score == null)?.key;
    if (!columnKey || !row.cells[columnKey]) continue;
    const incomplete = Boolean((grade as { isIncomplete?: boolean }).isIncomplete);
    row.cells[columnKey] = {
      score: grade.score,
      letter: incomplete ? "INC" : grade.score == null ? null : letterFor(grade.score, scales),
      incomplete,
    };
  }

  const subjects = Array.from(bySubject.values()).map((row) => {
    const scores = Object.values(row.cells)
      .map((cell) => cell.score)
      .filter((score): score is number => typeof score === "number");
    const sem1 = avg(
      SEM1_KEYS.map((key) => row.cells[key]?.score).filter((score): score is number => typeof score === "number")
    );
    const sem2 = avg(
      SEM2_KEYS.map((key) => row.cells[key]?.score).filter((score): score is number => typeof score === "number")
    );
    const average = avg(scores);
    const scale = average == null ? null : [...scales]
      .sort((a, b) => b.minScore - a.minScore)
      .find((entry) => average >= entry.minScore && average <= entry.maxScore);
    return {
      ...row,
      sem1Avg: sem1,
      sem2Avg: sem2,
      yearlyAvg: sem1 != null && sem2 != null ? avg([sem1, sem2]) : null,
      average,
      letter: scale?.gradeLetter || null,
      remark: scale?.remark || null,
    };
  });

  const overallAverage = avg(
    subjects
      .map((subject) => (semester ? subject.yearlyAvg ?? subject.average : subject.average))
      .filter((score): score is number => score != null)
  );
  const gpaScale = overallAverage == null ? null : [...scales]
    .sort((a, b) => b.minScore - a.minScore)
    .find((entry) => overallAverage >= entry.minScore && overallAverage <= entry.maxScore);
  const classLabel = gradeEntries.find((grade) => grade.classroom?.name)?.classroom?.name || "";
  const gradeLevelLabel = parseGradeLabel(classLabel).isGradeLike
    ? reportGradeLabel(null, classLabel)
    : "";

  return {
    school: {
      name: school.name,
      address: school.address,
      logoUrl: school.logoUrl,
      brandColor: school.brandColor,
      branding: locality?.country === "Liberia" || school.country === "Liberia" ? "MOE" : "SCHOOL_LOGO",
      country: locality?.country ?? school.country ?? null,
      county: locality?.region ?? identitySchool?.region ?? null,
      district: identitySchool?.city ?? null,
      poBox: null,
      contactPhone: school.contactPhone,
      contactEmail: school.contactEmail,
    },
    student: {
      id: student.id,
      name: student.name,
      sex: null,
      classLabel,
      gradeLevelLabel,
    },
    academicYear: { id: "CURRENT", label: yearLabel(exam.startDate) },
    columns,
    subjects,
    legend: legendRows,
    aggregates: {
      overallAverage,
      gpa: gpaScale?.gpaPoints ?? null,
      classPosition: null,
      attendanceRate: null,
    },
    assessments: null,
    promotion: null,
    templateKey: templateKey || IPREP_PROGRESS_CLASSIC,
    generatedAt: new Date().toISOString(),
    officialSignatures,
  };
}
