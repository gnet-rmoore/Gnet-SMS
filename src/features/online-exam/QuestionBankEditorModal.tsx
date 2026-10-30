import React from "react";
import { AnimatePresence } from "motion/react";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell, fieldInput, fieldSelect, fieldLabel } from "../academics-shared/FeatureModalShell";
import { alertError } from "../../lib/swal";
import { questionBankApi, type BankItem, type BankVisibility } from "./api";
import { fromApiQuestions, toApiQuestions } from "./mappers";
import { emptyQuestion, type DraftQuestion, type QuestionType } from "./types";
import { MathEditor } from "./MathEditor";

type Props = {
  schoolId: string;
  open: boolean;
  onClose: () => void;
  item?: BankItem | null;
  defaultSubjectId?: string | null;
  onSaved: () => void;
};

type Taxonomy = { id: string; name: string };

const TYPES: QuestionType[] = ["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK", "ESSAY"];

export function QuestionBankEditorModal({
  schoolId,
  open,
  onClose,
  item = null,
  defaultSubjectId = null,
  onSaved,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [draft, setDraft] = React.useState<DraftQuestion>(() => emptyQuestion());
  const [subjects, setSubjects] = React.useState<Taxonomy[]>([]);
  const [grades, setGrades] = React.useState<Taxonomy[]>([]);
  const [subjectId, setSubjectId] = React.useState("");
  const [gradeLevelId, setGradeLevelId] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [visibility, setVisibility] = React.useState<BankVisibility>("SHARED");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (item) {
      setDraft(fromApiQuestions([{ ...item, id: item.id }])[0]);
      setSubjectId(item.subjectId || "");
      setGradeLevelId(item.gradeLevelId || "");
      setTopic(item.topic || "");
      setTags((item.tags || []).join(", "));
      setVisibility(item.visibility || "SHARED");
    } else {
      setDraft(emptyQuestion());
      setSubjectId(defaultSubjectId || "");
      setGradeLevelId("");
      setTopic("");
      setTags("");
      setVisibility("SHARED");
    }
  }, [open, item, defaultSubjectId]);

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
        // taxonomy optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, schoolId]);

  if (!open) return null;

  const patch = (next: Partial<DraftQuestion>) => setDraft((prev) => ({ ...prev, ...next }));

  const changeType = (type: QuestionType) => {
    setDraft((prev) => {
      const base = emptyQuestion(type);
      return { ...base, key: prev.key, prompt: prev.prompt, points: prev.points };
    });
  };

  const updateChoice = (key: string, next: Partial<DraftQuestion["choices"][number]>) =>
    setDraft((prev) => ({
      ...prev,
      choices: prev.choices.map((c) => (c.key === key ? { ...c, ...next } : c)),
    }));

  const canSave = draft.prompt.trim().length > 0 && !busy;

  const handleSave = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const question = toApiQuestions([draft])[0];
      const taxonomy = {
        subjectId: subjectId || null,
        gradeLevelId: gradeLevelId || null,
        topic: topic.trim() || null,
        tags: tags.trim() || undefined,
        visibility,
      };
      if (item) {
        await questionBankApi.update(schoolId, item.id, question, taxonomy);
      } else {
        await questionBankApi.create(schoolId, [question], taxonomy);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      await alertError(t("onlineExams.questionBank.saveFailed"), err?.message);
    } finally {
      setBusy(false);
    }
  };

  const q = (k: string) => t(`onlineExams.questionBank.${k}`);

  return (
    <AnimatePresence>
      <FeatureModalShell
        title={item ? q("editTitle") : q("newTitle")}
        subtitle={q("editorSubtitle")}
        eyebrow={q("title")}
        onClose={onClose}
        wide
        footer={
          <div className="flex justify-end gap-2">
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
              disabled={!canSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy ? t("common:saving") : t("common:save")}
            </button>
          </div>
        }
      >
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={fieldLabel}>{t("common:type")}</label>
              <select
                value={draft.type}
                onChange={(e) => changeType(e.target.value as QuestionType)}
                className={`${fieldSelect} mt-1.5`}
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`onlineExams.author.questionTypes.${type}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{t("onlineExams.author.points")}</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={draft.points}
                onChange={(e) => patch({ points: e.target.value })}
                className={`${fieldInput} mt-1.5`}
              />
            </div>
          </div>

          <div>
            <label className={fieldLabel}>{t("onlineExams.author.questionPrompt")}</label>
            <div className="mt-1.5">
              <MathEditor
                value={draft.prompt}
                onChange={(v) => patch({ prompt: v })}
                placeholder={t("onlineExams.author.questionPrompt")}
                rows={3}
              />
            </div>
          </div>

          {draft.type === "MULTIPLE_CHOICE" && (
            <div className="space-y-2">
              <label className={fieldLabel}>{q("choicesLabel")}</label>
              {draft.choices.map((c, ci) => (
                <div key={c.key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`bank-correct-${draft.key}`}
                    checked={c.isCorrect}
                    onChange={() =>
                      setDraft((prev) => ({
                        ...prev,
                        choices: prev.choices.map((x, i) => ({ ...x, isCorrect: i === ci })),
                      }))
                    }
                  />
                  <span className="w-6 text-center font-bold text-slate-500">{c.label}</span>
                  <input
                    value={c.text}
                    onChange={(e) => updateChoice(c.key, { text: e.target.value })}
                    placeholder={t("onlineExams.author.choiceText")}
                    className={fieldInput}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        choices: prev.choices.filter((x) => x.key !== c.key),
                      }))
                    }
                    disabled={draft.choices.length <= 2}
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    choices: [
                      ...prev.choices,
                      {
                        key: crypto.randomUUID(),
                        label: String.fromCharCode(65 + prev.choices.length),
                        text: "",
                        isCorrect: false,
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                {q("addChoice")}
              </button>
            </div>
          )}

          {draft.type === "TRUE_FALSE" && (
            <select
              value={draft.correctBoolean}
              onChange={(e) => patch({ correctBoolean: e.target.value as "true" | "false" })}
              className={fieldSelect}
            >
              <option value="true">{t("onlineExams.author.correctTrue")}</option>
              <option value="false">{t("onlineExams.author.correctFalse")}</option>
            </select>
          )}

          {draft.type === "FILL_BLANK" && (
            <div className="space-y-2">
              <input
                value={draft.correctAnswer}
                onChange={(e) => patch({ correctAnswer: e.target.value })}
                placeholder={t("onlineExams.author.expectedAnswer")}
                className={fieldInput}
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={draft.caseSensitive}
                  onChange={(e) => patch({ caseSensitive: e.target.checked })}
                />
                {t("onlineExams.author.caseSensitive")}
              </label>
            </div>
          )}

          <div className="border-t border-slate-100 pt-6 grid sm:grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>{q("subject")}</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={`${fieldSelect} mt-1.5`}>
                <option value="">{q("noSubject")}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{q("gradeLevel")}</label>
              <select
                value={gradeLevelId}
                onChange={(e) => setGradeLevelId(e.target.value)}
                className={`${fieldSelect} mt-1.5`}
              >
                <option value="">{q("noGrade")}</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{q("topicLabel")}</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={q("topicPlaceholder")}
                className={`${fieldInput} mt-1.5`}
              />
            </div>
            <div>
              <label className={fieldLabel}>{q("tagsLabel")}</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={q("tagsPlaceholder")}
                className={`${fieldInput} mt-1.5`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>{q("visibilityLabel")}</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as BankVisibility)}
                className={`${fieldSelect} mt-1.5`}
              >
                <option value="SHARED">{q("visibilityShared")}</option>
                <option value="PRIVATE">{q("visibilityPrivate")}</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">{q("visibilityHint")}</p>
            </div>
          </div>
        </div>
      </FeatureModalShell>
    </AnimatePresence>
  );
}

export default QuestionBankEditorModal;
