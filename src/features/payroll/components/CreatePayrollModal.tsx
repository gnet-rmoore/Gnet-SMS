import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/authStore";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import type { PayrollFormData, StaffMember } from "../types";
import { AttendanceSummaryPanel } from "./AttendanceSummaryPanel";
import {
  computeNet,
  formatMoney,
  getCurrencySymbol,
  getMonthName,
  yearOptions,
} from "../utils";

export type CreatePayrollModalProps = {
  formData: PayrollFormData;
  handleCreatePayroll: (e: React.FormEvent) => void;
  setFormData: (v: PayrollFormData) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  staffList: StaffMember[];
  submitting: boolean;
};

export function CreatePayrollModal({
  formData,
  handleCreatePayroll,
  setFormData,
  setIsCreateModalOpen,
  staffList,
  submitting,
}: CreatePayrollModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const schoolId = useAuthStore((s) => s.school?.id);
  const symbol = getCurrencySymbol(formData.currency);
  const net = computeNet(
    formData.basicSalary,
    formData.allowances,
    formData.deductions
  );
  const activeStaff = staffList.filter((s) => s.isActive !== false);

  return (
    <FeatureModalShell
      wide
      eyebrow={t("pages:payroll.form.eyebrow")}
      title={t("pages:payroll.form.addTitle")}
      subtitle={t("pages:payroll.form.addSubtitle")}
      onClose={() => setIsCreateModalOpen(false)}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(false)}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="create-payroll-form"
            disabled={submitting || activeStaff.length === 0}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? t("common:saving") : t("pages:payroll.form.savePayroll")}
          </button>
        </div>
      }
    >
      <form
        id="create-payroll-form"
        onSubmit={handleCreatePayroll}
        className="p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={fieldLabel}>
              {t("pages:payroll.form.staffMember")}
            </label>
            <select
              required
              value={formData.userId}
              onChange={(e) =>
                setFormData({ ...formData, userId: e.target.value })
              }
              className={fieldInput}
            >
              <option value="">{t("pages:payroll.form.selectStaff")}</option>
              {activeStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.role})
                </option>
              ))}
            </select>
            {activeStaff.length === 0 && (
              <p className="text-xs font-medium text-rose-600">
                {t("pages:payroll.form.noStaffHint")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:payroll.form.month")}</label>
            <select
              value={formData.month}
              onChange={(e) =>
                setFormData({ ...formData, month: Number(e.target.value) })
              }
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
            <label className={fieldLabel}>{t("pages:payroll.form.year")}</label>
            <select
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: Number(e.target.value) })
              }
              className={fieldInput}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <AttendanceSummaryPanel
            schoolId={schoolId}
            userId={formData.userId}
            month={formData.month}
            year={formData.year}
            currency={formData.currency}
            onApplyDeduction={(amount) =>
              setFormData({
                ...formData,
                deductions: String(Number(amount.toFixed(2))),
              })
            }
          />

          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("pages:payroll.form.currency")}
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className={fieldInput}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="INR">INR (₹)</option>
              <option value="CAD">CAD (C$)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("pages:payroll.form.employmentType")}
            </label>
            <select
              value={formData.employmentType}
              onChange={(e) =>
                setFormData({ ...formData, employmentType: e.target.value })
              }
              className={fieldInput}
            >
              <option value="Full-time">{t("pages:payroll.form.fullTime")}</option>
              <option value="Part-time">{t("pages:payroll.form.partTime")}</option>
              <option value="Contract">{t("pages:payroll.form.contract")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("pages:payroll.form.basicSalary")}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.basicSalary}
              onChange={(e) =>
                setFormData({ ...formData, basicSalary: e.target.value })
              }
              placeholder="0.00"
              className={`${fieldInput} font-mono`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("pages:payroll.form.allowances")}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.allowances}
              onChange={(e) =>
                setFormData({ ...formData, allowances: e.target.value })
              }
              placeholder="0.00"
              className={`${fieldInput} font-mono`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("pages:payroll.form.deductions")}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.deductions}
              onChange={(e) =>
                setFormData({ ...formData, deductions: e.target.value })
              }
              placeholder="0.00"
              className={`${fieldInput} font-mono`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:payroll.form.status")}</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className={fieldInput}
            >
              <option value="PENDING">{t("common:pending")}</option>
              <option value="PAID">{t("common:paid")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("pages:payroll.form.taxIdOptional")}
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) =>
                setFormData({ ...formData, taxId: e.target.value })
              }
              placeholder={t("common:optional")}
              className={fieldInput}
            />
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("pages:payroll.form.ibanOptional")}
            </label>
            <input
              type="text"
              value={formData.iban}
              onChange={(e) =>
                setFormData({ ...formData, iban: e.target.value })
              }
              placeholder={t("common:optional")}
              className={`${fieldInput} font-mono`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>
              {t("pages:payroll.form.swiftOptional")}
            </label>
            <input
              type="text"
              value={formData.swift}
              onChange={(e) =>
                setFormData({ ...formData, swift: e.target.value })
              }
              placeholder={t("common:optional")}
              className={`${fieldInput} font-mono`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("pages:payroll.form.notesOptional")}
          </label>
          <textarea
            value={formData.customNotes}
            onChange={(e) =>
              setFormData({ ...formData, customNotes: e.target.value })
            }
            placeholder={t("pages:payroll.form.notesPlaceholder")}
            rows={3}
            className={`${fieldInput} h-auto resize-none`}
          />
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("pages:payroll.form.netPay")}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("pages:payroll.form.netPayHint")}
            </p>
          </div>
          <p className="text-2xl font-extrabold font-mono tracking-tight">
            {formatMoney(net, symbol)}
          </p>
        </div>
      </form>
    </FeatureModalShell>
  );
}
