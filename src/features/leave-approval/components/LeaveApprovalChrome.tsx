import React from "react";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardShell } from "../../academics-shared/FeatureModalShell";

export type LeaveApprovalChromeProps = {
  loading?: boolean;
  onRefresh: () => void;
  pendingCount: number;
  title?: string;
  subtitle?: string;
};

export function LeaveApprovalChrome({
  loading,
  onRefresh,
  pendingCount,
  title,
  subtitle,
}: LeaveApprovalChromeProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 ${cardShell}`}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          {t("leaveApproval.staffEyebrow")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2 font-dashboard">
          <CalendarCheck className="w-7 h-7 text-indigo-600" />
          {title || t("leaveApproval.title")}
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          {subtitle || t("leaveApproval.subtitle")}
          {pendingCount > 0 ? (
            <span className="text-slate-700">
              {" "}
              {t("leaveApproval.pendingRightNow", { count: pendingCount })}
            </span>
          ) : null}
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 self-start"
        title={t("common:refresh")}
      >
        <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
      </button>
    </motion.div>
  );
}
