import React from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { alertError, alertSuccess } from "../../../lib/swal";
import {
  FeatureModalShell,
  fieldInput,
} from "../../academics-shared/FeatureModalShell";
import { lessonPlansApi } from "../api";
import {
  LESSON_PLAN_IMPORT_LIMIT,
  LessonPlanSheetError,
  downloadLessonPlanTemplate,
  parseLessonPlanSheet,
  validateLessonPlanImportRows,
  type LessonPlanImportLookups,
  type LessonPlanImportResult,
} from "../parseLessonPlanSheet";

type Props = {
  open: boolean;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  lookups: LessonPlanImportLookups;
  onClose: () => void;
  onImported: () => Promise<unknown>;
};

export function LessonPlanImportModal({
  open,
  schoolId,
  teacherId,
  teacherName,
  lookups,
  onClose,
  onImported,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [rows, setRows] = React.useState<Record<string, unknown>[] | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const prepared = React.useMemo<LessonPlanImportResult | null>(
    () => (rows ? validateLessonPlanImportRows(rows, lookups) : null),
    [rows, lookups]
  );

  const overLimit = (prepared?.rows.length || 0) > LESSON_PLAN_IMPORT_LIMIT;
  const canSave = Boolean(
    prepared &&
      prepared.valid.length > 0 &&
      prepared.invalid.length === 0 &&
      !overLimit &&
      !saving
  );

  React.useEffect(() => {
    if (!open) {
      setRows(null);
      setFileName("");
      setError("");
      setSaving(false);
      setProgress(0);
    }
  }, [open]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setRows(null);
    setFileName(file.name);
    setError("");
    try {
      const parsed = await parseLessonPlanSheet(file);
      setRows(parsed.rows);
    } catch (err) {
      if (err instanceof LessonPlanSheetError) {
        const message = {
          FILE_TYPE: "Choose an Excel .xlsx or .xls file.",
          WRONG_SHEET: "The workbook does not contain a readable sheet.",
          NO_ROWS: "The workbook does not contain any lesson plan rows.",
        }[err.code];
        setError(message);
      } else {
        console.error("Could not parse lesson plan workbook", err);
        setError("Could not read this workbook. Please use the downloadable template.");
      }
    }
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadLessonPlanTemplate("lesson-plan-template.xlsx");
    } catch (err: any) {
      console.error("Could not download lesson plan template", err);
      await alertError("Template download failed", err?.message);
    }
  };

  const handleSave = async () => {
    if (!canSave || !prepared) return;
    setSaving(true);
    setProgress(0);
    let created = 0;
    try {
      for (const row of prepared.valid) {
        if (!row.payload) continue;
        await lessonPlansApi.create(schoolId, {
          ...row.payload,
          teacherId,
          teacherName,
        });
        created += 1;
        setProgress(created);
      }
      await alertSuccess(
        t("lessonPlans.import.success", {
          count: created,
          defaultValue: "Imported {{count}} lesson plan(s).",
        })
      );
      await onImported();
      onClose();
    } catch (err: any) {
      await alertError(
        t("lessonPlans.import.failed", {
          defaultValue: "Import failed",
        }),
        created > 0
          ? t("lessonPlans.import.partial", {
              created,
              total: prepared.valid.length,
              defaultValue:
                "Imported {{created}} of {{total}} lesson plans before an error occurred: {{message}}",
              message: err?.message || "",
            })
          : err?.message
      );
      if (created > 0) await onImported();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <FeatureModalShell
      title={t("lessonPlans.import.title", {
        defaultValue: "Import lesson plans",
      })}
      subtitle={t("lessonPlans.import.subtitle", {
        defaultValue:
          "Download the template, fill in your lesson plans, then upload the workbook. Subject, grade level and classroom names must match your school records.",
      })}
      onClose={saving ? () => undefined : onClose}
      wide
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {t("common:cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {saving
              ? t("lessonPlans.import.saving", {
                  defaultValue: "Importing {{done}} / {{total}}…",
                  done: progress,
                  total: prepared?.valid.length || 0,
                })
              : t("lessonPlans.import.save", { defaultValue: "Import" })}
          </button>
        </div>
      }
    >
      <div className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-indigo-950">
            {t("lessonPlans.import.instructions", {
              defaultValue:
                "Use the template so column names and date formats are correct. Activities use Title | minutes | description, one per line.",
            })}
          </p>
          <button
            type="button"
            onClick={handleTemplateDownload}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
          >
            <Download className="h-4 w-4" />
            {t("lessonPlans.import.downloadTemplate", {
              defaultValue: "Download template",
            })}
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            {t("lessonPlans.import.chooseFile", {
              defaultValue: "Choose workbook",
            })}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            className={`${fieldInput} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-indigo-700`}
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          >
            {error}
          </p>
        ) : null}

        {prepared ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {fileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("lessonPlans.import.rows", {
                      count: prepared.rows.length,
                      defaultValue: "{{count}} row(s) found",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                  {t("lessonPlans.import.valid", {
                    count: prepared.valid.length,
                    defaultValue: "{{count}} ready",
                  })}
                </span>
                {prepared.invalid.length > 0 ? (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800">
                    {t("lessonPlans.import.errors", {
                      count: prepared.invalid.length,
                      defaultValue: "{{count}} need fixes",
                    })}
                  </span>
                ) : null}
              </div>
            </div>

            {overLimit ? (
              <p
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                {t("lessonPlans.import.limit", {
                  count: LESSON_PLAN_IMPORT_LIMIT,
                  defaultValue:
                    "Import is limited to {{count}} lesson plans per upload.",
                })}
              </p>
            ) : null}

            {prepared.invalid.length > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <p className="mb-3 text-sm font-bold text-rose-900">
                  {t("lessonPlans.import.fixRows", {
                    defaultValue:
                      "Fix these rows in the workbook and upload it again.",
                  })}
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm text-rose-800">
                  {prepared.invalid.slice(0, 30).map((row) => (
                    <li key={row.rowNumber}>
                      <span className="font-bold">
                        Row {row.rowNumber}
                        {row.title ? ` (${row.title})` : ""}:
                      </span>{" "}
                      {row.errors.join(" ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </FeatureModalShell>
  );
}
