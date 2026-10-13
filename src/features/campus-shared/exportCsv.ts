/** Download a CSV file in the browser from header + row data. */
export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const all = [headers, ...rows];
  const csv =
    "data:text/csv;charset=utf-8," +
    all
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
  const link = document.createElement("a");
  link.href = encodeURI(csv);
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
