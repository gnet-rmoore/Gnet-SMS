import React from "react";
import { motion } from "motion/react";
import { Download, Loader2, Plus, Search, Pencil, Trash2, Lock, Users, Library, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { alertError, alertSuccess, confirmAction } from "../../lib/swal";
import { questionBankApi, type BankItem, type BankVisibility } from "./api";
import { RichContent } from "./RichContent";
import { hasRichContent } from "./richText";
import { QuestionBankEditorModal } from "./QuestionBankEditorModal";
import { QuestionBankImportModal } from "./QuestionBankImportModal";
import { downloadQuestionTemplate } from "./parseQuestionSheet";
import { FeatureModalShell, fieldInput, fieldSelect, fieldLabel } from "../academics-shared/FeatureModalShell";

type Taxonomy = { id: string; name: string };

const TYPE_LABEL_KEY: Record<string, string> = {
  MULTIPLE_CHOICE: "onlineExams.author.questionTypes.MULTIPLE_CHOICE",
  TRUE_FALSE: "onlineExams.author.questionTypes.TRUE_FALSE",
  FILL_BLANK: "onlineExams.author.questionTypes.FILL_BLANK",
  ESSAY: "onlineExams.author.questionTypes.ESSAY",
};

export default function QuestionBankPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { user, school } = useAuthStore();
  const schoolId = school?.id || "";

  const [items, setItems] = React.useState<BankItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [subjects, setSubjects] = React.useState<Taxonomy[]>([]);
  const [grades, setGrades] = React.useState<Taxonomy[]>([]);
  const [search, setSearch] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [gradeLevelId, setGradeLevelId] = React.useState("");
  const [visibility, setVisibility] = React.useState<"" | BankVisibility>("");
  const [mine, setMine] = React.useState(false);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BankItem | null>(null);
  const [preview, setPreview] = React.useState<BankItem | null>(null);

  const isStaff = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"].includes(user?.role || "");
  const canManage = (item: BankItem) =>
    isStaff &&
    (item.createdBy === user?.id ||
      ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user?.role || ""));

  const load = React.useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await questionBankApi.list(schoolId, {
        search: search.trim() || undefined,
        subjectId: subjectId || undefined,
        gradeLevelId: gradeLevelId || undefined,
        visibility: visibility || undefined,
        mine,
      });
      setItems(data.items || []);
    } catch (err: any) {
      await alertError(t("onlineExams.questionBank.loadFailed"), err?.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId, search, subjectId, gradeLevelId, visibility, mine, t]);

  React.useEffect(() => {
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  React.useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      try {
        const [subs, gls] = await Promise.all([
          questionBankApi.fetchSubjects(schoolId),
          questionBankApi.fetchGradeLevels(schoolId),
        ]);
        if (cancelled) return;
        setSubjects(subs);
        setGrades(gls);
      } catch {
        // taxonomy optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const subjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name || "";
  const gradeName = (id: string | null) => grades.find((g) => g.id === id)?.name || "";

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (item: BankItem) => {
    setEditing(item);
    setEditorOpen(true);
  };

  const handleDownloadTemplate = async () => {
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

  const handleDelete = async (item: BankItem) => {
    const ok = await confirmAction({
      title: t("onlineExams.questionBank.deleteConfirmTitle"),
      text: t("onlineExams.questionBank.deleteConfirmText"),
      danger: true,
    });
    if (!ok) return;
    try {
      await questionBankApi.remove(schoolId, item.id);
      await alertSuccess(t("onlineExams.questionBank.deleted"));
      await load();
    } catch (err: any) {
      await alertError(t("onlineExams.questionBank.deleteFailed"), err?.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("onlineExams.questionBank.title")}
          </h1>
          <p className="text-slate-500 font-medium">{t("onlineExams.questionBank.pageSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            {t("onlineExams.questionBank.downloadTemplate")}
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 inline-flex items-center gap-2 shrink-0"
          >
            <Upload className="w-4 h-4" />
            {t("onlineExams.questionBank.bulkImport")}
          </button>
          <button
            type="button"
            onClick={openNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl inline-flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t("onlineExams.questionBank.newQuestion")}
          </button>
        </div>
      </motion.div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("onlineExams.questionBank.searchPlaceholder")}
              className={`${fieldInput} pl-9`}
            />
          </div>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={fieldSelect}>
            <option value="">{t("onlineExams.questionBank.allSubjects")}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={gradeLevelId} onChange={(e) => setGradeLevelId(e.target.value)} className={fieldSelect}>
            <option value="">{t("onlineExams.questionBank.allGrades")}</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "" | BankVisibility)}
            className={fieldSelect}
          >
            <option value="">{t("onlineExams.questionBank.visibilityAll")}</option>
            <option value="SHARED">{t("onlineExams.questionBank.visibilityShared")}</option>
            <option value="PRIVATE">{t("onlineExams.questionBank.visibilityPrivate")}</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => setMine(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            {t("onlineExams.questionBank.mineOnly")}
          </label>
          <div className="flex items-center text-sm font-medium text-slate-500">
            {t("onlineExams.questionBank.itemCount", { count: items.length })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.questionBank.loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
          {t("onlineExams.questionBank.empty")}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-900 text-white px-2 py-0.5 font-bold">
                    {t(TYPE_LABEL_KEY[item.type] || item.type)}
                  </span>
                  <span className="font-mono text-slate-500">
                    {item.points} {t("onlineExams.questionBank.points")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                      item.visibility === "SHARED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.visibility === "SHARED" ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {item.visibility === "SHARED"
                      ? t("onlineExams.questionBank.visibilityShared")
                      : t("onlineExams.questionBank.visibilityPrivate")}
                  </span>
                  {subjectName(item.subjectId) ? (
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                      {subjectName(item.subjectId)}
                    </span>
                  ) : null}
                  {gradeName(item.gradeLevelId) ? (
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                      {gradeName(item.gradeLevelId)}
                    </span>
                  ) : null}
                  {item.topic ? (
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">{item.topic}</span>
                  ) : null}
                </div>
                {hasRichContent(item.prompt) ? (
                  <RichContent content={item.prompt} className="text-sm text-slate-800" />
                ) : (
                  <p className="text-sm text-slate-800 line-clamp-2">{item.prompt}</p>
                )}
                {item.tags.length ? (
                  <p className="text-xs text-slate-400 font-mono">{item.tags.join(" · ")}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreview(item)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5 text-sm font-bold"
                >
                  <Library className="w-4 h-4" />
                  {t("onlineExams.questionBank.preview")}
                </button>
                {canManage(item) && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                      title={t("common:edit")}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title={t("common:delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <QuestionBankEditorModal
        schoolId={schoolId}
        open={editorOpen}
        item={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
      />

      {importOpen ? (
        <QuestionBankImportModal
          open={importOpen}
          schoolId={schoolId}
          subjects={subjects}
          grades={grades}
          initialSubjectId={subjectId}
          initialGradeLevelId={gradeLevelId}
          onClose={() => setImportOpen(false)}
          onImported={load}
        />
      ) : null}

      {preview && (
        <FeatureModalShell
          title={t("onlineExams.questionBank.previewTitle")}
          onClose={() => setPreview(null)}
          wide
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                {t("common:close")}
              </button>
            </div>
          }
        >
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-900 text-white px-2 py-0.5 font-bold">
                {t(TYPE_LABEL_KEY[preview.type] || preview.type)}
              </span>
              <span className="font-mono text-slate-500">
                {preview.points} {t("onlineExams.questionBank.points")}
              </span>
            </div>
            <RichContent content={preview.prompt} className="text-sm text-slate-800" />
            {preview.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-1.5">
                {preview.choices.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${
                      c.isCorrect ? "border-emerald-300 bg-emerald-50" : "border-slate-100"
                    }`}
                  >
                    <span className="font-bold text-slate-500">{c.label}</span>
                    <RichContent content={c.text} className="text-sm text-slate-800" />
                  </div>
                ))}
              </div>
            )}
            {preview.type === "TRUE_FALSE" && (
              <p className="text-sm font-bold text-slate-700">
                {preview.choices?.find((c) => c.isCorrect)?.text === "False"
                  ? t("onlineExams.author.correctFalse")
                  : t("onlineExams.author.correctTrue")}
              </p>
            )}
            {preview.type === "FILL_BLANK" && (
              <p className="text-sm font-bold text-slate-700">
                {t("onlineExams.author.expectedAnswer")}: {preview.correctAnswer || "—"}
              </p>
            )}
          </div>
        </FeatureModalShell>
      )}
    </div>
  );
}
