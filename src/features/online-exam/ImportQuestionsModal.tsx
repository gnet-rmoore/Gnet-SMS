import React from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell } from "../academics-shared/FeatureModalShell";
import { confirmAction } from "../../lib/swal";
import { translateApiError } from "../../i18n/apiErrors";
import { onlineExamApi, type QuestionImportPreview } from "./api";
import {
  downloadQuestionTemplate,
  parseQuestionSheet,
  QuestionSheetError,
} from "./parseQuestionSheet";

type Props = {
  examId: string;
  open: boolean;
  onClose: () => void;
  /** Number of questions already on the exam, used in the replace warning. */
  existingCount?: number;
  onImported?: () => void;
};

type Step = "upload" | "preview" | "done";

export function ImportQuestionsModal({ examId, open, onClose, existingCount = 0, onImported }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [step, setStep] = React.useState<Step>("upload");
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [preview, setPreview] = React.useState<QuestionImportPreview | null>(null);
  const [importedCount, setImportedCount] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName("");
      setRows([]);
      setPreview(null);
      setImportedCount(0);
      setBusy(false);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const resetToUpload = () => {
    setStep("upload");
    setPreview(null);
    setRows([]);
    setFileName("");
    setError("");
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const parsed = await parseQuestionSheet(file);
      setFileName(parsed.sourceFileName);
      setRows(parsed.rows);
      const prev = await onlineExamApi.previewQuestionImport(
        examId,
        parsed.rows,
        parsed.sourceFileName
      );
      setPreview(prev);
      setStep("preview");
    } catch (err: any) {
      if (err instanceof QuestionSheetError) {
        if (err.code === "FILE_TYPE") setError(t("pages:questionImport.fileType"));
        else if (err.code === "WRONG_SHEET") setError(t("pages:questionImport.wrongSheet"));
        else setError(t("pages:questionImport.noRows"));
      } else {
        setError(translateApiError(err) || t("common:errorGeneric"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!preview?.canImport || !rows.length) return;
    const ok = await confirmAction({
      title: t("pages:questionImport.confirmTitle", { count: preview.validCount }),
      text: t("pages:questionImport.confirmText"),
      confirmText: t("common:import"),
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await onlineExamApi.importQuestions(examId, rows, fileName);
      setImportedCount(preview.validCount);
      setStep("done");
      onImported?.();
    } catch (err: any) {
      const code = err?.code || err?.response?.data?.code;
      if (code === "IMPORT_VALIDATION") {
        try {
          const prev = await onlineExamApi.previewQuestionImport(examId, rows, fileName);
          setPreview(prev);
        } catch {
          // keep the existing preview if the refresh fails
        }
        setError(t("pages:questionImport.fixErrors"));
        setStep("preview");
      } else {
        setError(translateApiError(err) || t("common:errorGeneric"));
      }
    } finally {
      setBusy(false);
    }
  };

  const blocked = Boolean(preview?.blockers?.length);

  return (
    <AnimatePresence>
      <FeatureModalShell
        title={t("pages:questionImport.title")}
        subtitle={t("pages:questionImport.subtitle")}
        eyebrow={t("pages:questionImport.eyebrow")}
        onClose={onClose}
        wide
        footer={
          step === "preview" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                {preview?.validCount ?? 0} {t("pages:questionImport.valid")} ·{" "}
                {preview?.errorCount ?? 0} {t("pages:questionImport.error")}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
                  disabled={busy}
                >
                  {t("common:back")}
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={busy || !preview?.canImport}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {busy
                    ? t("pages:questionImport.importing")
                    : t("pages:questionImport.importN", { count: preview?.validCount ?? 0 })}
                </button>
              </div>
            </div>
          ) : step === "done" ? (
            <div className="flex justify-end">
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
              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadQuestionTemplate();
                  } catch (err: any) {
                    setError(translateApiError(err) || t("common:errorGeneric"));
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                <Download className="w-4 h-4" />
                {t("pages:questionImport.downloadTemplate")}
              </button>
              {existingCount > 0 ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 flex gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{t("pages:questionImport.replaceWarning", { count: existingCount })}</span>
                </div>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors px-6 py-12 text-center"
              >
                <FileSpreadsheet className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                <p className="text-base font-extrabold tracking-tight text-slate-900">
                  {busy ? t("pages:questionImport.reading") : t("pages:questionImport.chooseFile")}
                </p>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {t("pages:questionImport.chooseFileHint")}
                </p>
                <span className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                  <Upload className="w-4 h-4" />
                  {t("pages:questionImport.browse")}
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
              />
            </>
          )}

          {step === "preview" && preview && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-500">
                File <span className="font-mono text-slate-800">{fileName}</span> ·{" "}
                {preview.rowCount} rows
              </p>

              {preview.blockers?.length ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 space-y-1">
                  {preview.blockers.map((b) => (
                    <p key={b}>{b}</p>
                  ))}
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-100 overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm min-w-[28rem]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">{t("pages:questionImport.row")}</th>
                      <th className="px-4 py-3">{t("common:status")}</th>
                      <th className="px-4 py-3">{t("pages:questionImport.question")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr
                        key={r.index}
                        className={`border-t border-slate-100 ${r.ok ? "bg-white" : "bg-rose-50/60"}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-slate-600">{r.rowNumber}</td>
                        <td className="px-4 py-2.5 font-bold">
                          {r.ok ? (
                            <span className="text-emerald-700">
                              {t("pages:questionImport.valid")}
                            </span>
                          ) : (
                            <span className="text-rose-700">
                              {t("pages:questionImport.error")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">
                          {r.ok ? r.preview : r.errors.join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!preview.canImport ? (
                <p className="text-sm font-medium text-rose-700">
                  {blocked ? preview.blockers[0] : t("pages:questionImport.fixErrors")}
                </p>
              ) : null}
            </div>
          )}

          {step === "done" && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-lg font-extrabold tracking-tight text-slate-900">
                {t("pages:questionImport.imported", { count: importedCount })}
              </p>
            </div>
          )}
        </div>
      </FeatureModalShell>
    </AnimatePresence>
  );
}
