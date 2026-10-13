import React from "react";
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

  return (
    <FeatureModalShell
      eyebrow={t("curriculum.eyebrow")}
      title={t("curriculum.gradeLevelModal.title")}
      subtitle={t("curriculum.gradeLevelModal.subtitle")}
      onClose={() => setShowGradeModal(false)}
    >
      <form
        id="grade-level-form"
        onSubmit={handleCreateGradeLevel}
        className="p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("curriculum.gradeLevelModal.nameLabel")}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={gradeForm.name}
            onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
            placeholder={t("curriculum.gradeLevelModal.namePlaceholder")}
            className={fieldInput}
            required
          />
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
