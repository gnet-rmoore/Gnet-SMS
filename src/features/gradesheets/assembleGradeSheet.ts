import { format } from "date-fns";
import { parseGradebookConfig } from "../../lib/gradebookConfig";
import {
  computeAssessmentTotal,
  resolveEffectiveAssessmentStructure,
  type AssessmentStructureColumn,
} from "../../lib/assessmentStructure";
import {
  letterFromScore,
  scaleFromScore,
  type GradeLegendLike,
} from "../../lib/gradeLegend";
import type { GradeSheetData, GradeSheetSubject, GradeSheetColumn, GradeSheetLegendBand } from "./types";
import {
  canonicalSubjectName,
  parseGradeLabel,
  reportGradeLabel,
} from "../academics-shared/gradeSubjectLabels";


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
    motto?: string | null;
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
  classSize?: number | null;
  gpa?: number | null;
  teacherComment?: string | null;
  principalComment?: string | null;
  conduct?: string | null;
  promotionStatus?: string | null;
  nextTermStart?: string | null;
  signatures?: GradeSheetData["signatures"];
};

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
  try { return format(new Date(iso), "dd MMM yyyy"); } catch { return dash(iso); }
}

function bandFor(p: number | null, legend: GradeSheetLegendBand[]): GradeSheetLegendBand | undefined {
  if (p == null) return undefined;
  return legend.find((b) => Math.round(p) >= b.min && Math.round(p) <= b.max);
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

const DEFAULT_COLUMNS: GradeSheetColumn[] = [
  { code: "CA", name: "Continuous Assessment", weightPct: 40 },
  { code: "EXAM", name: "Examination", weightPct: 60 },
];
const DEFAULT_LEGEND: GradeSheetLegendBand[] = [
  { min: 90, max: 100, letter: "A", remark: "Excellent" },
  { min: 80, max: 89, letter: "B", remark: "Very good" },
  { min: 70, max: 79, letter: "C", remark: "Good" },
  { min: 60, max: 69, letter: "D", remark: "Satisfactory" },
  { min: 0, max: 59, letter: "F", remark: "Needs improvement" },
];

type SubjectAcc = {
  name: string; code: string; classroomName: string;
  byCol: Record<string, number[]>;
  structureRollup: number | null;
};

export function assembleGradeSheetData(input: AssembleGradeSheetInput): GradeSheetData {
  const schoolName = input.school?.name?.trim() || "School";
  const schoolConfigRaw = input.school?.gradebookConfig;
  const parsedCols = parseGradebookConfig(schoolConfigRaw).categories.filter((c) => c.isActive !== false);
  const columns: GradeSheetColumn[] = parsedCols.length
    ? parsedCols.map((c) => ({ code: (c.code || c.shortCode || c.name).toUpperCase(), name: c.name, weightPct: c.weightPct }))
    : DEFAULT_COLUMNS;
  const colCodes = new Set(columns.map((c) => c.code));

  const legend: GradeSheetLegendBand[] = input.gradeLegends && input.gradeLegends.length
    ? input.gradeLegends.map((l: any) => ({ min: Number(l.minPercent ?? l.min ?? 0), max: Number(l.maxPercent ?? l.max ?? 100), letter: String(l.letter || l.grade || ""), remark: l.remark || l.description || undefined }))
    : DEFAULT_LEGEND;

  const map = new Map<string, SubjectAcc>();
  for (const g of input.grades) {
    const code = g.subject?.code || g.subject?.name || "UNK";
    if (!map.has(code)) map.set(code, { name: canonicalSubjectName(g.subject?.name) || code, code, classroomName: g.classroom?.name || "", byCol: {}, structureRollup: null });
    const row = map.get(code)!;
    if (typeof g.score !== "number" || Number.isNaN(g.score)) continue;

    // structure-based -> compute component rollup as total
    if (g.structureColumnId && g.examComponent) {
      const key = `__STRUCT__${g.examComponent.shortCode || g.examComponent.label || "ASSESS"}`;
      if (!row.byCol[key]) row.byCol[key] = [];
      row.byCol[key].push(g.score);
      // also store per-structure-column for possible detailed rollup
      const sKey = `__SC__${key}__${g.structureColumnId}`;
      if (!row.byCol[sKey]) row.byCol[sKey] = [];
      row.byCol[sKey].push(g.score);
      continue;
    }
    const comp = (g.examComponent?.shortCode || g.examComponent?.componentType || "EXAM").toUpperCase();
    const target = colCodes.has(comp) ? comp : (comp.includes("CA") || comp.includes("CW") || comp.includes("HW") || comp.includes("QZ") || comp.includes("QUIZ") ? (colCodes.has("CA") ? "CA" : comp) : (colCodes.has("EXAM") || colCodes.has("FIN") ? (colCodes.has("EXAM") ? "EXAM" : "FIN") : comp));
    const finalKey = colCodes.has(target) ? target : columns[0]?.code || comp;
    if (!row.byCol[finalKey]) row.byCol[finalKey] = [];
    row.byCol[finalKey].push(g.score);
  }

  const subjects: GradeSheetSubject[] = [];
  let obtainedSum = 0;
  let gpaPointsSum = 0, gpaCount = 0;

  for (const acc of map.values()) {
    // compute per-column averages
    const scores: Record<string, number | null> = {};
    for (const c of columns) scores[c.code] = avg(acc.byCol[c.code] || []);
    // structure rollup attempt: if we have __SC__ groups, compute assessment totals
    let structureTotal: number | null = null;
    const structGroups = Object.keys(acc.byCol).filter((k) => k.startsWith("__STRUCT__"));
    if (structGroups.length) {
      const groupKey = structGroups[0];
      const sampleGrade = input.grades.find((g) => (g.examComponent?.shortCode || g.examComponent?.label) && `__STRUCT__${g.examComponent?.shortCode || g.examComponent?.label}` === groupKey && g.subject?.code === acc.code);
      const structure = resolveStructureForComponent(sampleGrade?.examComponent, schoolConfigRaw);
      if (structure.length) {
        const sScores: Record<string, number | null> = {};
        for (const col of structure) sScores[col.id] = avg(acc.byCol[`__SC__${groupKey}__${col.id}`] || []);
        structureTotal = computeAssessmentTotal(sScores, structure);
      }
    }

    let total: number | null = structureTotal;
    if (total == null) {
      let w = 0, t = 0;
      for (const c of columns) { const x = scores[c.code]; if (x != null) { t += x * c.weightPct; w += c.weightPct; } }
      if (w > 0) total = Math.round((t / w) * 10) / 10;
      else {
        const flat = Object.entries(acc.byCol).filter(([k]) => !k.startsWith("__")).flatMap(([, v]) => v);
        total = avg(flat);
      }
    }

    const b = bandFor(total, legend);
    const letter = b?.letter ?? (total != null ? letterFromScore(total, input.gradeLegends) : null);
    const remark = b?.remark ?? (scaleFromScore(total ?? 0, input.gradeLegends)?.remark?.trim() || null);
    const scale = scaleFromScore(total ?? 0, input.gradeLegends);
    if (typeof scale?.gpaPoints === "number" && total != null) { gpaPointsSum += scale.gpaPoints; gpaCount++; }

    subjects.push({
      name: acc.name, code: acc.code, scores, total, letter, remark, position: null,
      max: 100, obtained: total ?? 0, classAvg: null, grade: letter || "—",
      ca: scores["CA"] ?? scores["CW"] ?? scores["HW"] ?? scores["QZ"] ?? scores["QUIZ"] ?? null,
      exam: scores["EXAM"] ?? scores["FIN"] ?? scores["MID"] ?? null,
    });
    if (total != null) obtainedSum += total;
  }

  const average = subjects.length ? Math.round((obtainedSum / subjects.length) * 10) / 10 : null;
  const overallBand = bandFor(average, legend);
  const overallGrade = overallBand?.letter ?? (average != null ? letterFromScore(average, input.gradeLegends) : "—");

  const present = input.attendancePresent ?? null;
  const totalDays = input.attendanceTotal ?? null;
  const absent = present != null && totalDays != null && totalDays >= present ? totalDays - present : null;
  const attPct = present != null && totalDays != null && totalDays > 0 ? Math.round((present / totalDays) * 1000) / 10 : null;

  const contactParts = [input.school?.contactPhone, input.school?.contactEmail].filter(Boolean);
  const classFromGrades = input.classLabel || [...map.values()].find((m) => m.classroomName)?.classroomName || "";
  const gradeLabelCandidate = [input.classLabel, classFromGrades].find((value) =>
    parseGradeLabel(value).isGradeLike
  );
  const gradeLevelLabel = gradeLabelCandidate
    ? reportGradeLabel(gradeLabelCandidate, classFromGrades)
    : "";
  const issueIso = input.examDate || new Date().toISOString();
  let yearLabel = input.academicYearLabel?.trim() || "";
  if (!yearLabel) { try { yearLabel = String(new Date(issueIso).getFullYear()); } catch { yearLabel = ""; } }
  const computedGpa = input.gpa != null ? input.gpa : gpaCount > 0 ? Math.round((gpaPointsSum / gpaCount) * 10) / 10 : null;
  const rankNum = input.classPosition != null && /^\d+$/.test(String(input.classPosition).trim()) ? Number(String(input.classPosition).trim()) : null;

  return {
    school: {
      name: schoolName, address: dash(input.school?.address), contact: contactParts.join(" · ") || "—",
      phone: input.school?.contactPhone || undefined, email: input.school?.contactEmail || undefined,
      motto: input.school?.motto || undefined, crestInitials: crestFromName(schoolName), logoUrl: input.school?.logoUrl,
    },
    term: {
      label: yearLabel ? `${input.examTitle || "Examination"} — ${yearLabel}` : input.examTitle || "Examination",
      periodLabel: input.examTitle || undefined, examName: input.examTitle || "Examination",
      issueDate: formatIssueDate(issueIso), nextTermStart: dash(input.nextTermStart),
      academicYear: yearLabel || "—", schoolYear: yearLabel || undefined,
    },
    student: {
      name: input.studentName || "—", id: dash(input.admissionNo), admissionNo: dash(input.admissionNo),
      classLabel: dash(classFromGrades), gradeLevel: dash(gradeLevelLabel), section: dash(input.section),
      dob: dash(input.dob), guardian: dash(input.guardian),
    },
    columns, legend, subjects,
    summary: {
      average, rank: rankNum, classSize: input.classSize ?? null, gpa: computedGpa,
      promotionStatus: input.promotionStatus?.trim() || null,
      maxTotal: subjects.length * 100, obtainedTotal: Math.round(obtainedSum * 10) / 10,
      percentage: average, overallGrade, rankLabel: dash(input.classPosition), conduct: dash(input.conduct),
    },
    attendance: (present == null && totalDays == null) ? null : { present, total: totalDays, absent, percentage: attPct },
    remarks: { educator: input.teacherComment?.trim() || null, principal: input.principalComment?.trim() || null, teacher: input.teacherComment?.trim() || "" },
    signatures: input.signatures,
    issuedOn: formatIssueDate(issueIso),
  };
}

export function fmtNum(n: number | null | undefined, fallback = "—"): string {
  if (n == null || Number.isNaN(n)) return fallback;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
export function masteryTier(grade: string): "tier-a" | "tier-b" | "tier-c" | "tier-d" {
  const g = (grade||"").toUpperCase();
  if (g.startsWith("A")) return "tier-a"; if (g.startsWith("B")) return "tier-b"; if (g.startsWith("C")) return "tier-c"; return "tier-d";
}
export function officialGradeClass(grade: string): "grade-a" | "grade-b" | "grade-c" {
  const g = (grade||"").toUpperCase(); if (g.startsWith("A")) return "grade-a"; if (g.startsWith("B")) return "grade-b"; return "grade-c";
}
export function passFailClass(obtained: number): "pass" | "fail" { return obtained >= 50 ? "pass" : "fail"; }
