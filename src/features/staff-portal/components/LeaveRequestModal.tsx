import React from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { calculateDaysBetween } from "../utils/dateHelpers";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  fieldSelect,
} from "../../academics-shared/FeatureModalShell";

export type LeaveRequestModalProps = {
  handleCreateLeave?: any;
  leaveForm?: any;
  setLeaveForm?: any;
  setShowLeaveModal?: any;
  [key: string]: any;
};

/** Presentational extract from Page.tsx — leave request form. */
export function LeaveRequestModal({
  handleCreateLeave,
  leaveForm,
  setLeaveForm,
  setShowLeaveModal,
}: LeaveRequestModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <FeatureModalShell
      title={t("staffPortal.leave.modalTitle")}
      subtitle={t("staffPortal.leave.modalSubtitle")}
      onClose={() => setShowLeaveModal(false)}
    >
      <form onSubmit={handleCreateLeave} className="p-6 sm:p-8 space-y-5">
        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("staffPortal.leave.leaveType")}</label>
          <select
            value={leaveForm.type}
            onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
            className={fieldSelect}
            required
          >
            <option value="SICK">{t("staffPortal.leave.sickLeave")}</option>
            <option value="VACATION">{t("staffPortal.leave.vacationLeave")}</option>
            <option value="PERSONAL">{t("staffPortal.leave.personalLeave")}</option>
            <option value="MATERNITY">{t("staffPortal.leave.maternityLeave")}</option>
            <option value="PATERNITY">{t("staffPortal.leave.paternityLeave")}</option>
            <option value="BEREAVEMENT">{t("staffPortal.leave.bereavementLeave")}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:startDate")}</label>
            <input
              type="date"
              value={leaveForm.startDate}
              onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
              className={fieldInput}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:endDate")}</label>
            <input
              type="date"
              value={leaveForm.endDate}
              onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
              className={fieldInput}
              required
            />
          </div>
        </div>

        {leaveForm.startDate && leaveForm.endDate && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-indigo-700">
              {t("staffPortal.leave.totalDaysSelected")}{" "}
              <span className="font-extrabold text-sm font-mono">
                {calculateDaysBetween(leaveForm.startDate, leaveForm.endDate)}
              </span>
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("leaveApproval.drawer.reason")}</label>
          <textarea
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            className={`${fieldInput} resize-none h-24`}
            placeholder={t("staffPortal.leave.reasonPlaceholder")}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>{t("staffPortal.leave.submitRequest")}</span>
        </button>
      </form>
    </FeatureModalShell>
  );
}
