/**
 * Lightweight AND/OR group for power users (Phase 5).
 * Encoded as URL params: logic=AND|OR and clauses as c0=field:op:value …
 */
export type FilterClause = {
  field: string;
  op: "eq" | "contains" | "gte" | "lte";
  value: string;
};

export type FilterLogicGroup = {
  logic: "AND" | "OR";
  clauses: FilterClause[];
};

export function encodeFilterLogic(group: FilterLogicGroup): Record<string, string> {
  const out: Record<string, string> = { logic: group.logic };
  group.clauses.forEach((c, i) => {
    if (!c.field || !c.value) return;
    out[`c${i}`] = `${c.field}:${c.op}:${c.value}`;
  });
  return out;
}

export function parseFilterLogic(params: URLSearchParams | Record<string, string>): FilterLogicGroup {
  const get = (k: string) =>
    params instanceof URLSearchParams ? params.get(k) : (params as any)[k];
  const logic = get("logic") === "OR" ? "OR" : "AND";
  const clauses: FilterClause[] = [];
  for (let i = 0; i < 8; i++) {
    const raw = get(`c${i}`);
    if (!raw) continue;
    const [field, op, ...rest] = String(raw).split(":");
    const value = rest.join(":");
    if (!field || !value) continue;
    const safeOp = op === "contains" || op === "gte" || op === "lte" ? op : "eq";
    clauses.push({ field, op: safeOp, value });
  }
  return { logic, clauses };
}

/** Client-side evaluate for small lists (e.g. logs already fetched). */
export function matchFilterLogic(
  row: Record<string, unknown>,
  group: FilterLogicGroup
): boolean {
  if (!group.clauses.length) return true;
  const results = group.clauses.map((c) => {
    const cell = String(row[c.field] ?? "").toLowerCase();
    const v = c.value.toLowerCase();
    if (c.op === "contains") return cell.includes(v);
    if (c.op === "gte") return cell >= v;
    if (c.op === "lte") return cell <= v;
    return cell === v;
  });
  return group.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
}
