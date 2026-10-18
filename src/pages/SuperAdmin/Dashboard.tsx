import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  School as SchoolIcon,
  TrendingUp,
  Clock,
  HelpCircle,
  Sparkles,
  Plus,
  Shield,
  ClipboardList,
  Download,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";
import { PageShell, PageHeader, Surface, StatTile, Button, DataTable, dataTableClass } from "../../components/ui";
import { SuperAdminDashboardCharts } from "../../features/dashboard/components/SuperAdminDashboardCharts";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../lib/swal";

export const SuperAdminDashboard = () => {
  const { t } = useTranslation(["pages", "common"]);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [pendingRegistrations, setPendingRegistrations] = React.useState<any[]>([]);
  const [statsData, setStatsData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showHelpGuide, setShowHelpGuide] = React.useState(false);

  const fetchData = async () => {
    try {
      const [statsDataResponse, registrationsRes] = await Promise.all([
        api.get("/api/super-admin/stats"),
        fetch("/api/super-admin/school-registrations", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(async (r) => (r.ok ? r.json() : [])),
      ]);

      setStatsData(statsDataResponse);
      const pending = (Array.isArray(registrationsRes) ? registrationsRes : []).filter((r: { status: string }) =>
        ["SUBMITTED", "NEEDS_INFO"].includes(r.status)
      );
      setPendingRegistrations(pending.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void fetchData();
  }, [accessToken]);

  const downloadSchoolsCsv = async () => {
    try {
      const res = await fetch("/api/super-admin/schools/export.csv", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await toast.fire({ icon: "error", title: data.error || t("pages:superAdmin.dashboardExportFailed") });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `platform-schools-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      await toast.fire({ icon: "error", title: t("pages:superAdmin.dashboardExportFailed") });
    }
  };

  const stats = [
    {
      label: t("pages:superAdmin.totalSchools"),
      value: statsData?.totalSchools?.toString() || "0",
      icon: <SchoolIcon className="w-5 h-5" />,
    },
    {
      label: t("pages:superAdmin.activeStudents"),
      value: statsData?.activeStudents?.toLocaleString() || "0",
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: t("pages:superAdmin.activeSchools"),
      value: statsData?.activeSchools?.toString() || "0",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: t("pages:superAdmin.pendingApplications"),
      value: statsData?.pendingRegistrations?.toString() || "0",
      icon: <ClipboardList className="w-5 h-5" />,
    },
  ];

  const bs = (key: string, opts?: Record<string, string | number>) =>
    t(`pages:superAdmin.billingSnapshot.${key}`, opts);
  const billing = statsData?.billingMix ?? null;
  const paidTenants = Number(billing?.paid ?? 0);
  const unpaidTenants = Number(billing?.unpaid ?? 0);
  const activeTenants = paidTenants + unpaidTenants;
  const coveragePct = activeTenants > 0 ? Math.round((paidTenants / activeTenants) * 100) : 0;
  const pastDueCount = Number(statsData?.billingStatusCounts?.PAST_DUE ?? 0);
  const mrr = Number(statsData?.mrr ?? 0);
  const planRows: Array<{ planCode: string; schools: number; paidSchools: number; mrrUsd: number }> =
    Array.isArray(statsData?.planMix) ? statsData.planMix : [];
  const planLabel = (code: string) =>
    t(`pages:superAdmin.billingSnapshot.planLabels.${code}`, { defaultValue: code });

  return (
    <PageShell width="wide">
      <PageHeader
        title={t("pages:superAdmin.dashboard")}
        subtitle={t("pages:superAdmin.dashboardSubtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="compact"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              title={t("pages:superAdmin.helpTitleAttr")}
            >
              <HelpCircle className="w-4 h-4" />
              {showHelpGuide
                ? t("pages:superAdmin.hideGuide")
                : t("pages:superAdmin.needHelp")}
            </Button>
            <Link
              to="/super-admin/help"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
            >
              Glossary
            </Link>
            <Button
              variant="secondary"
              type="button"
              title={t("pages:superAdmin.dashboardExportTitle")}
              onClick={() => void downloadSchoolsCsv()}
            >
              <Download className="w-4 h-4" />
              {t("common:download")}
            </Button>
          </>
        }
      />

      <AnimatePresence>
        {showHelpGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50 border border-indigo-100 rounded-[32px] p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {t("pages:superAdmin.guideTitle")}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {t("pages:superAdmin.guideSubtitle")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full">
                    {t("pages:superAdmin.onboardingBadge")}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {t("pages:superAdmin.onboardingTitle")}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {t("pages:superAdmin.onboardingDesc")}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full">
                    {t("pages:superAdmin.analyticsBadge")}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {t("pages:superAdmin.analyticsTitle")}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {t("pages:superAdmin.analyticsDesc")}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
                  <span className="text-xs font-black text-amber-600 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-full">
                    {t("pages:superAdmin.saasBadge")}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {t("pages:superAdmin.saasTitle")}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {t("pages:superAdmin.saasDesc")}
                  </p>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 flex gap-3 text-xs leading-relaxed font-medium text-indigo-900">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5 font-bold">
                    {t("pages:superAdmin.guideRecommendation")}
                  </strong>
                  {t("pages:superAdmin.guideTip")}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <SuperAdminDashboardCharts statsData={statsData} loading={loading} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Surface variant="primary" className="lg:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("pages:superAdmin.recentRegistrations")}
            </h3>
            <Link
              to="/super-admin/registrations"
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              {t("pages:superAdmin.viewAll")}
            </Link>
          </div>
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={`${dataTableClass.th} w-[38%]`}>{t("pages:superAdmin.school")}</th>
                  <th className={`${dataTableClass.th} w-[28%]`}>{t("pages:superAdmin.registrationDetail.applicantName")}</th>
                  <th className={`${dataTableClass.th} w-[18%]`}>{t("common:status")}</th>
                  <th className={`${dataTableClass.thEnd} w-[16%]`}>{t("pages:superAdmin.actions")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {loading ? (
                  <tr>
                    <td colSpan={4} className={`${dataTableClass.tdEmpty} italic`}>
                      {t("common:loading")}
                    </td>
                  </tr>
                ) : pendingRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`${dataTableClass.tdEmpty} italic`}>
                      {t("pages:superAdmin.noRecentRegistrations")}
                    </td>
                  </tr>
                ) : (
                  pendingRegistrations.map((reg) => (
                    <tr key={reg.id} className="transition-colors hover:bg-slate-50">
                      <td className={dataTableClass.td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600">
                            {reg.organizationName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{reg.organizationName}</p>
                            <p className="text-xs font-medium text-slate-500 truncate">/{reg.requestedSlug}</p>
                          </div>
                        </div>
                      </td>
                      <td className={dataTableClass.td}>
                        <p className="text-sm font-medium text-slate-700 truncate">{reg.applicantName}</p>
                        <p className="text-xs text-slate-500 truncate">{reg.applicantEmail}</p>
                      </td>
                      <td className={dataTableClass.td}>
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">
                          <Clock className="h-3 w-3 shrink-0" />
                          {t("common:pending")}
                        </span>
                      </td>
                      <td className={dataTableClass.td}>
                        <div className="flex justify-end">
                          <Link to={`/super-admin/registrations?id=${reg.id}`}>
                            <Button variant="secondary" size="compact" className="px-2 min-w-8">
                              {t("pages:superAdmin.registrationDetail.review")}
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTable>
        </Surface>

        <Surface variant="primary" className="p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{bs("title")}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{bs("hint")}</p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 to-slate-50 p-4 ring-1 ring-indigo-100/60">
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">
              {bs("mrr")}
            </p>
            <p className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-slate-900">
              ${loading ? "—" : mrr.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-700">{bs("paidCoverage")}</span>
              <span className="font-mono text-sm font-extrabold text-slate-900">
                {bs("coverageValue", { paid: paidTenants, total: activeTenants })}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <p className="text-xs font-medium text-slate-400">{coveragePct}%</p>
          </div>

          {pastDueCount > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-3.5 ring-1 ring-rose-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div>
                <p className="text-sm font-bold text-rose-700">
                  {bs("pastDueTitle")} — {pastDueCount}
                </p>
                <p className="text-xs font-medium text-rose-500">{bs("pastDueHint")}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              {bs("schoolsByPlan")}
            </p>
            {loading ? (
              <p className="py-4 text-center text-sm text-slate-400 italic">{t("common:loading")}</p>
            ) : planRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400 italic">{bs("noPlanData")}</p>
            ) : (
              planRows.map((plan) => (
                <div
                  key={plan.planCode}
                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-50/80 px-3 py-2 ring-1 ring-slate-100"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-700">
                      {planLabel(plan.planCode)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400">
                      {t("pages:superAdmin.billingSnapshot.paidSchoolsCount", {
                        count: plan.paidSchools,
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-extrabold text-slate-900">
                      {plan.schools}
                    </p>
                    {plan.mrrUsd > 0 ? (
                      <p className="font-mono text-[11px] font-bold text-emerald-600">
                        ${plan.mrrUsd.toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            to="/super-admin/plans"
            className="w-full py-3 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-all text-center block"
          >
            {bs("managePlans")}
          </Link>
        </Surface>
      </div>
    </PageShell>
  );
};
