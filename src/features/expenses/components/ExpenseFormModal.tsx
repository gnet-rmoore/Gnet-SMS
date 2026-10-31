import React from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { MoneyInput } from "../../../components/MoneyInput";
import { EXPENSE_CATEGORIES } from "../categoryStyles";

export type ExpenseFormModalProps = {
  editingExpense?: any;
  formData?: any;
  handleSubmitExpense?: (e: React.FormEvent) => void;
  setFormData?: (v: any) => void;
  setIsModalOpen?: (open: boolean) => void;
  submitting?: boolean;
};

export function ExpenseFormModal({
  editingExpense,
  formData,
  handleSubmitExpense,
  setFormData,
  setIsModalOpen,
  submitting,
}: ExpenseFormModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <FeatureModalShell
      eyebrow={t("expenses.form.eyebrow")}
      title={editingExpense ? t("expenses.form.editTitle") : t("expenses.form.newTitle")}
      subtitle={t("expenses.form.subtitle")}
      onClose={() => setIsModalOpen?.(false)}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen?.(false)}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={submitting}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? t("common:saving") : t("expenses.form.saveExpense")}
          </button>
        </div>
      }
    >
      <form
        id="expense-form"
        onSubmit={handleSubmitExpense}
        className="p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("expenses.form.titleLabel")}</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData?.({ ...formData, title: e.target.value })}
            placeholder={t("expenses.form.titlePlaceholder")}
            className={fieldInput}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("expenses.form.category")}</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData?.({ ...formData, category: e.target.value })
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
            <label className={fieldLabel}>{t("expenses.form.amountLabel")}</label>
            <MoneyInput
              required
              value={formData.amount}
              onValueChange={(amount) =>
                setFormData?.({ ...formData, amount })
              }
              placeholder="0.00"
              className={`${fieldInput} font-mono`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("expenses.form.date")}</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) =>
                setFormData?.({ ...formData, date: e.target.value })
              }
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("expenses.form.status")}</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData?.({ ...formData, status: e.target.value })
              }
              className={fieldInput}
            >
              <option value="PENDING">{t("expenses.status.PENDING")}</option>
              <option value="APPROVED">{t("expenses.status.APPROVED")}</option>
              <option value="REJECTED">{t("expenses.status.REJECTED")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("common:notes")}</label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData?.({ ...formData, notes: e.target.value })
            }
            placeholder={t("expenses.form.notesPlaceholder")}
            className={`${fieldInput} h-20 resize-none font-medium`}
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("expenses.form.receiptUrl")}</label>
          <input
            type="text"
            value={formData.receiptUrl}
            onChange={(e) =>
              setFormData?.({ ...formData, receiptUrl: e.target.value })
            }
            placeholder={t("expenses.form.receiptPlaceholder")}
            className={fieldInput}
          />
        </div>
      </form>
    </FeatureModalShell>
  );
}
