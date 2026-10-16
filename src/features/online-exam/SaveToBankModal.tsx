import React from "react";
import { AnimatePresence } from "motion/react";
import { Loader2, BookmarkPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell, fieldInput, fieldSelect, fieldLabel } from "../academics-shared/FeatureModalShell";
import { api } from "../../services/api";
import { alertError } from "../../lib/swal";
import { questionBankApi, type BankVisibility } from "./api";
import { toApiQuestions } from "./mappers";
import type { DraftQuestion } from "./types";
import { RichContent } from "./RichContent";
import { hasRichContent } from "./richText";

type Props = {
  schoolId: string;
  open: boolean;
  onClose: () => void;
  questions: DraftQuestion[];
  defaultSubjectId?: string | null;
  onSaved?: () => void;
};

type Taxonomy = { id: string; name: string };

export function SaveToBankModal({
  schoolId,
  open,
  onClose,
  questions,
  defaultSubjectId = null,
  onSaved,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [subjects, setSubjects] = React.useState<Taxonomy[]>([]);
  const [grades, setGrades] = React.useState<Taxonomy[]>([]);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [subjectId, setSubjectId] = React.useState("");
  const [gradeLevelId, setGradeLevelId] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [visibility, setVisibility] = React.useState<BankVisibility>("SHARED");
  const [busy, setBusy] = React.useState(false);

  // Only questions with content can be saved.
  const saveable = React.useMemo(
    () => questions.map((q, i) => ({ q, i })).filter(({ q }) => q.prompt.trim().length > 0),
    [questions]
  );

  React.useEffect(() => {
    if (!open) return;
    setSelected(new Set(saveable.map(({ i }) => i)));
    setSubjectId(defaultSubjectId || "");
    setGradeLevelId("");
    setTopic("");
    setTags("");
    setVisibility("SHARED");
  }, [open, defaultSubjectId, saveable]);

  React.useEffect(() => {
    if (!open || !schoolId) return;
    let cancelled = false;
    (async () => {
      try {
        const [subs, gls] = await Promise.all([
          api.get(`/api/schools/${schoolId}/subjects`) as Promise<Taxonomy[]>,
          api.get(`/api/schools/${schoolId}/grade-levels`) as Promise<Taxonomy[]>,
        ]);
        if (cancelled) return;
        setSubjects(Array.isArray(subs) ? subs : []);
        setGrades(Array.isArray(gls) ? gls : []);
      } catch {
        // taxonomy is optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, schoolId]);

  if (!open) return null;

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const chosen = saveable.filter(({ i }) => selected.has(i));

  const handleSave = async () => {
    if (!chosen.length) return;
    setBusy(true);
    try {
      const inputs = toApiQuestions(chosen.map(({ q }) => q));
      await questionBankApi.create(schoolId, inputs, {
        subjectId: subjectId || null,
        gradeLevelId: gradeLevelId || null,
        topic: topic.trim() || null,
        tags: tags.trim() || undefined,
        visibility,
      });
      onSaved?.();
      onClose();
    } catch (err: any) {
      await alertError(t("onlineExams.questionBank.saveFailed"), err?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <FeatureModalShell
        title={t("onlineExams.questionBank.saveTitle")}
        subtitle={t("onlineExams.questionBank.saveSubtitle")}
        eyebrow={t("onlineExams.questionBank.saveToBank")}
        onClose={onClose}
        wide
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">
              {t("onlineExams.questionBank.selectedCount", { count: chosen.length })}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy || !chosen.length}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
                {busy ? t("onlineExams.questionBank.saving") : t("onlineExams.questionBank.saveSelected")}
              </button>
            </div>
          </div>
        }
      >
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>{t("onlineExams.questionBank.subject")}</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={`${fieldSelect} mt-1.5`}
              >
                <option value="">{t("onlineExams.questionBank.noSubject")}</option>
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
                <option value="">{t("onlineExams.questionBank.noGrade")}</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{t("onlineExams.questionBank.topicLabel")}</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("onlineExams.questionBank.topicPlaceholder")}
                className={`${fieldInput} mt-1.5`}
              />
            </div>
            <div>
              <label className={fieldLabel}>{t("onlineExams.questionBank.tagsLabel")}</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t("onlineExams.questionBank.tagsPlaceholder")}
                className={`${fieldInput} mt-1.5`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>{t("onlineExams.questionBank.visibilityLabel")}</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as BankVisibility)}
                className={`${fieldSelect} mt-1.5`}
              >
                <option value="SHARED">{t("onlineExams.questionBank.visibilityShared")}</option>
                <option value="PRIVATE">{t("onlineExams.questionBank.visibilityPrivate")}</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">{t("onlineExams.questionBank.visibilityHint")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className={fieldLabel}>{t("onlineExams.questionBank.chooseQuestions")}</p>
            {saveable.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                {t("onlineExams.questionBank.nothingToSave")}
              </div>
            ) : (
              saveable.map(({ q, i }) => {
                const checked = selected.has(i);
                return (
                  <label
                    key={q.key}
                    className={`flex gap-3 rounded-2xl border p-4 cursor-pointer ${
                      checked ? "border-indigo-300 bg-indigo-50/60" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(i)}
                      className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      {hasRichContent(q.prompt) ? (
                        <RichContent content={q.prompt} className="text-sm text-slate-800" />
                      ) : (
                        <p className="text-sm text-slate-800 line-clamp-2">{q.prompt}</p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </FeatureModalShell>
    </AnimatePresence>
  );
}
