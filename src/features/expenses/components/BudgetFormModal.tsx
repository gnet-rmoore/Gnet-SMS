import React from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { EXPENSE_CATEGORIES } from "../categoryStyles";

export type BudgetFormModalProps = {
  budgetForm?: any;
  editingBudget?: any;
  handleSubmitBudget?: (e: React.FormEvent) => void;
  setBudgetForm?: (v: any) => void;
  setIsBudgetModalOpen?: (open: boolean) => void;
};

export function BudgetFormModal({
  budgetForm,
  editingBudget,
  handleSubmitBudget,
  setBudgetForm,
  setIsBudgetModalOpen,
}: BudgetFormModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <FeatureModalShell
      eyebrow={t("expenses.budget.eyebrow")}
      title={editingBudget ? t("expenses.budget.editTitle") : t("expenses.budget.newTitle")}
      subtitle={t("expenses.budget.subtitle")}
      onClose={() => setIsBudgetModalOpen?.(false)}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsBudgetModalOpen?.(false)}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="budget-form"
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {t("expenses.budget.saveBudget")}
          </button>
        </div>
      }
    >
      <form
        id="budget-form"
        onSubmit={handleSubmitBudget}
        className="p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("expenses.budget.department")}</label>
          <input
            type="text"
            required
            value={budgetForm.department}
            onChange={(e) =>
              setBudgetForm?.({ ...budgetForm, department: e.target.value })
            }
            placeholder={t("expenses.budget.departmentPlaceholder")}
            className={fieldInput}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("expenses.form.category")}</label>
            <select
              value={budgetForm.category}
              onChange={(e) =>
                setBudgetForm?.({ ...budgetForm, category: e.target.value })
              }
              className={fieldInput}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`expenses.categories.${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("expenses.budget.allocatedLabel")}</label>
            <input
              type="number"
              required
              value={budgetForm.allocated}
              onChange={(e) =>
                setBudgetForm?.({ ...budgetForm, allocated: e.target.value })
              }
              placeholder="0"
              className={`${fieldInput} font-mono`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("expenses.budget.academicYear")}</label>
          <input
            type="text"
            value={budgetForm.academicYear}
            onChange={(e) =>
              setBudgetForm?.({ ...budgetForm, academicYear: e.target.value })
            }
            placeholder="2026/2027"
            className={fieldInput}
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("common:notes")}</label>
          <textarea
            value={budgetForm.notes}
            onChange={(e) =>
              setBudgetForm?.({ ...budgetForm, notes: e.target.value })
            }
            placeholder={t("expenses.budget.notesOptional")}
            className={`${fieldInput} h-20 resize-none font-medium`}
          />
        </div>
      </form>
    </FeatureModalShell>
  );
}
