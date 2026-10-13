import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bell,
  CreditCard,
  GraduationCap,
  UserCheck,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/authStore";
import { api } from "../../../services/api";
import { notificationsApi } from "../../notifications/api";
import { UserAvatar } from "../../../components/UserAvatar";
import {
  aggregateFeeStatus,
  parentWeeklyAttendance,
  type ChartDatum,
} from "../lib/chartAggregates";
import {
  DashboardChartCard,
  DashboardChartsGrid,
} from "./charts/DashboardChartCard";
import {
  PremiumBarChart,
  PremiumDonutChart,
} from "./charts/PremiumChartWidgets";
import {
  DashboardBodyShell,
  DashboardHeroKpi,
  DashboardInlineLink,
  DashboardKpiSkeleton,
  DashboardKpiTile,
  DashboardPanel,
} from "./dashboardUi";

type Child = { id: string; name: string; photoUrl?: string | null };

type ParentKpis = {
  childrenCount: number;
  feesDueCount: number;
  unreadNotifs: number;
  absencesThisWeek: number | null;
};

/**
 * Honest family snapshot for PARENT role — only counts from real APIs,
 * never fabricated attendance % or GPA.
 */
export function ParentDashboard() {
  const { t } = useTranslation("pages");
  const { slug } = useParams();
  const { user, accessToken, school } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [kpis, setKpis] = useState<ParentKpis>({
    childrenCount: 0,
    feesDueCount: 0,
    unreadNotifs: 0,
    absencesThisWeek: null,
  });
  const [loading, setLoading] = useState(true);
  const [feeRows, setFeeRows] = useState<unknown[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<unknown[]>([]);
  const [notifSample, setNotifSample] = useState<{ read: number; unread: number }>({
    read: 0,
    unread: 0,
  });

  useEffect(() => {
    if (!user?.id || !school?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [kidsRes, feesRes, notifRes, attRes] = await Promise.all([
          fetch(`/api/parents/${user.id}/children`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then(async (r) => (r.ok ? r.json() : [])),
          api.get(`/api/my-fees`).catch(() => []),
          notificationsApi.list({ limit: 50 }).catch(() => ({ items: [] })),
          api.get(`/api/schools/${school.id}/attendance`).catch(() => []),
        ]);
        if (cancelled) return;
        const kids = (Array.isArray(kidsRes) ? kidsRes : []).map((c: any) => ({
          id: c.id || c.studentId,
          name: c.name || t("dashboard.parent.studentFallback"),
          photoUrl: c.photoUrl || null,
        }));
        const fees = Array.isArray(feesRes) ? feesRes : feesRes?.fees || [];
        const due = fees.filter(
          (f: any) =>
            f.status === "PENDING" || f.status === "OVERDUE" || f.status === "PARTIAL"
        );
        const notifItems = Array.isArray(notifRes)
          ? notifRes
          : notifRes?.items || notifRes?.notifications || [];
        const unread = notifItems.filter((n: any) => !n.readAt && !n.isRead).length;

        const sessions = Array.isArray(attRes) ? attRes : attRes?.sessions || [];
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let absences: number | null = 0;
        let sawRecords = false;
        for (const session of sessions) {
          const d = session.date ? new Date(session.date).getTime() : 0;
          if (d < weekAgo) continue;
          for (const rec of session.records || []) {
            sawRecords = true;
            if (rec.status === "ABSENT" || rec.status === "LATE") absences += 1;
          }
        }
        if (!sawRecords && sessions.length === 0) absences = null;

        setChildren(kids);
        setFeeRows(fees);
        setAttendanceSessions(sessions);
        setNotifSample({
          unread,
          read: Math.max(0, notifItems.length - unread),
        });
        setKpis({
          childrenCount: kids.length,
          feesDueCount: due.length,
          unreadNotifs: unread,
          absencesThisWeek: absences,
        });
      } catch {
        if (!cancelled) {
          setChildren([]);
          setKpis({
            childrenCount: 0,
            feesDueCount: 0,
            unreadNotifs: 0,
            absencesThisWeek: null,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, school?.id, accessToken, t]);

  const c = (key: string) => t(`dashboard.charts.${key}`);
  const label = (name: string) =>
    t(`dashboard.charts.labels.${name}`, { defaultValue: name });
  const localize = (data: ChartDatum[]) =>
    data.map((d) => ({ ...d, name: label(d.name) }));

  const feeChart = localize(aggregateFeeStatus(feeRows));
  const weekChart = localize(parentWeeklyAttendance(attendanceSessions));
  const alertChart = localize(
    [
      { name: "unread", value: notifSample.unread, fill: "#6366f1" },
      { name: "read", value: notifSample.read, fill: "#94a3b8" },
    ].filter((d) => d.value > 0)
  );

  const feeTotal = feeChart.reduce((sum, d) => sum + d.value, 0);
  const alertTotal = alertChart.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return <DashboardKpiSkeleton count={4} />;
  }

  return (
    <DashboardBodyShell>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardHeroKpi
          icon={GraduationCap}
          badge={t("dashboard.parent.linkedChildren")}
          label={t("dashboard.parent.familyHub")}
          value={String(kpis.childrenCount)}
        />
        <DashboardKpiTile
          icon={CreditCard}
          tone="rose"
          badge={t("dashboard.parent.openInvoices")}
          label={t("dashboard.parent.feesDue")}
          value={String(kpis.feesDueCount)}
          href={`/${slug}/fees`}
        />
        <DashboardKpiTile
          icon={UserCheck}
          tone="amber"
          badge={t("dashboard.parent.fromRollCall")}
          label={t("dashboard.parent.absencesLate")}
          value={kpis.absencesThisWeek == null ? "—" : String(kpis.absencesThisWeek)}
          subtext={
            kpis.absencesThisWeek == null
              ? t("dashboard.parent.noRecordsYet")
              : undefined
          }
          href={`/${slug}/attendance`}
        />
        <DashboardKpiTile
          icon={Bell}
          tone="indigo"
          badge={t("dashboard.parent.inbox")}
          label={t("dashboard.parent.unreadAlerts")}
          value={String(kpis.unreadNotifs)}
          href={`/${slug}/notifications`}
        />
      </div>

      <DashboardChartsGrid>
        <DashboardChartCard title={c("feeStatus")} hint={c("feeStatusHint")}>
          <PremiumDonutChart
            data={feeChart}
            emptyMessage={c("noData")}
            centerLabel={t("dashboard.accountant.total")}
            centerValue={feeTotal > 0 ? String(feeTotal) : undefined}
          />
        </DashboardChartCard>
        <DashboardChartCard title={c("weeklyAttendance")} hint={c("weeklyAttendanceHint")}>
          <PremiumBarChart data={weekChart} emptyMessage={c("noData")} layout="vertical" />
        </DashboardChartCard>
        <DashboardChartCard title={c("alertsReadiness")} hint={c("alertsReadinessHint")}>
          <PremiumDonutChart
            data={alertChart}
            emptyMessage={c("noData")}
            centerLabel={t("dashboard.accountant.total")}
            centerValue={alertTotal > 0 ? String(alertTotal) : undefined}
          />
        </DashboardChartCard>
      </DashboardChartsGrid>

      <DashboardPanel
        title={t("dashboard.parent.yourChildren")}
        hint={t("dashboard.parent.childrenHint")}
        action={
          <DashboardInlineLink to={`/${slug}/children`}>
            {t("dashboard.parent.familyHubLink")}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </DashboardInlineLink>
        }
      >
        {children.length === 0 ? (
          <p className="text-sm text-slate-500">{t("dashboard.parent.noChildren")}</p>
        ) : (
          <ul className="space-y-3">
            {children.map((child) => (
              <li
                key={child.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4 bg-slate-50/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    userId={child.id}
                    name={child.name}
                    photoUrl={child.photoUrl}
                    size="md"
                    rounded="2xl"
                  />
                  <span className="font-extrabold tracking-tight text-slate-900 truncate">
                    {child.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/${slug}/grades/${child.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-100 text-slate-700 hover:border-indigo-100 hover:text-indigo-700"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> {t("dashboard.parent.grades")}
                  </Link>
                  <Link
                    to={`/${slug}/classroom?studentId=${encodeURIComponent(child.id)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-100 text-slate-700 hover:border-indigo-100 hover:text-indigo-700"
                  >
                    {t("dashboard.parent.classes")}
                  </Link>
                  <Link
                    to={`/${slug}/attendance?studentId=${encodeURIComponent(child.id)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-100 text-slate-700 hover:border-indigo-100 hover:text-indigo-700"
                  >
                    {t("dashboard.parent.attendance")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
    </DashboardBodyShell>
  );
}
