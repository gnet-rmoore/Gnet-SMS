import React from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  fieldSelect,
} from "../../academics-shared/FeatureModalShell";
import { FEE_TYPES } from "../types";

export type TemplateModalProps = {
  handleCreateTemplate: (e: React.FormEvent) => void;
  setShowTemplateModal: (open: boolean) => void;
  setTemplateForm: React.Dispatch<React.SetStateAction<any>>;
  templateForm: any;
  submitting?: boolean;
  gradeLevels?: { id: string; name: string }[];
  divisions?: { id: string; name: string }[];
  isEditing?: boolean;
};

export function TemplateModal({
  handleCreateTemplate,
  setShowTemplateModal,
  setTemplateForm,
  templateForm,
  submitting,
  gradeLevels = [],
  divisions = [],
  isEditing = false,
}: TemplateModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const scopeMode = templateForm.scopeMode || "SCHOOL";

  return (
    <FeatureModalShell
      eyebrow={t("pages:fees.billingEyebrow")}
      title={isEditing ? t("pages:fees.editTemplate") : t("pages:fees.newTemplate")}
      subtitle={
        isEditing
          ? t("pages:fees.editTemplateSubtitle")
          : t("pages:fees.newTemplateSubtitle")
      }
      onClose={() => setShowTemplateModal(false)}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowTemplateModal(false)}
            className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="create-template-form"
            disabled={submitting}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          >
            {submitting
              ? t("common:saving")
              : isEditing
                ? t("common:saveChanges")
                : t("pages:fees.saveTemplate")}
          </button>
        </div>
      }
    >
      <form
        id="create-template-form"
        onSubmit={handleCreateTemplate}
        className="p-6 sm:p-8 space-y-4"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("common:name")}</label>
          <input
            type="text"
            value={templateForm.name}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, name: e.target.value })
            }
            placeholder={t("pages:fees.templateNamePlaceholder")}
            className={fieldInput}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:type")}</label>
            <select
              value={templateForm.type}
              onChange={(e) =>
                setTemplateForm({ ...templateForm, type: e.target.value })
              }
              className={fieldSelect}
            >
              {FEE_TYPES.filter((ft) => ft.value !== "ENTRANCE").map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {t(`fees.feeTypes.${ft.value}`, { defaultValue: ft.label })}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:fees.amountLabel")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={templateForm.amount}
              onChange={(e) =>
                setTemplateForm({ ...templateForm, amount: e.target.value })
              }
              placeholder="0.00"
              className={fieldInput}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:fees.scope")}</label>
            <select
              value={scopeMode}
              onChange={(e) =>
                setTemplateForm({
                  ...templateForm,
                  scopeMode: e.target.value,
                  gradeLevelId: "",
                  divisionId: "",
                })
              }
              className={fieldSelect}
            >
              <option value="SCHOOL">{t("pages:fees.scopeSchool")}</option>
              <option value="GRADE">{t("pages:fees.scopeGrade")}</option>
              <option value="DIVISION">{t("pages:fees.scopeDivision")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:fees.cohort")}</label>
            <select
              value={templateForm.cohort || "ALL"}
              onChange={(e) =>
                setTemplateForm({ ...templateForm, cohort: e.target.value })
              }
              className={fieldSelect}
            >
              <option value="ALL">{t("pages:fees.cohortAll")}</option>
              <option value="NEW">{t("pages:fees.cohortNew")}</option>
              <option value="RETURNING">{t("pages:fees.cohortReturning")}</option>
            </select>
          </div>
        </div>

        {scopeMode === "GRADE" && (
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:gradeLevel")}</label>
            <select
              value={templateForm.gradeLevelId || ""}
              onChange={(e) =>
                setTemplateForm({ ...templateForm, gradeLevelId: e.target.value })
              }
              className={fieldSelect}
              required
            >
              <option value="">{t("pages:fees.selectGrade")}</option>
              {gradeLevels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scopeMode === "DIVISION" && (
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:fees.scopeDivision")}</label>
            <select
              value={templateForm.divisionId || ""}
              onChange={(e) =>
                setTemplateForm({ ...templateForm, divisionId: e.target.value })
              }
              className={fieldSelect}
              required
            >
              <option value="">{t("pages:fees.selectDivision")}</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {divisions.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {t("pages:fees.noDivisions")}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("pages:fees.schoolYearKey")}{" "}
            <span className="normal-case font-medium text-slate-400">
              ({t("common:optional")})
            </span>
          </label>
          <input
            type="text"
            value={templateForm.schoolYearKey || ""}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, schoolYearKey: e.target.value })
            }
            placeholder="e.g. 2025-2026"
            className={fieldInput}
          />
          <p className="text-xs text-slate-500">
            {t("pages:fees.schoolYearKeyHint")}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("common:description")}</label>
          <textarea
            value={templateForm.description}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, description: e.target.value })
            }
            placeholder={t("pages:fees.optionalNotes")}
            className={`${fieldInput} h-20 resize-none`}
          />
        </div>
      </form>
    </FeatureModalShell>
  );
}
