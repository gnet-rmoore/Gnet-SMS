import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Download, HelpCircle } from "lucide-react";
import { Button, ListFilterBar, ListPagination } from "../../../components/ui";
import type { FilterFieldDef, UseListFiltersResult } from "../../list-filters";
import { StatusBadge } from "./StatusBadge";

export type AdmissionsTabProps = {
  filterFields: FilterFieldDef[];
  filters: UseListFiltersResult;
  savedViewsScope?: string;
  approvedAppsCount: number;
  applications: any[];
  applicationsLoading?: boolean;
  applicationsPage: number;
  applicationsPageSize: number;
  applicationsTotal: number;
  handleOpenReviewApp: (app: any) => void;
  parseAppDocuments: (docs: string) => any;
  parseAppNotes: (notes: string) => any;
  pendingAppsCount: number;
  underReviewAppsCount: number;
  waitlistedCount?: number;
  onExportCsv?: () => void;
};

export function AdmissionsTab({
  filterFields,
  filters,
  savedViewsScope,
  approvedAppsCount,
  applications,
  applicationsLoading = false,
  applicationsPage,
  applicationsPageSize,
  applicationsTotal,
  handleOpenReviewApp,
  parseAppDocuments,
  parseAppNotes,
  pendingAppsCount,
  underReviewAppsCount,
  waitlistedCount = 0,
  onExportCsv,
}: AdmissionsTabProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-600">
            {t("admissions.admissionsTab.pending")}
          </p>
          <p className="text-xl font-extrabold text-amber-900">{pendingAppsCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">
            {t("admissions.admissionsTab.underReview")}
          </p>
          <p className="text-xl font-extrabold text-blue-900">{underReviewAppsCount}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            filters.clear();
            filters.setValue("status", "WAITLISTED");
          }}
          className="text-start bg-violet-50 border border-violet-100 rounded-2xl p-4 hover:border-violet-200 transition-all"
        >
          <p className="text-xs font-black uppercase tracking-wider text-violet-600">
            {t("admissions.admissionsTab.waitlisted")}
          </p>
          <p className="text-xl font-extrabold text-violet-900">{waitlistedCount}</p>
        </button>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-600">
            {t("admissions.admissionsTab.approved")}
          </p>
          <p className="text-xl font-extrabold text-indigo-900">{approvedAppsCount}</p>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-6 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
          <HelpCircle className="h-4 w-4 text-slate-500" />
          {t("admissions.help.title")}
        </h3>
        <ol className="space-y-2 text-sm leading-relaxed text-slate-600 list-decimal list-inside">
          <li>{t("admissions.help.step1")}</li>
          <li>{t("admissions.help.step2")}</li>
          <li>{t("admissions.help.step3")}</li>
        </ol>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:p-6">
        <ListFilterBar
          fields={filterFields}
          q={filters.q}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={filters.clear}
          searchPlaceholder={t("admissions.admissionsTab.searchPlaceholder")}
          shownCount={applicationsTotal}
          savedViewsScope={savedViewsScope}
          actions={
            onExportCsv ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onExportCsv}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                <Download className="w-4 h-4" />
                {t("admissions.admissionsTab.exportCsv")}
              </Button>
            ) : undefined
          }
        />
      </div>

      <div className="min-w-0 space-y-3" aria-live="polite">
        {applicationsLoading && applications.length === 0 ? (
          <div
            role="status"
            aria-label={t("admissions.loading")}
            className="space-y-3"
          >
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                aria-hidden="true"
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : null}
        {applications.map((app) => {
          const notes = parseAppNotes(app.notes || "");
          const docs = parseAppDocuments(app.documents || "");
          const fileDocs = Array.isArray(app.admissionDocuments) ? app.admissionDocuments.length : 0;
          const docCount = Object.values(docs || {}).filter(Boolean).length;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => handleOpenReviewApp(app)}
              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-start transition-all hover:border-indigo-200 hover:shadow-md sm:gap-4 sm:p-5"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-extrabold text-slate-900 text-sm">{app.studentName}</p>
                  <StatusBadge status={app.status} />
                  {notes.applicantType === "RETURNING" ? (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {t("admissions.admissionsTab.returning")}
                    </span>
                  ) : app.source === "PUBLIC" ? (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                      {t("admissions.admissionsTab.onlineNew")}
                    </span>
                  ) : null}
                </div>
                <p className="break-words text-xs font-medium text-slate-500">
                  {app.parentName || t("admissions.admissionsTab.noGuardian")} ·{" "}
                  {app.studentEmail || t("admissions.overview.noEmail")}
                  {notes.testScore
                    ? ` · ${t("admissions.admissionsTab.score", { score: notes.testScore })}`
                    : ""}
                  {docCount ? ` · ${t("admissions.admissionsTab.checklistCount", { count: docCount })}` : ""}
                  {fileDocs ? ` · ${t("admissions.admissionsTab.filesCount", { count: fileDocs })}` : ""}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
            </button>
          );
        })}
        {!applicationsLoading && applications.length === 0 && (
          <div className="bg-white rounded-[32px] border border-dashed border-slate-200 py-16 text-center text-slate-400 text-sm font-semibold">
            {t("admissions.admissionsTab.noMatch")}
          </div>
        )}
      </div>

      {applicationsTotal > 0 ? (
        <ListPagination
          total={applicationsTotal}
          page={applicationsPage}
          pageSize={applicationsPageSize}
          onPageChange={filters.setPage}
          onPageSizeChange={filters.setPageSize}
          className="rounded-2xl border border-slate-200 bg-white"
        />
      ) : null}
    </div>
  );
}
