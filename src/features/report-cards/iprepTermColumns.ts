export const IPREP_TERM_COLUMNS = [
  { key: "T1", label: "Term 1" },
  { key: "T2", label: "Term 2" },
  { key: "T3", label: "Term 3 (Final)" },
] as const;

const TERM_ALIASES: Record<string, readonly string[]> = {
  T1: ["T1", "TERM1", "FIRSTTERM", "Q1", "QUARTER1", "P1", "MID", "SEM1P1", "SEM1P2"],
  T2: ["T2", "TERM2", "SECONDTERM", "Q2", "QUARTER2", "P2", "SEM1P3", "SEM2P4"],
  T3: ["T3", "TERM3", "THIRDTERM", "FINAL", "FIN", "Q3", "QUARTER3", "P3", "SEM1EX", "SEM2EX", "EXAM"],
};

function normalize(codeOrLabel?: string | null): string {
  return String(codeOrLabel || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

export function matchIprepTermKey(codeOrLabel?: string | null): string | null {
  const raw = normalize(codeOrLabel);
  if (!raw) return null;
  for (const [key, aliases] of Object.entries(TERM_ALIASES)) {
    if (aliases.some((alias) => raw === alias || raw.includes(alias))) return key;
  }
  if (raw === "1" || raw === "FIRST") return "T1";
  if (raw === "2" || raw === "SECOND") return "T2";
  if (raw === "3" || raw === "THIRD") return "T3";
  return null;
}

export function iprepTermLabel(key?: string | null): string {
  return IPREP_TERM_COLUMNS.find((column) => column.key === key)?.label || "—";
}
