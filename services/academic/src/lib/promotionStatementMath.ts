/**
 * Pure assembly helpers for school-wide Promotion Statement totals.
 * Kept free of Prisma for unit tests.
 */
import { normalizeGender, type PromotionOutcome } from "../domain/yearTransition";

export type CensusRowInput = {
  studentUserId: string;
  gradeLevelId: string | null;
  divisionId: string | null;
  classroomId: string | null;
  gender: string | null;
};

export type DecisionInput = {
  studentUserId: string;
  outcome: PromotionOutcome | string;
};

export type LabelMaps = {
  gradeName: Record<string, string>;
  divisionName: Record<string, string>;
  classroomName: Record<string, string>;
  divisionByGrade: Record<string, string | null>;
};

export type StatementCell = {
  opening: number;
  male: number;
  female: number;
  other: number;
  unknown: number;
  promoted: number;
  repeat: number;
  graduated: number;
  doNotReturn: number;
};

export type StatementClassRow = StatementCell & {
  key: string;
  gradeLevelId: string | null;
  gradeName: string;
  classroomId: string | null;
  classroomName: string;
};

export type StatementDivisionBlock = {
  divisionId: string | null;
  divisionName: string;
  totals: StatementCell;
  classes: StatementClassRow[];
};

function emptyCell(): StatementCell {
  return {
    opening: 0,
    male: 0,
    female: 0,
    other: 0,
    unknown: 0,
    promoted: 0,
    repeat: 0,
    graduated: 0,
    doNotReturn: 0,
  };
}

function bumpGender(cell: StatementCell, gender: ReturnType<typeof normalizeGender>) {
  cell.opening += 1;
  if (gender === "Male") cell.male += 1;
  else if (gender === "Female") cell.female += 1;
  else if (gender === "Other") cell.other += 1;
  else cell.unknown += 1;
}

function bumpOutcome(cell: StatementCell, outcome: string) {
  const o = String(outcome || "").toUpperCase();
  if (o === "PROMOTED") cell.promoted += 1;
  else if (o === "REPEAT") cell.repeat += 1;
  else if (o === "GRADUATED") cell.graduated += 1;
  else if (o === "DO_NOT_RETURN") cell.doNotReturn += 1;
}

function addCells(a: StatementCell, b: StatementCell): StatementCell {
  return {
    opening: a.opening + b.opening,
    male: a.male + b.male,
    female: a.female + b.female,
    other: a.other + b.other,
    unknown: a.unknown + b.unknown,
    promoted: a.promoted + b.promoted,
    repeat: a.repeat + b.repeat,
    graduated: a.graduated + b.graduated,
    doNotReturn: a.doNotReturn + b.doNotReturn,
  };
}

export function assemblePromotionStatementMatrix(
  censusRows: CensusRowInput[],
  decisions: DecisionInput[],
  labels: LabelMaps
): { school: StatementCell; divisions: StatementDivisionBlock[] } {
  const outcomeByStudent = new Map(
    decisions.map((d) => [d.studentUserId, String(d.outcome || "").toUpperCase()])
  );

  type Bucket = { cell: StatementCell; gradeLevelId: string | null; classroomId: string | null };
  const buckets = new Map<string, Bucket>();

  for (const row of censusRows) {
    const gradeLevelId = row.gradeLevelId || null;
    const classroomId = row.classroomId || null;
    const divisionId =
      row.divisionId ||
      (gradeLevelId ? labels.divisionByGrade[gradeLevelId] || null : null) ||
      null;
    const key = `${divisionId || "_"}|${gradeLevelId || "_"}|${classroomId || "_"}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { cell: emptyCell(), gradeLevelId, classroomId };
      buckets.set(key, bucket);
    }
    bumpGender(bucket.cell, normalizeGender(row.gender));
    const outcome = outcomeByStudent.get(row.studentUserId);
    if (outcome) bumpOutcome(bucket.cell, outcome);
  }

  // Decisions for students not in census (mid-year) — outcomes under Unplaced
  for (const d of decisions) {
    if (censusRows.some((r) => r.studentUserId === d.studentUserId)) continue;
    const mapKey = "_|_|_";
    let bucket = buckets.get(mapKey);
    if (!bucket) {
      bucket = { cell: emptyCell(), gradeLevelId: null, classroomId: null };
      buckets.set(mapKey, bucket);
    }
    bumpOutcome(bucket.cell, d.outcome);
  }

  const byDivision = new Map<string, StatementDivisionBlock>();

  for (const [key, bucket] of buckets) {
    const [divisionIdRaw] = key.split("|");
    const divisionId = divisionIdRaw === "_" ? null : divisionIdRaw;
    const divKey = divisionId || "_none";
    let block = byDivision.get(divKey);
    if (!block) {
      block = {
        divisionId,
        divisionName: divisionId
          ? labels.divisionName[divisionId] || "Division"
          : "Unassigned division",
        totals: emptyCell(),
        classes: [],
      };
      byDivision.set(divKey, block);
    }
    const classRow: StatementClassRow = {
      key,
      gradeLevelId: bucket.gradeLevelId,
      gradeName: bucket.gradeLevelId
        ? labels.gradeName[bucket.gradeLevelId] || "Grade"
        : "No grade",
      classroomId: bucket.classroomId,
      classroomName: bucket.classroomId
        ? labels.classroomName[bucket.classroomId] || "Class"
        : "Unplaced",
      ...bucket.cell,
    };
    block.classes.push(classRow);
    block.totals = addCells(block.totals, bucket.cell);
  }

  const divisions = [...byDivision.values()].sort((a, b) =>
    a.divisionName.localeCompare(b.divisionName)
  );
  for (const d of divisions) {
    d.classes.sort((a, b) =>
      `${a.gradeName} ${a.classroomName}`.localeCompare(`${b.gradeName} ${b.classroomName}`)
    );
  }

  const school = divisions.reduce((acc, d) => addCells(acc, d.totals), emptyCell());
  return { school, divisions };
}
