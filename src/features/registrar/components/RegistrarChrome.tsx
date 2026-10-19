import React from "react";
import { UserPlus, CheckCircle2, AlertCircle, School } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Surface, Button } from "../../../components/ui";

export type RegistrarChromeProps = {
  activeTab?: string;
  errorMessage?: string;
  pendingAppsCount?: number;
  school?: { name?: string } | null;
  setActiveTab?: (tab: any) => void;
  successMessage?: string;
  underReviewAppsCount?: number;
  title?: string;
  subtitle?: string;
};

export function RegistrarChrome({
  activeTab,
  errorMessage,
  pendingAppsCount = 0,
  school,
  setActiveTab,
  successMessage,
  underReviewAppsCount = 0,
  title,
  subtitle,
}: RegistrarChromeProps) {
  const { t } = useTranslation("pages");
  const queue = pendingAppsCount + underReviewAppsCount;
  const tabs = [
    { id: "overview", label: t("admissions.tabs.overview") },
    { id: "directory", label: t("admissions.tabs.directory") },
    { id: "admissions", label: t("admissions.tabs.admissions"), badge: true },
    { id: "classrooms", label: t("admissions.tabs.classrooms") },
    { id: "promotion_statement", label: t("admissions.tabs.promotionStatement") },
    { id: "new_admission", label: t("admissions.tabs.directAdmission"), icon: true },
  ] as const;

  return (
    <>
      <Surface className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold tracking-wider uppercase mb-1">
            <School className="w-4 h-4" />
            {t("admissions.eyebrow")}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-dashboard">
            {title ||
              t("admissions.schoolAdmissions", {
                name: school?.name || t("admissions.schoolFallback"),
              })}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {subtitle || t("admissions.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant={active ? "primary" : "ghost"}
                size="compact"
                onClick={() => setActiveTab?.(tab.id)}
                className={active ? "" : "bg-slate-50 hover:bg-slate-100"}
              >
                {"icon" in tab && tab.icon ? <UserPlus className="w-4 h-4" /> : null}
                {tab.label}
                {"badge" in tab && tab.badge && queue > 0 ? (
                  <span className="min-w-5 h-5 px-1 bg-amber-500 text-white rounded-lg flex items-center justify-center text-xs font-bold font-mono">
                    {queue}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      </Surface>

      {successMessage ? (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-bold text-sm">{successMessage}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="font-bold text-sm">{errorMessage}</p>
        </div>
      ) : null}
    </>
  );
}
