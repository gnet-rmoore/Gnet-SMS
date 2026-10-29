import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { FeatureModalShell, fieldInput, fieldLabel } from "../../academics-shared/FeatureModalShell";
import { useAuthStore } from "../../store/authStore";
import { toast, showToast } from "../../academics-shared/PageToast";
import { confirmAction } from "../../lib/swal";
import { examsApi } from "../../services/api";
import type { Exam } from "../types";

type Props = {
  examId: string;
  initial?: Partial<Exam>;
  onClose: () => void;
  onSave: (data: Partial<Exam>) => void;
};

export function EditExamModal({ examId, initial, onClose, onSave }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const { user, school } = useAuthStore();
  const [form, setForm] = useState<Partial<Exam>>({ ...initial });
  const [saving, setSaving] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user?.role?.includes("SCHOOL_ADMIN")) {
      showToast(t("exams.toast.unauthorized"), "error");
      return;
    }
    setSaving(true);
    try {
      await examsApi.updateExam(examId, form as any);
      showToast(t("exams.toast.scheduled"), "success");
      onSave(form as Partial<Exam>);
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
      <form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <fieldLabel htmlFor="edit-title">{t("exams.title")}</fieldLabel>
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
            <fieldLabel htmlFor="edit-startDate">{t("exams.startDate")}</fieldLabel>
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
            <fieldLabel htmlFor="edit-endDate">{t("exams.endDate")}</fieldLabel>
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
            <fieldLabel htmlFor="edit-deliveryMode">{t("exams.deliveryMode")}</fieldLabel>
            <select
              id="edit-deliveryMode"
              name="deliveryMode"
              className={fieldInput}
              value={form.deliveryMode || "ONLINE"}
              onChange={handleInput}
              required
            >
              <option value="ONLINE">{t("exams.deliveryMode.ONLINE")}</option>
              <option value="OFFLINE">{t("exams.deliveryMode.OFFLINE")}</option>
              <option value="HYBRID">{t("exams.deliveryMode.HYBRID")}</option>
            </select>
          </div>
        </div>

        <div>
          <fieldLabel htmlFor="edit-paperDueAt">{t("exams.paperDueAt")}</fieldLabel>
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