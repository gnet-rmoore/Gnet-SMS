import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  AlertCircle,
  Plus,
  CalendarDays,
} from "lucide-react";
import { formatSafe, calculateDaysBetween } from "../utils/dateHelpers";

export type LeaveBalance = {
  id: string;
  type: string;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  remaining: number;
};

export type LeaveTabProps = {
  leaves: any[];
  leaveBalances: LeaveBalance[];
  onOpenLeaveModal: () => void;
};

function formatLeaveType(type: string) {
  return type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function leaveStatusLabel(status: string, t: (key: string) => string) {
  if (status === "APPROVED") return t("common:approved");
  if (status === "REJECTED") return t("common:rejected");
  return t("common:pending");
}

export function LeaveTab({ leaves, leaveBalances, onOpenLeaveModal }: LeaveTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const year = leaveBalances[0]?.year ?? new Date().getFullYear();

  return (
    <motion.div
      key="leave"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
        <div>
          <p className="text-sm font-bold text-slate-800">{t("staffPortal.leave.balancesTitle")}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {t("staffPortal.leave.balancesHint", { year })}
          </p>
        </div>

        {leaveBalances.length === 0 ? (
          <p className="text-sm text-slate-500 font-medium">
            {t("staffPortal.leave.balancesNotConfigured")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaveBalances.map((balance) => (
              <div
                key={balance.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {formatLeaveType(balance.type)}
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                  {balance.remaining}
                  <span className="text-sm font-bold text-slate-400 ml-1">{t("staffPortal.leave.daysLeft")}</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-medium text-slate-500">
                  <div>
                    <p className="uppercase tracking-wider text-slate-400">{t("staffPortal.leave.entitled")}</p>
                    <p className="font-mono text-slate-800 font-bold">{balance.entitled}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider text-slate-400">{t("staffPortal.leave.used")}</p>
                    <p className="font-mono text-slate-800 font-bold">{balance.used}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider text-slate-400">{t("staffPortal.leave.pending")}</p>
                    <p className="font-mono text-slate-800 font-bold">{balance.pending}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{t("staffPortal.leave.applicationsTitle")}</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {t("staffPortal.leave.applicationsHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenLeaveModal()}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t("staffPortal.leave.requestLeave")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaves.map((request) => {
            const totalDays = calculateDaysBetween(request.startDate, request.endDate);
            return (
              <div
                key={request.id}
                className="bg-slate-50 hover:bg-white rounded-2xl p-6 border border-slate-100 hover:border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        request.type === "SICK"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : request.type === "VACATION"
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}
                    >
                      {request.type.replace("_", " ")}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        request.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : request.status === "REJECTED"
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}
                    >
                      {leaveStatusLabel(request.status, t)}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-base leading-snug">
                      {totalDays}{" "}
                      {totalDays === 1 ? t("staffPortal.leave.day") : t("staffPortal.leave.days")}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatSafe(request.startDate, "MMM dd")} – {formatSafe(request.endDate, "MMM dd, yyyy")}
                    </p>
                  </div>

                  <p className="text-xs font-medium text-slate-600 line-clamp-3 bg-white p-3 rounded-xl border border-slate-100">
                    {request.reason || t("staffPortal.leave.noReason")}
                  </p>
                </div>

                {request.comment && (
                  <div className="pt-3 border-t border-slate-100 flex items-start gap-2 bg-indigo-50/40 p-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-indigo-800 leading-normal">
                      <span className="font-bold block uppercase tracking-wider text-[9px] text-indigo-500">
                        {t("staffPortal.leave.adminComment")}
                      </span>
                      {request.comment}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {leaves.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
              <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              <p className="text-sm">{t("staffPortal.leave.noApplications")}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
