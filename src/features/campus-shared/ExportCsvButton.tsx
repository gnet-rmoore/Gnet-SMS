import { Download } from "lucide-react";
import { Button } from "../../components/ui";
import { downloadCsv } from "./exportCsv";

type ExportCsvButtonProps = {
  filename: string;
  headers: string[];
  rows: string[][];
  disabled?: boolean;
};

export function ExportCsvButton({ filename, headers, rows, disabled }: ExportCsvButtonProps) {
  const canExport = rows.length > 0 && !disabled;
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={!canExport}
      onClick={() => downloadCsv(filename, headers, rows)}
    >
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  );
}
