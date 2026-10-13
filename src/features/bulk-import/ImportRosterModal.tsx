import React from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
} from "../academics-shared/FeatureModalShell";
import { confirmAction } from "../../lib/swal";
import {
  credentialsToCsv,
  downloadTextFile,
  parseRosterFile,
} from "./parseSpreadsheet";
import { translateApiError } from "../../i18n/apiErrors";

export type BulkImportPreview = {
  ok: boolean;
  rowCount: number;
  validCount: number;
  errorCount: number;
  warnings?: string[];
  rows: Array<{
    index: number;
    ok: boolean;
    errors: string[];
    normalized?: Record<string, unknown>;
  }>;
};

export type BulkImportCreated = {
  id: string;
  name: string;
  email: string;
  role: string;
  temporaryPassword: string;
};

type Props = {
  kind: "student" | "staff";
  open: boolean;
  onClose: () => void;
  onDownloadTemplate: () => Promise<void> | void;
  onPreview: (rows: Record<string, unknown>[], sourceFileName: string) => Promise<BulkImportPreview>;
  onImport: (
    rows: Record<string, unknown>[],
    sourceFileName: string
  ) => Promise<{ ok: boolean; createdCount: number; created: BulkImportCreated[] }>;
  onImported?: () => void;
};

type Step = "upload" | "preview" | "done";

export function ImportRosterModal({
  kind,
  open,
  onClose,
  onDownloadTemplate,
  onPreview,
  onImport,
  onImported,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [step, setStep] = React.useState<Step>("upload");
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [preview, setPreview] = React.useState<BulkImportPreview | null>(null);
  const [created, setCreated] = React.useState<BulkImportCreated[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName("");
      setRows([]);
      setPreview(null);
      setCreated([]);
      setBusy(false);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const title =
    kind === "student" ? t("pages:bulkImport.titleStudents") : t("pages:bulkImport.titleStaff");

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const parsed = await parseRosterFile(file);
      if (!parsed.rows.length) {
        setError(t("pages:bulkImport.noRows"));
        setBusy(false);
        return;
      }
      setFileName(parsed.sourceFileName);
      setRows(parsed.rows);
      const prev = await onPreview(parsed.rows, parsed.sourceFileName);
      setPreview(prev);
      setStep("preview");
    } catch (err: any) {
      setError(translateApiError(err) || err?.message || t("common:errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!preview?.ok || !rows.length) return;
    const ok = await confirmAction({
      title: t("pages:bulkImport.confirmTitle", {
        count: preview.validCount,
        kind: kind === "student" ? t("pages:students.title") : t("pages:staff.titleDirectory"),
      }),
      text: t("pages:bulkImport.confirmText"),
      confirmText: t("common:import"),
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const result = await onImport(rows, fileName);
      setCreated(result.created || []);
      setStep("done");
      onImported?.();
    } catch (err: any) {
      if (err?.preview) {
        setPreview(err.preview);
        setError(t("pages:bulkImport.fixErrors"));
        setStep("preview");
      } else {
        setError(translateApiError(err) || err?.message || t("common:errorGeneric"));
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadCreds = () => {
    downloadTextFile(
      `${kind}-credentials-${new Date().toISOString().slice(0, 10)}.csv`,
      credentialsToCsv(created)
    );
  };

  return (
    <AnimatePresence>
      <FeatureModalShell
        title={title}
        subtitle={t("pages:bulkImport.subtitle")}
        eyebrow={t("pages:bulkImport.eyebrow")}
        onClose={onClose}
        wide
        footer={
          step === "preview" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                {preview?.validCount ?? 0} {t("pages:bulkImport.valid")} ·{" "}
                {preview?.errorCount ?? 0} {t("pages:bulkImport.error")}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setStep("upload");
                    setPreview(null);
                    setRows([]);
                    setFileName("");
                    setError("");
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
                  disabled={busy}
                >
                  {t("common:back")}
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={busy || !preview?.ok}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50"
                >
                  {busy
                    ? t("pages:bulkImport.importing")
                    : t("pages:bulkImport.importN", { count: preview?.validCount ?? 0 })}
                </button>
              </div>
            </div>
          ) : step === "done" ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={downloadCreds}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t("pages:bulkImport.downloadCredentials")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
              >
                {t("common:done")}
              </button>
            </div>
          ) : null
        }
      >
        <div className="p-6 sm:p-8 space-y-6">
          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {step === "upload" && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => onDownloadTemplate()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  {t("pages:bulkImport.downloadTemplate")}
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors px-6 py-12 text-center"
              >
                <FileSpreadsheet className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                <p className="text-base font-extrabold tracking-tight text-slate-900">
                  {busy ? t("pages:bulkImport.reading") : t("pages:bulkImport.chooseFile")}
                </p>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {t("pages:bulkImport.chooseFileHint")}
                </p>
                <span className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                  <Upload className="w-4 h-4" />
                  {t("pages:bulkImport.browse")}
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
            </>
          )}

          {step === "preview" && preview && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-500">
                File <span className="font-mono text-slate-800">{fileName}</span> ·{" "}
                {preview.rowCount} rows
              </p>
              {preview.warnings?.length ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600 space-y-1">
                  {preview.warnings.slice(0, 5).map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </div>
              ) : null}
              <div className="rounded-2xl border border-slate-100 overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm min-w-[28rem]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">{t("common:status")}</th>
                      <th className="px-4 py-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr
                        key={r.index}
                        className={`border-t border-slate-100 ${
                          r.ok ? "bg-white" : "bg-rose-50/60"
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono text-slate-600">{r.index + 1}</td>
                        <td className="px-4 py-2.5 font-bold">
                          {r.ok ? (
                            <span className="text-emerald-700">{t("pages:bulkImport.valid")}</span>
                          ) : (
                            <span className="text-rose-700">{t("pages:bulkImport.error")}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">
                          {r.ok
                            ? [
                                r.normalized?.name,
                                r.normalized?.email,
                                r.normalized?.role || r.normalized?.gradeLevelId,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : r.errors.join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!preview.ok ? (
                <p className="text-sm font-medium text-rose-700">
                  {t("pages:bulkImport.fixErrors")}
                </p>
              ) : null}
            </div>
          )}

          {step === "done" && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-lg font-extrabold tracking-tight text-slate-900">
                {kind === "student"
                  ? t("pages:bulkImport.importedStudents", { count: created.length })
                  : t("pages:bulkImport.importedStaff", { count: created.length })}
              </p>
              <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
                {t("pages:bulkImport.credentialsHint")}
              </p>
            </div>
          )}
        </div>
      </FeatureModalShell>
    </AnimatePresence>
  );
}
