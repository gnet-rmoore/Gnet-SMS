import React from "react";
import { AnimatePresence } from "motion/react";
import { Loader2, Library, Search, Lock, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell, fieldInput, fieldSelect, fieldLabel } from "../academics-shared/FeatureModalShell";
import { alertError } from "../../lib/swal";
import { questionBankApi, type BankItem, type BankVisibility } from "./api";
import { bankItemToDraft } from "./mappers";
import type { DraftQuestion } from "./types";
import { RichContent } from "./RichContent";
import { hasRichContent } from "./richText";

type Props = {
  schoolId: string;
  open: boolean;
  onClose: () => void;
  onInsert: (drafts: DraftQuestion[]) => void;
};

type Taxonomy = { id: string; name: string };

const TYPE_LABEL_KEY: Record<string, string> = {
  MULTIPLE_CHOICE: "onlineExams.author.questionTypes.MULTIPLE_CHOICE",
  TRUE_FALSE: "onlineExams.author.questionTypes.TRUE_FALSE",
  FILL_BLANK: "onlineExams.author.questionTypes.FILL_BLANK",
  ESSAY: "onlineExams.author.questionTypes.ESSAY",
};

export function QuestionBankPickerModal({ schoolId, open, onClose, onInsert }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [items, setItems] = React.useState<BankItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [subjects, setSubjects] = React.useState<Taxonomy[]>([]);
  const [grades, setGrades] = React.useState<Taxonomy[]>([]);
  const [search, setSearch] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [gradeLevelId, setGradeLevelId] = React.useState("");
  const [visibility, setVisibility] = React.useState<"" | BankVisibility>("");
  const [mine, setMine] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch("");
      setSubjectId("");
      setGradeLevelId("");
      setVisibility("");
      setMine(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !schoolId) return;
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
        // taxonomy is optional; ignore failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, schoolId]);

  React.useEffect(() => {
    if (!open || !schoolId) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await questionBankApi.list(schoolId, {
          search: search.trim() || undefined,
          subjectId: subjectId || undefined,
          gradeLevelId: gradeLevelId || undefined,
          visibility: visibility || undefined,
          mine,
        });
        if (!cancelled) setItems(data.items || []);
      } catch (err: any) {
        if (!cancelled) await alertError(t("onlineExams.questionBank.loadFailed"), err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, schoolId, search, subjectId, gradeLevelId, visibility, mine]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItems = items.filter((i) => selected.has(i.id));

  const subjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name || "";
  const gradeName = (id: string | null) => grades.find((g) => g.id === id)?.name || "";

  const handleInsert = () => {
    if (!selectedItems.length) return;
    onInsert(selectedItems.map(bankItemToDraft));
    onClose();
  };

  return (
    <AnimatePresence>
      <FeatureModalShell
        title={t("onlineExams.questionBank.title")}
        subtitle={t("onlineExams.questionBank.pickerSubtitle")}
        eyebrow={t("onlineExams.questionBank.insertFromBank")}
        onClose={onClose}
        wide
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">
              {t("onlineExams.questionBank.selectedCount", { count: selectedItems.length })}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!selectedItems.length}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Library className="w-4 h-4" />
                {t("onlineExams.questionBank.insertSelected")}
              </button>
            </div>
          </div>
        }
      >
        <div className="p-6 sm:p-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("onlineExams.questionBank.searchPlaceholder")}
                className={`${fieldInput} pl-9`}
              />
            </div>
            <div>
              <label className={fieldLabel}>{t("onlineExams.questionBank.subject")}</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={`${fieldSelect} mt-1.5`}
              >
                <option value="">{t("onlineExams.questionBank.allSubjects")}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{t("onlineExams.questionBank.gradeLevel")}</label>
              <select
                value={gradeLevelId}
                onChange={(e) => setGradeLevelId(e.target.value)}
                className={`${fieldSelect} mt-1.5`}
              >
                <option value="">{t("onlineExams.questionBank.allGrades")}</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{t("onlineExams.questionBank.visibilityLabel")}</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "" | BankVisibility)}
                className={`${fieldSelect} mt-1.5`}
              >
                <option value="">{t("onlineExams.questionBank.visibilityAll")}</option>
                <option value="SHARED">{t("onlineExams.questionBank.visibilityShared")}</option>
                <option value="PRIVATE">{t("onlineExams.questionBank.visibilityPrivate")}</option>
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={mine}
                onChange={(e) => setMine(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {t("onlineExams.questionBank.mineOnly")}
            </label>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 py-10 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.questionBank.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
              {t("onlineExams.questionBank.empty")}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const checked = selected.has(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`w-full text-left rounded-2xl border p-4 flex gap-3 transition-colors ${
                      checked ? "border-indigo-300 bg-indigo-50/60" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
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
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </FeatureModalShell>
    </AnimatePresence>
  );
}
