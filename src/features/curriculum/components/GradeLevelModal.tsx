import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";

export type GradeLevelModalProps = {
  gradeForm?: any;
  handleCreateGradeLevel?: any;
  setGradeForm?: any;
  setShowGradeModal?: any;
  submitting?: any;
  [key: string]: any;
};

export function GradeLevelModal({
  gradeForm,
  handleCreateGradeLevel,
  setGradeForm,
  setShowGradeModal,
  submitting,
}: GradeLevelModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    setLocalError(null);
    const name = (gradeForm?.name || "").trim();
    if (!name) {
      e.preventDefault();
      setLocalError(t("curriculum.gradeLevelModal.nameRequired", { defaultValue: "Please enter a grade level name." }));
      return;
    }
    if (name.length < 2) {
      e.preventDefault();
      setLocalError(t("curriculum.gradeLevelModal.nameTooShort", { defaultValue: "Grade level name must be at least 2 characters." }));
      return;
    }
    if (handleCreateGradeLevel) {
      return handleCreateGradeLevel(e);
    }
  };

  return (
    <FeatureModalShell
      eyebrow={t("curriculum.eyebrow")}
      title={t("curriculum.gradeLevelModal.title")}
      subtitle={t("curriculum.gradeLevelModal.subtitle")}
      onClose={() => setShowGradeModal(false)}
    >
      <form
        id="grade-level-form"
        onSubmit={onSubmit}
        className="p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("curriculum.gradeLevelModal.nameLabel")}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={gradeForm?.name || ""}
            onChange={(e) => {
              setLocalError(null);
              setGradeForm({ ...(gradeForm || {}), name: e.target.value });
            }}
            placeholder={t("curriculum.gradeLevelModal.namePlaceholder")}
            className={fieldInput}
            autoFocus
            required
          />
          <p className="text-xs text-slate-500 font-medium">
            {t("curriculum.gradeLevelModal.nameHint", { defaultValue: "e.g., Grade 1, Kindergarten, Year 7" })}
          </p>
          {localError && (
            <p className="text-xs text-rose-600 font-semibold">{localError}</p>
          )}
        </div>
      </form>
      <div className="px-8 pb-8 flex gap-3">
        <button
          type="button"
          onClick={() => setShowGradeModal(false)}
          className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
        >
          {t("common:cancel")}
        </button>
        <button
          type="submit"
          form="grade-level-form"
          disabled={submitting}
          className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {submitting ? t("curriculum.gradeLevelModal.adding") : t("curriculum.header.addGradeLevel")}
        </button>
      </div>
    </FeatureModalShell>
  );
}
