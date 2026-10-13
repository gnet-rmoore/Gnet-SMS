import { format } from "date-fns";
import { parseGradebookConfig } from "../../lib/gradebookConfig";
import {
  computeAssessmentTotal,
  parseAssessmentStructure,
  resolveEffectiveAssessmentStructure,
  type AssessmentStructureColumn,
} from "../../lib/assessmentStructure";
import {
  letterFromScore,
  scaleFromScore,
  type GradeLegendLike,
} from "../../lib/gradeLegend";
import type { GradeSheetData, GradeSheetSubject } from "./types";

export type AssembleGradeEntry = {
  score: number | null | undefined;
  structureColumnId?: string | null;
  subject: { name: string; code: string };
  classroom?: { name?: string } | null;
  exam?: { title?: string; startDate?: string } | null;
  examComponent?: {
    shortCode?: string | null;
    componentType?: string | null;
    label?: string | null;
    gradebookStructure?: string | null;
    gradebookStructureCustom?: boolean | null;
  } | null;
};

export type AssembleGradeSheetInput = {
  studentName: string;
  examTitle: string;
  examDate: string;
  grades: AssembleGradeEntry[];
  school: {
    name?: string | null;
    address?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    logoUrl?: string | null;
    gradebookConfig?: string | null;
  } | null;
  gradeLegends?: GradeLegendLike[] | null;
  admissionNo?: string | null;
  classLabel?: string | null;
  section?: string | null;
  dob?: string | null;
  guardian?: string | null;
  academicYearLabel?: string | null;
  attendancePresent?: number | null;
  attendanceTotal?: number | null;
  classPosition?: string | null;
  gpa?: number | null;
  teacherComment?: string | null;
  principalComment?: string | null;
  conduct?: string | null;
  promotionStatus?: string | null;
  nextTermStart?: string | null;
  signatures?: GradeSheetData["signatures"];
};

const CA_CODES = new Set([
  "CA",
  "CW",
  "HW",
  "QZ",
  "QUIZ",
  "CLASSWORK",
  "HOMEWORK",
  "ASSIGNMENT",
  "CLASS",
]);
const EXAM_CODES = new Set([
  "FIN",
  "EX",
  "EXAM",
  "FINAL",
  "MID",
  "MIDTERM",
  "SEM1_EX",
  "SEM2_EX",
]);

function crestFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function dash(v: string | null | undefined): string {
  const t = (v || "").trim();
  return t || "—";
}

function formatIssueDate(iso: string): string {
  try {
    return format(new Date(iso), "dd MMM yyyy");
  } catch {
    return dash(iso);
  }
}

function isCaCode(code: string): boolean {
  const c = code.toUpperCase();
  return CA_CODES.has(c) || c.includes("CA") || c.includes("CW") || c.includes("HW");
}

function isExamCode(code: string): boolean {
  const c = code.toUpperCase();
  return EXAM_CODES.has(c) || c.includes("EXAM") || c.includes("FIN") || c.includes("MID");
}

function resolveStructureForComponent(
  comp: AssembleGradeEntry["examComponent"],
  schoolConfigRaw: string | null | undefined
): AssessmentStructureColumn[] {
  return resolveEffectiveAssessmentStructure({
    componentStructureRaw: comp?.gradebookStructure,
    schoolGradebookConfigRaw: schoolConfigRaw,
    structureCustom: Boolean(comp?.gradebookStructureCustom),
  }).columns;
}

type SubjectAcc = {
  name: string;
  code: string;
  classroomName: string;
  byComp: Record<string, number[]>;
  structureScores: Record<string, Record<string, number[]>>;
};

/**
 * Map released grade rows + school/assessment structure into print template data.
 */
export function assembleGradeSheetData(input: AssembleGradeSheetInput): GradeSheetData {
  const schoolName = input.school?.name?.trim() || "School";
  const schoolConfigRaw = input.school?.gradebookConfig;
  const templateColumns = parseGradebookConfig(schoolConfigRaw)
    .categories.filter((c) => c.isActive !== false)
    .map((c) => ({
      code: (c.code || c.shortCode || "").toUpperCase(),
      weightPct: c.weightPct,
    }));

  const map = new Map<string, SubjectAcc>();

  for (const g of input.grades) {
    const code = g.subject?.code || g.subject?.name || "UNK";
    if (!map.has(code)) {
      map.set(code, {
        name: g.subject?.name || code,
        code,
        classroomName: g.classroom?.name || "",
        byComp: {},
        structureScores: {},
      });
    }
    const row = map.get(code)!;

    if (
      g.structureColumnId &&
      g.examComponent &&
      typeof g.score === "number" &&
      !Number.isNaN(g.score)
    ) {
      const compKey = g.examComponent.shortCode || g.examComponent.label || "ASSESS";
      if (!row.structureScores[compKey]) row.structureScores[compKey] = {};
      const colId = g.structureColumnId;
      if (!row.structureScores[compKey][colId]) row.structureScores[compKey][colId] = [];
      row.structureScores[compKey][colId].push(g.score);
      continue;
    }

    const comp =
      (g.examComponent?.shortCode || g.examComponent?.componentType || "FIN").toUpperCase();
    if (!row.byComp[comp]) row.byComp[comp] = [];
    if (typeof g.score === "number" && !Number.isNaN(g.score)) {
      row.byComp[comp].push(g.score);
    }
  }

  const subjects: GradeSheetSubject[] = [];
  let obtainedSum = 0;
  let maxSum = 0;
  let gpaPointsSum = 0;
  let gpaCount = 0;

  for (const acc of map.values()) {
    let obtained = 0;
    let hasStructureRollup = false;

    for (const [compKey, colScores] of Object.entries(acc.structureScores)) {
      const sampleGrade = input.grades.find(
        (g) =>
          (g.examComponent?.shortCode || g.examComponent?.label) === compKey &&
          g.subject?.code === acc.code
      );
      const structure = resolveStructureForComponent(
        sampleGrade?.examComponent,
        schoolConfigRaw
      );
      const scores: Record<string, number | null> = {};
      for (const col of structure) {
        const vals = colScores[col.id];
        scores[col.id] = vals?.length ? avg(vals) : null;
      }
      const total = computeAssessmentTotal(scores, structure);
      if (total != null) {
        obtained = total;
        hasStructureRollup = true;
        break;
      }
    }

    if (!hasStructureRollup) {
      let weightedSum = 0;
      let weightTotal = 0;
      const allScores = Object.values(acc.byComp).flat();

      if (templateColumns.length > 0) {
        for (const col of templateColumns) {
          const scores = acc.byComp[col.code];
          if (scores?.length) {
            const a = scores.reduce((s, v) => s + v, 0) / scores.length;
            weightedSum += a * (col.weightPct / 100);
            weightTotal += col.weightPct / 100;
          }
        }
      }

      obtained =
        weightTotal > 0
          ? Math.round((weightedSum / weightTotal) * 10) / 10
          : avg(allScores) ?? 0;
    }

    const caScores: number[] = [];
    const examScores: number[] = [];
    for (const [comp, scores] of Object.entries(acc.byComp)) {
      if (isExamCode(comp)) examScores.push(...scores);
      else if (isCaCode(comp)) caScores.push(...scores);
    }
    for (const colScores of Object.values(acc.structureScores)) {
      for (const [colId, scores] of Object.entries(colScores)) {
        const code = colId.toUpperCase();
        if (isExamCode(code)) examScores.push(...scores);
        else caScores.push(...scores);
      }
    }
    const caAvg = avg(caScores);
    const examAvg = avg(examScores);

    const letter = letterFromScore(obtained, input.gradeLegends);
    const scale = scaleFromScore(obtained, input.gradeLegends);
    if (typeof scale?.gpaPoints === "number") {
      gpaPointsSum += scale.gpaPoints;
      gpaCount++;
    }

    subjects.push({
      name: acc.name,
      max: 100,
      obtained,
      classAvg: null,
      grade: letter,
      remark: scale?.remark?.trim() || "",
      ca: caAvg,
      exam: examAvg,
    });
    obtainedSum += obtained;
    maxSum += 100;
  }

  const percentage =
    subjects.length > 0
      ? Math.round((obtainedSum / subjects.length) * 10) / 10
      : null;
  const overallGrade =
    percentage != null ? letterFromScore(percentage, input.gradeLegends) : "—";

  const present = input.attendancePresent ?? null;
  const total = input.attendanceTotal ?? null;
  const absent =
    present != null && total != null && total >= present ? total - present : null;
  const attPct =
    present != null && total != null && total > 0
      ? Math.round((present / total) * 1000) / 10
      : null;

  const contactParts = [
    input.school?.contactPhone,
    input.school?.contactEmail,
  ].filter(Boolean);

  const classFromGrades =
    input.classLabel ||
    [...map.values()].find((m) => m.classroomName)?.classroomName ||
    "";

  const issueIso = input.examDate || new Date().toISOString();
  let yearLabel = input.academicYearLabel?.trim() || "";
  if (!yearLabel) {
    try {
      yearLabel = String(new Date(issueIso).getFullYear());
    } catch {
      yearLabel = "";
    }
  }

  const computedGpa =
    input.gpa != null
      ? input.gpa
      : gpaCount > 0
        ? Math.round((gpaPointsSum / gpaCount) * 10) / 10
        : null;

  return {
    school: {
      name: schoolName,
      address: dash(input.school?.address),
      contact: contactParts.join(" · ") || "—",
      crestInitials: crestFromName(schoolName),
      logoUrl: input.school?.logoUrl,
    },
    term: {
      label: yearLabel
        ? `${input.examTitle || "Examination"} · ${yearLabel}`
        : input.examTitle || "Examination",
      examName: input.examTitle || "Examination",
      issueDate: formatIssueDate(issueIso),
      nextTermStart: dash(input.nextTermStart),
      academicYear: yearLabel || "—",
    },
    student: {
      name: input.studentName || "—",
      admissionNo: dash(input.admissionNo),
      classLabel: dash(classFromGrades),
      section: dash(input.section),
      dob: dash(input.dob),
      guardian: dash(input.guardian),
    },
    subjects,
    summary: {
      maxTotal: maxSum,
      obtainedTotal: Math.round(obtainedSum * 10) / 10,
      percentage,
      gpa: computedGpa,
      overallGrade,
      rank: dash(input.classPosition),
      conduct: dash(input.conduct),
      promotionStatus: dash(input.promotionStatus),
    },
    attendance: {
      present,
      total,
      absent,
      percentage: attPct,
    },
    remarks: {
      teacher: input.teacherComment?.trim() || "",
      principal: input.principalComment?.trim() || "",
    },
    signatures: input.signatures,
  };
}

export function fmtNum(n: number | null | undefined, fallback = "—"): string {
  if (n == null || Number.isNaN(n)) return fallback;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function masteryTier(grade: string): "tier-a" | "tier-b" | "tier-c" | "tier-d" {
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "tier-a";
  if (g.startsWith("B")) return "tier-b";
  if (g.startsWith("C")) return "tier-c";
  return "tier-d";
}

export function officialGradeClass(grade: string): "grade-a" | "grade-b" | "grade-c" {
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "grade-a";
  if (g.startsWith("B")) return "grade-b";
  return "grade-c";
}

export function passFailClass(obtained: number): "pass" | "fail" {
  return obtained >= 50 ? "pass" : "fail";
}
