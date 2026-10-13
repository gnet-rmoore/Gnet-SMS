import React from "react";
import { Users, GraduationCap, BookOpen, ClipboardList, Clock, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui";
import { StatusBadge } from "./StatusBadge";
import { FUNNEL_STATUSES } from "../lib/admissionReporting";

export type OverviewTabProps = {
  activeStudentsCount: number;
  approvedAppsCount: number;
  classroomsCount: number;
  funnelByStatus: Record<string, number>;
  gradeLevels: any[];
  pendingAppsCount: number;
  recentApplications: any[];
  students: any[];
  totalApplicationsCount: number;
  totalStudentsCount: number;
  underReviewAppsCount: number;
  onExportCsv?: () => void;
  onOpenWaitlist?: () => void;
  onlineRegistrationSlot?: React.ReactNode;
};

export function OverviewTab({
  activeStudentsCount,
  approvedAppsCount,
  classroomsCount,
  funnelByStatus,
  gradeLevels,
  pendingAppsCount,
  recentApplications,
  students,
  totalApplicationsCount,
  totalStudentsCount,
  underReviewAppsCount,
  onExportCsv,
  onOpenWaitlist,
  onlineRegistrationSlot,
}: OverviewTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const totalApps = totalApplicationsCount;
  const recentApps = recentApplications;
  const funnel = funnelByStatus;
  const waitlisted = funnel.WAITLISTED || 0;

  return (
    <div className="space-y-8">
      {onlineRegistrationSlot}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("admissions.overview.activeStudents")}</p>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {activeStudentsCount}
              <span className="text-sm font-bold text-slate-400 ml-1">/ {totalStudentsCount}</span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("admissions.overview.pendingReviews")}</p>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {pendingAppsCount + underReviewAppsCount}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("admissions.overview.approvedApps")}</p>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{approvedAppsCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("admissions.overview.classrooms")}</p>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {classroomsCount}
              <span className="text-sm font-bold text-slate-400 ml-1">
                · {t("admissions.overview.gradesCount", { count: gradeLevels.length })}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">{t("admissions.overview.funnelTitle")}</h3>
            <p className="text-sm text-slate-500 mt-1">{t("admissions.overview.funnelSubtitle", { total: totalApps })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenWaitlist && (
              <Button
                type="button"
                variant="ghost"
                size="compact"
                onClick={onOpenWaitlist}
                className="bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100"
              >
                {t("admissions.overview.waitlist", { count: waitlisted })}
              </Button>
            )}
            {onExportCsv && (
              <Button
                type="button"
                variant="ghost"
                size="compact"
                onClick={onExportCsv}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                {t("admissions.overview.exportCsv")}
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FUNNEL_STATUSES.map((status) => (
            <div key={status} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                {t(`admissions.status.${status}`, { defaultValue: status })}
              </p>
              <p className="text-xl font-extrabold text-slate-900 font-mono mt-1">{funnel[status] || 0}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 tracking-tight">{t("admissions.overview.recentApplications")}</h3>
          <span className="text-xs font-bold text-slate-500">{t("admissions.overview.totalCount", { count: totalApps })}</span>
        </div>
        <div className="divide-y divide-slate-50">
          {recentApps.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">
              {t("admissions.overview.noApplications")}
            </div>
          )}
          {recentApps.map((app) => (
            <div key={app.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{app.studentName || t("admissions.overview.unnamed")}</p>
                <p className="text-xs text-slate-500 font-medium truncate">{app.studentEmail || t("admissions.overview.noEmail")}</p>
              </div>
              <StatusBadge status={app.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="font-extrabold text-slate-900 tracking-tight text-sm">{t("admissions.overview.enrollmentSnapshot")}</h3>
        </div>
        <p className="text-sm text-slate-500 font-medium">
          {t("admissions.overview.enrollmentSummary", {
            active: students.filter((s) => s.isActive).length,
            grades: gradeLevels.length,
            classrooms: classroomsCount,
          })}
        </p>
      </div>
    </div>
  );
}
