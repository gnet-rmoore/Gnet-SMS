import React from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { alertError, alertSuccess } from "../../lib/swal";
import { FeatureModalShell, fieldInput, fieldSelect, fieldLabel } from "../academics-shared/FeatureModalShell";
import { questionBankApi, type BankVisibility } from "./api";
import {
  downloadQuestionTemplate,
  parseQuestionSheet,
  QuestionSheetError,
} from "./parseQuestionSheet";
import {
  prepareQuestionBankImport,
  QUESTION_BANK_IMPORT_LIMIT,
} from "./questionBankImport";

type Taxonomy = { id: string; name: string };

type Props = {
  open: boolean;
  schoolId: string;
  subjects: Taxonomy[];
  grades: Taxonomy[];
  initialSubjectId?: string;
  initialGradeLevelId?: string;
  onClose: () => void;
  onImported: () => Promise<unknown>;
};

export function QuestionBankImportModal({
  open,
  schoolId,
  subjects,
  grades,
  initialSubjectId = "",
  initialGradeLevelId = "",
  onClose,
  onImported,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [rows, setRows] = React.useState<Record<string, unknown>[] | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [error, setError] = React.useState("");
  const [subjectId, setSubjectId] = React.useState(initialSubjectId);
  const [gradeLevelId, setGradeLevelId] = React.useState(initialGradeLevelId);
  const [topic, setTopic] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [visibility, setVisibility] = React.useState<BankVisibility>("SHARED");
  const [saving, setSaving] = React.useState(false);

  const prepared = React.useMemo(
    () => (rows ? prepareQuestionBankImport(rows) : null),
    [rows]
  );
  const overLimit =
    (prepared?.validation.rowCount || 0) > QUESTION_BANK_IMPORT_LIMIT;
  const canSave = Boolean(
    prepared &&
      prepared.validation.validCount > 0 &&
      prepared.validation.errorCount === 0 &&
      !overLimit &&
      !saving
  );

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setRows(null);
    setFileName(file.name);
    setError("");
    try {
      const parsed = await parseQuestionSheet(file);
      setRows(parsed.rows);
    } catch (err) {
      if (err instanceof QuestionSheetError) {
        const key = {
          FILE_TYPE: "importFileType",
          WRONG_SHEET: "importWrongSheet",
          NO_ROWS: "importNoRows",
        }[err.code];
        setError(t(`onlineExams.questionBank.${key}`));
      } else {
        console.error("Could not parse Question Bank workbook", err);
        setError(t("onlineExams.questionBank.importParseFailed"));
      }
    }
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadQuestionTemplate("question-bank-template.xlsx");
    } catch (err: any) {
      console.error("Could not download Question Bank template", err);
      await alertError(
        t("onlineExams.questionBank.importFailed"),
        err?.message
      );
    }
  };

  const handleSave = async () => {
    if (!canSave || !prepared) return;
    setSaving(true);
    try {
      const result = await questionBankApi.create(schoolId, prepared.questions, {
        subjectId: subjectId || null,
        gradeLevelId: gradeLevelId || null,
        topic: topic.trim() || null,
        tags,
        visibility,
      });
      await alertSuccess(
        t("onlineExams.questionBank.importSuccess", {
          count: result.created ?? prepared.questions.length,
        })
      );
      await onImported();
      onClose();
    } catch (err: any) {
      await alertError(
        t("onlineExams.questionBank.importFailed"),
        err?.message
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <FeatureModalShell
      title={t("onlineExams.questionBank.importTitle")}
      subtitle={t("onlineExams.questionBank.importSubtitle")}
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {saving
              ? t("onlineExams.questionBank.importSaving")
              : t("onlineExams.questionBank.importSave")}
          </button>
        </div>
      }
    >
      <div className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-indigo-950">
            {t("onlineExams.questionBank.importInstructions")}
          </p>
          <button
            type="button"
            onClick={handleTemplateDownload}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
          >
            <Download className="h-4 w-4" />
            {t("onlineExams.questionBank.downloadTemplate")}
          </button>
        </div>

        <label className="block">
          <span className={fieldLabel}>{t("onlineExams.questionBank.chooseFile")}</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            className={`${fieldInput} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-indigo-700`}
          />
        </label>

        {error ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        {prepared ? (
          <section aria-label={t("onlineExams.questionBank.importReview")} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{fileName}</p>
                  <p className="text-xs text-slate-500">
                    {t("onlineExams.questionBank.importRows", {
                      count: prepared.validation.rowCount,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                  {t("onlineExams.questionBank.importValid", {
                    count: prepared.validation.validCount,
                  })}
                </span>
                {prepared.validation.errorCount > 0 ? (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800">
                    {t("onlineExams.questionBank.importErrors", {
                      count: prepared.validation.errorCount,
                    })}
                  </span>
                ) : null}
              </div>
            </div>

            {overLimit ? (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {t("onlineExams.questionBank.importLimit", {
                  count: prepared.validation.rowCount,
                })}
              </p>
            ) : null}

            {prepared.validation.errorCount > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <p className="mb-3 text-sm font-bold text-rose-900">
                  {t("onlineExams.questionBank.importFixRows")}
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto text-sm text-rose-800">
                  {prepared.validation.rows
                    .filter((row) => !row.ok)
                    .slice(0, 20)
                    .map((row) => (
                      <li key={row.rowNumber}>
                        <span className="font-bold">Row {row.rowNumber}:</span>{" "}
                        {row.errors.join(" ")}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={fieldLabel}>{t("onlineExams.questionBank.importSubjectOptional")}</span>
                <select
                  className={fieldSelect}
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                >
                  <option value="">{t("onlineExams.questionBank.noSubject")}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={fieldLabel}>{t("onlineExams.questionBank.importGradeOptional")}</span>
                <select
                  className={fieldSelect}
                  value={gradeLevelId}
                  onChange={(event) => setGradeLevelId(event.target.value)}
                >
                  <option value="">{t("onlineExams.questionBank.noGrade")}</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>{grade.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={fieldLabel}>{t("onlineExams.questionBank.importTopicOptional")}</span>
                <input className={fieldInput} value={topic} onChange={(event) => setTopic(event.target.value)} />
              </label>
              <label>
                <span className={fieldLabel}>{t("onlineExams.questionBank.importTagsOptional")}</span>
                <input className={fieldInput} value={tags} onChange={(event) => setTags(event.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className={fieldLabel}>{t("onlineExams.questionBank.importVisibility")}</span>
                <select
                  className={fieldSelect}
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as BankVisibility)}
                >
                  <option value="SHARED">{t("onlineExams.questionBank.visibilityShared")}</option>
                  <option value="PRIVATE">{t("onlineExams.questionBank.visibilityPrivate")}</option>
                </select>
              </label>
            </div>
          </section>
        ) : null}
      </div>
    </FeatureModalShell>
  );
}
