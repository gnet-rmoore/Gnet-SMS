import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  MonitorPlay,
  UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/authStore";
import { notificationsApi } from "../../notifications/api";
import { workspaceApi } from "../../classroom-workspace/api";
import type { ChartDatum } from "../lib/chartAggregates";
import {
  DashboardChartCard,
  DashboardChartsGrid,
} from "./charts/DashboardChartCard";
import {
  PremiumDonutChart,
} from "./charts/PremiumChartWidgets";
import {
  DashboardBodyShell,
  DashboardHeroKpi,
  DashboardInlineLink,
  DashboardKpiSkeleton,
  DashboardKpiTile,
  DashboardLinkTile,
  DashboardListRow,
  DashboardPanel,
} from "./dashboardUi";

type StudentKpis = {
  classCount: number | null;
  unreadNotifs: number | null;
};

/** Student home — personal classes and alerts. */
export function StudentDashboard() {
  const { t } = useTranslation("pages");
  const { slug } = useParams();
  const { school } = useAuthStore();
  const [kpis, setKpis] = useState<StudentKpis>({
    classCount: null,
    unreadNotifs: null,
  });
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [notifSample, setNotifSample] = useState<{ read: number; unread: number }>({
    read: 0,
    unread: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [roomsRes, notifRes] = await Promise.allSettled([
          workspaceApi.fetchMyClassrooms(),
          notificationsApi.list({ limit: 50 }),
        ]);
        if (cancelled) return;

        const rooms =
          roomsRes.status === "fulfilled"
            ? Array.isArray(roomsRes.value)
              ? roomsRes.value
              : (roomsRes.value as any)?.classrooms || []
            : [];
        const roomList = rooms.map((c: any) => ({
          id: c.id,
          name: c.name || c.subject?.name || t("dashboard.student.classFallback"),
        }));

        const notifPayload =
          notifRes.status === "fulfilled" ? notifRes.value : { items: [] };
        const notifItems = Array.isArray(notifPayload)
          ? notifPayload
          : (notifPayload as any)?.items ||
            (notifPayload as any)?.notifications ||
            [];
        const unread = notifItems.filter((n: any) => !n.readAt && !n.isRead).length;

        setClasses(roomList.slice(0, 5));
        setNotifSample({
          unread,
          read: Math.max(0, notifItems.length - unread),
        });
        setKpis({
          classCount: roomsRes.status === "fulfilled" ? roomList.length : null,
          unreadNotifs: notifRes.status === "fulfilled" ? unread : null,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school?.id, t]);

  const fmt = (n: number | null) => (n == null ? "—" : String(n));

  const c = (key: string) => t(`dashboard.charts.${key}`);
  const label = (name: string) =>
    t(`dashboard.charts.labels.${name}`, { defaultValue: name });
  const localize = (data: ChartDatum[]) =>
    data.map((d) => ({ ...d, name: label(d.name) }));

  const alertChart = localize(
    [
      { name: "unread", value: notifSample.unread, fill: "#6366f1" },
      { name: "read", value: notifSample.read, fill: "#94a3b8" },
    ].filter((d) => d.value > 0)
  );
  const alertTotal = alertChart.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return <DashboardKpiSkeleton count={3} />;
  }

  return (
    <DashboardBodyShell>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardHeroKpi
          icon={BookOpen}
          badge={t("dashboard.stats.myClasses")}
          label={t("dashboard.stats.myClasses")}
          value={fmt(kpis.classCount)}
        />
        <DashboardKpiTile
          icon={Bell}
          tone="amber"
          badge={t("dashboard.stats.unreadAlerts")}
          label={t("dashboard.stats.unreadAlerts")}
          value={fmt(kpis.unreadNotifs)}
        />
        <DashboardKpiTile
          icon={Award}
          tone="indigo"
          badge={t("dashboard.stats.myGrades")}
          label={t("dashboard.student.openGrades")}
          value={t("dashboard.student.openGrades")}
          subtext={t("dashboard.student.openGradesHint")}
        />
      </div>

      <DashboardChartsGrid>
        <DashboardChartCard title={c("alertsReadiness")} hint={c("alertsReadinessHint")}>
          <PremiumDonutChart
            data={alertChart}
            emptyMessage={c("noData")}
            centerLabel={t("dashboard.accountant.total")}
            centerValue={alertTotal > 0 ? String(alertTotal) : undefined}
          />
        </DashboardChartCard>
      </DashboardChartsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardPanel
          title={t("dashboard.student.myClassesTitle")}
          action={
            <DashboardInlineLink to={`/${slug}/classroom`}>
              {t("dashboard.student.viewAll")}
            </DashboardInlineLink>
          }
        >
          {classes.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              {t("dashboard.student.noClasses")}
            </p>
          ) : (
            <ul className="space-y-2">
              {classes.map((cls) => (
                <li key={cls.id}>
                  <DashboardListRow to={`/${slug}/classroom/${cls.id}`} label={cls.name} />
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel title={t("dashboard.student.shortcutsTitle")}>
          <div className="grid grid-cols-1 gap-3">
            {[
              { to: "grades", label: t("dashboard.actions.myGrades"), tone: "indigo" as const, icon: Award },
              { to: "online-exams", label: t("dashboard.actions.onlineExams"), tone: "amber" as const, icon: MonitorPlay },
              { to: "attendance", label: t("dashboard.actions.myAttendance"), tone: "rose" as const, icon: UserCheck },
              { to: "my-schedule", label: t("dashboard.actions.mySchedule"), tone: "slate" as const, icon: Calendar },
            ].map((item) => (
              <DashboardLinkTile
                key={item.to}
                to={`/${slug}/${item.to}`}
                icon={item.icon}
                tone={item.tone}
                label={item.label}
              />
            ))}
          </div>
        </DashboardPanel>
      </div>
    </DashboardBodyShell>
  );
}
