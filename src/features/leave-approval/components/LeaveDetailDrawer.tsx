import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  User,
  X,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { fieldInput, fieldLabel } from "../../academics-shared/FeatureModalShell";
import type { LeaveRequest } from "../types";
import {
  businessDaysBetween,
  formatLeaveType,
  statusBadgeClass,
  statusLabel,
} from "../utils";

export type LeaveDetailDrawerProps = {
  canApprove: boolean;
  onClose: () => void;
  onDecide: (
    id: string,
    status: "APPROVED" | "REJECTED",
    comment: string
  ) => Promise<void>;
  processing: boolean;
  request: LeaveRequest;
};

export function LeaveDetailDrawer({
  canApprove,
  onClose,
  onDecide,
  processing,
  request,
}: LeaveDetailDrawerProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [comment, setComment] = useState("");
  const days = businessDaysBetween(request.startDate, request.endDate);
  const isPending = request.status === "PENDING";
  const dayLabel = days === 1 ? t("leaveApproval.drawer.businessDay") : t("leaveApproval.drawer.businessDaysPlural");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.2 }}
        className="relative bg-slate-50 w-full max-w-lg h-full shadow-[0_4px_20px_rgb(0,0,0,0.08)] flex flex-col border-l border-slate-100"
      >
        <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <span
              className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${statusBadgeClass(
                request.status
              )}`}
            >
              {statusLabel(request.status)}
            </span>
            <h2 className="text-lg font-extrabold tracking-tight mt-2">
              {request.user?.name || t("leaveApproval.drawer.staffMember")}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {formatLeaveType(request.type)} · {days} {dayLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label={t("common:close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("leaveApproval.drawer.start")}
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                {format(new Date(request.startDate), "MMM d, yyyy")}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("leaveApproval.drawer.end")}
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                {format(new Date(request.endDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("leaveApproval.drawer.staff")}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {request.user?.name || "—"}
                  {request.user?.role ? (
                    <span className="text-slate-400 font-medium">
                      {" "}
                      · {request.user.role}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("leaveApproval.drawer.type")}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {formatLeaveType(request.type)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("leaveApproval.drawer.reason")}
            </h4>
            <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
              {request.reason?.trim() || t("leaveApproval.drawer.noReason")}
            </p>
          </div>

          {!isPending && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                {request.status === "APPROVED" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : request.status === "REJECTED" ? (
                  <XCircle className="w-5 h-5 text-rose-500" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
                <p className="text-sm font-bold text-slate-900">
                  {statusLabel(request.status)}
                </p>
              </div>
              {request.approver && (
                <p className="text-xs text-slate-500 font-medium">
                  {t("leaveApproval.drawer.decidedBy", { name: request.approver.name })}
                  {request.approvedAt
                    ? ` · ${format(new Date(request.approvedAt), "MMM d, yyyy")}`
                    : ""}
                </p>
              )}
              {request.comment && (
                <p className="text-sm text-slate-600 font-medium bg-slate-50 rounded-xl p-3 border border-slate-100 mt-2">
                  {request.comment}
                </p>
              )}
            </div>
          )}

          {isPending && canApprove && (
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("leaveApproval.drawer.commentOptional")}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("leaveApproval.drawer.commentNotePlaceholder")}
                rows={3}
                className={`${fieldInput} h-auto resize-none`}
              />
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-3">
          {isPending && canApprove ? (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={processing}
                onClick={() =>
                  onDecide(request.id, "REJECTED", comment.trim())
                }
                className="flex-1 py-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {t("leaveApproval.drawer.reject")}
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() =>
                  onDecide(request.id, "APPROVED", comment.trim())
                }
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {processing ? t("leaveApproval.drawer.saving") : t("leaveApproval.drawer.approve")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
            >
              {t("common:close")}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
