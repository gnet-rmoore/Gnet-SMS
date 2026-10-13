import React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  ChevronRight,
  CalendarCheck,
  FileText,
} from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  cardShell,
  childCard,
} from "../../academics-shared/FeatureModalShell";
import type { LeaveRequest } from "../types";
import { UserAvatar } from "../../../components/UserAvatar";
import { businessDaysBetween, formatLeaveType, statusBadgeClass, statusLabel } from "../utils";
import { ListFilterBar } from "../../../components/ui";
import type { FilterFieldDef, UseListFiltersResult } from "../../list-filters";

export type LeaveRequestsListProps = {
  filteredRequests: LeaveRequest[];
  loading: boolean;
  onClearFilters: () => void;
  onSelect: (req: LeaveRequest) => void;
  filterFields: FilterFieldDef[];
  filters: UseListFiltersResult;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  savedViewsScope?: string;
};

export function LeaveRequestsList({
  filteredRequests,
  loading,
  onClearFilters,
  onSelect,
  filterFields,
  filters,
  stats,
  savedViewsScope,
}: LeaveRequestsListProps) {
  const { t } = useTranslation(["pages", "common"]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("leaveApproval.total")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {stats.total}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("leaveApproval.pending")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {stats.pending}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("leaveApproval.approved")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {stats.approved}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("leaveApproval.rejected")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {stats.rejected}
          </p>
        </div>
      </div>

      <div className={`${cardShell} p-5 sm:p-6`}>
        <ListFilterBar
          fields={filterFields}
          q={filters.q}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={onClearFilters}
          searchPlaceholder={t("leaveApproval.searchPlaceholder")}
          shownCount={filteredRequests.length}
          savedViewsScope={savedViewsScope}
        />
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("leaveApproval.requests")}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {filteredRequests.length === 1
              ? t("leaveApproval.matchingOne", { count: filteredRequests.length })
              : t("leaveApproval.matchingMany", { count: filteredRequests.length })}
          </p>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-24 ${childCard} animate-pulse`} />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <CalendarCheck className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-medium">
              {t("leaveApproval.noMatch")}
            </p>
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              {t("leaveApproval.clearFilters")}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => {
              const days = businessDaysBetween(req.startDate, req.endDate);
              return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => onSelect(req)}
                  className="w-full text-left p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex gap-4 items-start min-w-0 flex-1">
                    <UserAvatar
                      userId={req.userId || req.user?.id}
                      name={req.user?.name}
                      photoUrl={req.user?.photoUrl}
                      size="md"
                      rounded="2xl"
                    />
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold tracking-tight text-slate-900 text-sm">
                          {req.user?.name || t("leaveApproval.staffFallback")}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${statusBadgeClass(
                            req.status
                          )}`}
                        >
                          {statusLabel(req.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {formatLeaveType(req.type)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(req.startDate), "MMM d, yyyy")} –{" "}
                          {format(new Date(req.endDate), "MMM d, yyyy")}
                        </span>
                        <span className="font-mono text-slate-600">
                          {days} {days === 1 ? t("leaveApproval.day") : t("leaveApproval.days")}
                        </span>
                        {req.user?.role && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {req.user.role}
                          </span>
                        )}
                      </div>
                      {req.reason && (
                        <p className="text-sm text-slate-500 font-medium line-clamp-1">
                          {req.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {req.status === "PENDING" && (
                      <span className="hidden sm:inline text-xs font-bold text-indigo-600">
                        {t("leaveApproval.review")}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
