import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";

export type EditSubjectModalProps = {
  subject: any | null;
  handleUpdateSubject: (id: string, data: any) => Promise<void> | void;
  setShowEditSubjectModal: (v: boolean) => void;
  submitting?: boolean;
};

export function EditSubjectModal({
  subject,
  handleUpdateSubject,
  setShowEditSubjectModal,
  submitting,
}: EditSubjectModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name || "",
        code: subject.code || "",
        description: subject.description || "",
      });
    }
  }, [subject]);

  if (!subject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description,
    };
    await handleUpdateSubject(subject.id, payload);
    setShowEditSubjectModal(false);
  };

  return (
    <FeatureModalShell
      eyebrow={t("curriculum.eyebrow")}
      title={t("curriculum.subjectModal.editTitle") || t("curriculum.subjects.editSubject")}
      subtitle={t("curriculum.subjectModal.editSubtitle") || ""}
      onClose={() => setShowEditSubjectModal(false)}
    >
      <form id="edit-subject-form" onSubmit={handleSubmit} className="p-8 space-y-5">
        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("curriculum.subjectModal.subjectName")}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={fieldInput}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("curriculum.subjectModal.subjectCode")}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            className={fieldInput}
            required
          />
          <p className="text-xs text-slate-500 font-medium">{t("curriculum.subjectModal.codeHint")}</p>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("common:description")}</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t("curriculum.subjectModal.descriptionPlaceholder")}
            className={`${fieldInput} resize-none h-28 font-medium`}
          />
        </div>
      </form>
      <div className="px-8 pb-8 flex gap-3">
        <button
          type="button"
          onClick={() => setShowEditSubjectModal(false)}
          className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
        >
          {t("common:cancel")}
        </button>
        <button
          type="submit"
          form="edit-subject-form"
          disabled={submitting}
          className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {submitting ? t("common:saving") : t("common:save")}
        </button>
      </div>
    </FeatureModalShell>
  );
}