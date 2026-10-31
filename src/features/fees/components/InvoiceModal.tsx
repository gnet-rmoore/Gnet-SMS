import React from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  fieldSelect,
} from "../../academics-shared/FeatureModalShell";
import { MoneyInput } from "../../../components/MoneyInput";
import { FEE_TYPES, type FeeTemplate } from "../types";
import { formatMoney } from "../../../i18n/format";

export type InvoiceModalProps = {
  handleApplyTemplateToSingle: (id: string) => void;
  handleSingleInvoiceSubmit: (e: React.FormEvent) => void;
  invoiceForm: any;
  setInvoiceForm: React.Dispatch<React.SetStateAction<any>>;
  setShowInvoiceModal: (open: boolean) => void;
  students: any[];
  submitting: boolean;
  templates: FeeTemplate[];
  gradeLevels?: { id: string; name: string }[];
  requireTemplate?: boolean;
};

export function InvoiceModal({
  handleApplyTemplateToSingle,
  handleSingleInvoiceSubmit,
  invoiceForm,
  setInvoiceForm,
  setShowInvoiceModal,
  students,
  submitting,
  templates,
  gradeLevels = [],
  requireTemplate,
}: InvoiceModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  const net =
    parseFloat(invoiceForm.amount || "0") *
    (1 - parseFloat(invoiceForm.discountPercent || "0") / 100);

  const selectedStudent = students.find((s) => s.id === invoiceForm.studentId);
  const gradeName =
    gradeLevels.find((g) => g.id === selectedStudent?.gradeLevelId)?.name ||
    null;
  const cohortLabel =
    selectedStudent?.feeCohort === "RETURNING"
      ? t("fees.invoice.cohortReturning")
      : selectedStudent?.feeCohort === "NEW"
        ? t("fees.invoice.cohortNew")
        : null;

  const feeTypeLabel = (type: string) =>
    t(`fees.feeTypes.${type}`, { defaultValue: type.replace(/_/g, " ") });

  return (
    <FeatureModalShell
      eyebrow={t("fees.billingEyebrow")}
      title={t("fees.invoice.title")}
      subtitle={t("fees.invoice.subtitle")}
      onClose={() => setShowInvoiceModal(false)}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowInvoiceModal(false)}
            className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="create-invoice-form"
            disabled={submitting}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? t("fees.invoice.creating") : t("fees.invoice.createInvoice")}
          </button>
        </div>
      }
    >
      <form
        id="create-invoice-form"
        onSubmit={handleSingleInvoiceSubmit}
        className="p-6 sm:p-8 space-y-4"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("fees.invoice.student")}</label>
          <select
            value={invoiceForm.studentId}
            onChange={(e) =>
              setInvoiceForm({ ...invoiceForm, studentId: e.target.value })
            }
            className={fieldSelect}
            required
          >
            <option value="">{t("fees.invoice.selectStudent")}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
          {selectedStudent && (gradeName || cohortLabel) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {gradeName && (
                <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  {gradeName}
                </span>
              )}
              {cohortLabel && (
                <span className="inline-flex px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                  {cohortLabel}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("fees.invoice.template")}
              {requireTemplate ? " *" : ""}
            </label>
            <select
              value={invoiceForm.templateId || ""}
              onChange={(e) => handleApplyTemplateToSingle(e.target.value)}
              className={fieldSelect}
              required={requireTemplate}
            >
              <option value="">
                {requireTemplate ? t("fees.invoice.selectTemplate") : t("fees.invoice.none")}
              </option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("fees.invoice.type")}</label>
            <select
              value={invoiceForm.type}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, type: e.target.value })
              }
              className={fieldSelect}
            >
              {FEE_TYPES.filter((ft) => ft.value !== "ENTRANCE").map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {feeTypeLabel(ft.value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("fees.amountLabel")}</label>
            <MoneyInput
              value={invoiceForm.amount}
              onValueChange={(amount) =>
                setInvoiceForm({ ...invoiceForm, amount })
              }
              placeholder="0.00"
              className={fieldInput}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("fees.invoice.discount")}</label>
            <select
              value={invoiceForm.discountPercent}
              onChange={(e) =>
                setInvoiceForm({
                  ...invoiceForm,
                  discountPercent: e.target.value,
                })
              }
              className={fieldSelect}
            >
              <option value="0">0%</option>
              <option value="10">10%</option>
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="100">100%</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("fees.invoice.dueDate")}</label>
          <input
            type="date"
            value={invoiceForm.dueDate}
            onChange={(e) =>
              setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })
            }
            className={fieldInput}
            required
          />
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between text-sm font-medium text-slate-600 border border-slate-100">
          <span>{t("fees.invoice.netAmount")}</span>
          <span className="font-extrabold text-slate-900 font-mono">
            {formatMoney(net)}
          </span>
        </div>
      </form>
    </FeatureModalShell>
  );
}
