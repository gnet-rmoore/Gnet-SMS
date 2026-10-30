import React from "react";
import { UserPlus, CheckCircle2, AlertCircle, School } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Surface } from "../../../components/ui";

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
      <Surface className="space-y-5 overflow-hidden">
        <div className="min-w-0">
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

        <div className="relative -mx-4 border-t border-slate-100 px-4 sm:-mx-6 sm:px-6">
          <div
            role="tablist"
            aria-label={t("admissions.eyebrow")}
            className="flex h-14 items-stretch gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              const isDirectAdmission = tab.id === "new_admission";
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab?.(tab.id)}
                  className={`relative flex h-full shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:px-4 ${
                    active
                      ? isDirectAdmission
                        ? "border-indigo-600 bg-indigo-50/80 text-indigo-800"
                        : "border-indigo-600 text-indigo-700"
                      : isDirectAdmission
                        ? "border-transparent text-indigo-700 hover:bg-indigo-50"
                        : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {isDirectAdmission ? (
                    <UserPlus className={`h-4 w-4 ${active ? "text-indigo-700" : "text-indigo-500"}`} />
                  ) : null}
                  <span>{tab.label}</span>
                  {"badge" in tab && tab.badge && queue > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold font-mono text-white">
                      {queue}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 w-4 bg-gradient-to-r from-white to-transparent sm:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-4 w-4 bg-gradient-to-l from-white to-transparent sm:hidden"
          />
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
