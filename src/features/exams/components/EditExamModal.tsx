import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell, fieldInput, fieldLabel } from "../../academics-shared/FeatureModalShell";
import { useAuthStore } from "../../../store/authStore";
import { PageToast, usePageToast } from "../../academics-shared/PageToast";
import { examsApi } from "../api";
import type { Exam } from "../types";

type Props = {
  examId: string;
  initial?: Partial<Exam>;
  onClose: () => void;
  onSave: (data: Partial<Exam>) => void;
};

const EXAM_EDIT_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];

export function EditExamModal({ examId, initial, onClose, onSave }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const { user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [form, setForm] = useState<Partial<Exam>>({ ...initial });
  const [saving, setSaving] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!EXAM_EDIT_ROLES.includes(user?.role || "")) {
      showToast(t("exams.toast.unauthorized"), "error");
      return;
    }
    setSaving(true);
    try {
      await examsApi.updateExam(examId, form);
      showToast(t("exams.toast.updated"), "success");
      onSave(form);
      onClose();
    } catch (err: any) {
      showToast(err?.message || t("exams.toast.scheduleFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FeatureModalShell
      title={t("exams.editExamTitle")}
      subtitle={t("exams.editExamSubtitle")}
      onClose={onClose}
    >
      <PageToast toast={toast} />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-title" className={fieldLabel}>
              {t("exams.scheduleModal.examTitle")}
            </label>
            <input
              id="edit-title"
              name="title"
              type="text"
              className={fieldInput}
              value={form.title || ""}
              onChange={handleInput}
              required
            />
          </div>
          <div>
            <label htmlFor="edit-startDate" className={fieldLabel}>
              {t("exams.startDate")}
            </label>
            <input
              id="edit-startDate"
              name="startDate"
              type="date"
              className={fieldInput}
              value={form.startDate ? new Date(form.startDate).toISOString().split("T")[0] : ""}
              onChange={handleInput}
              required
            />
          </div>
          <div>
            <label htmlFor="edit-endDate" className={fieldLabel}>
              {t("exams.endDate")}
            </label>
            <input
              id="edit-endDate"
              name="endDate"
              type="date"
              className={fieldInput}
              value={form.endDate ? new Date(form.endDate).toISOString().split("T")[0] : ""}
              onChange={handleInput}
              required
            />
          </div>
          <div>
            <label htmlFor="edit-deliveryMode" className={fieldLabel}>
              {t("exams.scheduleModal.deliveryMode")}
            </label>
            <select
              id="edit-deliveryMode"
              name="deliveryMode"
              className={fieldInput}
              value={form.deliveryMode || "ONLINE"}
              onChange={handleInput}
              required
            >
              <option value="ONLINE">{t("exams.scheduleModal.deliveryModeOnline")}</option>
              <option value="OFFLINE">{t("exams.scheduleModal.deliveryModeOffline")}</option>
              <option value="HYBRID">{t("exams.scheduleModal.deliveryModeHybrid")}</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="edit-paperDueAt" className={fieldLabel}>
            {t("exams.paperDueAt")}
          </label>
          <input
            id="edit-paperDueAt"
            name="paperDueAt"
            type="date"
            className={fieldInput}
            value={form.paperDueAt ? new Date(form.paperDueAt).toISOString().split("T")[0] : ""}
            onChange={handleInput}
          />
        </div>

        <footer className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-white hover:bg-slate-600 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? t("common:saving") : t("common:save")}
          </button>
        </footer>
      </form>
    </FeatureModalShell>
  );
}
