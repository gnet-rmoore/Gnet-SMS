/**
 * Client-side CSV / Excel (.xlsx) parsers for bulk roster import.
 * Server remains authoritative for validation.
 */

function parseCsvText(text: string): Record<string, unknown>[] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, unknown> = {};
    let any = false;
    headers.forEach((h, idx) => {
      const v = (cells[idx] ?? "").trim();
      if (v) any = true;
      row[h] = v;
    });
    if (any) rows.push(row);
  }
  return rows;
}

/** Minimal RFC4180-ish splitter (quoted fields, escaped quotes). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function excelSerialToIso(n: number): string {
  // Excel epoch 1899-12-30
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return String(n);
  return d.toISOString().slice(0, 10);
}

function cellToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "number") {
    // Likely Excel date serial if in a plausible range
    if (v > 20000 && v < 80000 && Number.isFinite(v)) {
      return excelSerialToIso(v);
    }
    return String(v);
  }
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

async function parseXlsx(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
  if (!aoa.length) return [];
  const headers = (aoa[0] || []).map((h) => cellToString(h));
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const line = aoa[i] || [];
    const row: Record<string, unknown> = {};
    let any = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const v = cellToString(line[idx]);
      if (v) any = true;
      row[h] = v;
    });
    if (any) rows.push(row);
  }
  return rows;
}

export async function parseRosterFile(file: File): Promise<{
  rows: Record<string, unknown>[];
  sourceFileName: string;
}> {
  const name = file.name || "upload";
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    return { rows: parseCsvText(text), sourceFileName: name };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    return { rows: await parseXlsx(buffer), sourceFileName: name };
  }
  throw new Error("Use a .csv or .xlsx file");
}

export function credentialsToCsv(
  created: Array<{ name?: string; email: string; role?: string; temporaryPassword: string }>
): string {
  const header = "name,email,role,temporaryPassword";
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = created.map((r) =>
    [r.name || "", r.email, r.role || "", r.temporaryPassword].map(escape).join(",")
  );
  return [header, ...lines].join("\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
