import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { getMonthName, yearOptions } from "../utils";

export type CreateTemplateFromPayrollModalProps = {
  defaultMonth: number;
  defaultYear: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    month: number;
    year: number;
  }) => void;
};

export function CreateTemplateFromPayrollModal({
  defaultMonth,
  defaultYear,
  submitting,
  onClose,
  onSubmit,
}: CreateTemplateFromPayrollModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);

  return (
    <FeatureModalShell
      eyebrow={t("pages:payroll.templates.editorEyebrow")}
      title={t("pages:payroll.templates.createTitle")}
      subtitle={t("pages:payroll.templates.createSubtitle")}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="create-template-form"
            disabled={submitting || !name.trim()}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? t("common:saving") : t("pages:payroll.templates.createTemplate")}
          </button>
        </div>
      }
    >
      <form
        id="create-template-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, description, month, year });
        }}
        className="p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("pages:payroll.templates.templateName")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldInput}
            placeholder={t("pages:payroll.templates.templateNamePlaceholder")}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("pages:payroll.templates.description")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${fieldInput} h-auto resize-none`}
            rows={3}
            placeholder={t("pages:payroll.templates.descriptionPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:payroll.templates.sourceMonth")}</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={fieldInput}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:payroll.templates.sourceYear")}</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={fieldInput}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 font-medium">
          {t("pages:payroll.templates.createHint")}
        </div>
      </form>
    </FeatureModalShell>
  );
}
