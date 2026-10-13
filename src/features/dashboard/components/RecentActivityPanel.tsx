import React from "react";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardPanel } from "./dashboardUi";

export type RecentActivityPanelProps = {
  loading?: boolean;
  recentLogs?: Array<{
    id: string;
    level?: string;
    module?: string;
    action?: string;
    details?: string;
    createdAt?: string;
    user?: { name?: string } | null;
  }> | null;
};

/** Honest recent activity from school stats — empty when none. */
export function RecentActivityPanel({ loading, recentLogs }: RecentActivityPanelProps) {
  const { t } = useTranslation("pages");
  const logs = Array.isArray(recentLogs) ? recentLogs : [];

  return (
    <DashboardPanel title={t("dashboard.defaultPanel.recentActivity")}>
      <div className="space-y-6">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            {t("dashboard.defaultPanel.loadingActivity")}
          </div>
        ) : logs.length > 0 ? (
          logs.map((log, i) => (
            <div key={log.id} className="flex gap-4 relative">
              {i !== logs.length - 1 && (
                <div className="absolute start-4 top-8 bottom-[-24px] w-px bg-slate-100" />
              )}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 ${
                  log.level === "CRITICAL" || log.level === "ERROR"
                    ? "text-rose-500 bg-rose-50"
                    : log.level === "WARNING"
                      ? "text-amber-500 bg-amber-50"
                      : "text-indigo-500 bg-indigo-50"
                }`}
              >
                {log.module === "AUTH" ? (
                  <Users className="w-4 h-4" />
                ) : log.module === "CLASSROOM" ? (
                  <BookOpen className="w-4 h-4" />
                ) : log.module === "EXAMS" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-slate-600">
                  <span className="font-bold text-slate-900">
                    {log.user?.name || t("dashboard.systemLabel")}
                  </span>{" "}
                  {log.action}
                </p>
                {log.details ? (
                  <p className="text-xs font-medium text-slate-500 truncate max-w-[220px]">
                    {log.details}
                  </p>
                ) : null}
                {log.createdAt ? (
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm">
            {t("dashboard.defaultPanel.noRecentActivity")}
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
