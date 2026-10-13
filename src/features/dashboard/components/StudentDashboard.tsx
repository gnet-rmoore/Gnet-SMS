import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Award,
  Bell,
  BookOpen,
  CreditCard,
  Calendar,
  MonitorPlay,
  UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/authStore";
import { api } from "../../../services/api";
import { notificationsApi } from "../../notifications/api";
import { workspaceApi } from "../../classroom-workspace/api";
import { formatMoney } from "../../../i18n/format";
import { aggregateFeeStatus, type ChartDatum } from "../lib/chartAggregates";
import {
  DashboardChartCard,
  DashboardChartsGrid,
} from "./charts/DashboardChartCard";
import {
  PremiumDonutChart,
  PremiumHorizontalBarChart,
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
  feesDueCount: number | null;
  feesDueAmount: number | null;
  unreadNotifs: number | null;
};

/**
 * Student home — personal classes, fees, alerts.
 * No school-wide admin stats or fabricated grades/attendance %.
 */
export function StudentDashboard() {
  const { t } = useTranslation("pages");
  const { slug } = useParams();
  const { school } = useAuthStore();
  const [kpis, setKpis] = useState<StudentKpis>({
    classCount: null,
    feesDueCount: null,
    feesDueAmount: null,
    unreadNotifs: null,
  });
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [feeRows, setFeeRows] = useState<unknown[]>([]);
  const [notifSample, setNotifSample] = useState<{ read: number; unread: number }>({
    read: 0,
    unread: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [roomsRes, feesRes, notifRes] = await Promise.allSettled([
          workspaceApi.fetchMyClassrooms(),
          api.get(`/api/my-fees`),
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

        const feesRaw =
          feesRes.status === "fulfilled"
            ? Array.isArray(feesRes.value)
              ? feesRes.value
              : (feesRes.value as any)?.fees || []
            : [];
        const due = feesRaw.filter(
          (f: any) =>
            f.status === "PENDING" || f.status === "OVERDUE" || f.status === "PARTIAL"
        );
        const dueAmount = due.reduce(
          (sum: number, f: any) => sum + Number(f.balance ?? f.amountDue ?? f.amount ?? 0),
          0
        );

        const notifPayload =
          notifRes.status === "fulfilled" ? notifRes.value : { items: [] };
        const notifItems = Array.isArray(notifPayload)
          ? notifPayload
          : (notifPayload as any)?.items ||
            (notifPayload as any)?.notifications ||
            [];
        const unread = notifItems.filter((n: any) => !n.readAt && !n.isRead).length;

        setClasses(roomList.slice(0, 5));
        setFeeRows(feesRaw);
        setNotifSample({
          unread,
          read: Math.max(0, notifItems.length - unread),
        });
        setKpis({
          classCount: roomsRes.status === "fulfilled" ? roomList.length : null,
          feesDueCount: feesRes.status === "fulfilled" ? due.length : null,
          feesDueAmount: feesRes.status === "fulfilled" ? dueAmount : null,
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
  const money =
    kpis.feesDueAmount != null ? formatMoney(kpis.feesDueAmount, "USD") : "—";

  const c = (key: string) => t(`dashboard.charts.${key}`);
  const label = (name: string) =>
    t(`dashboard.charts.labels.${name}`, { defaultValue: name });
  const localize = (data: ChartDatum[]) =>
    data.map((d) => ({ ...d, name: label(d.name) }));

  const feeChart = localize(aggregateFeeStatus(feeRows));
  const feeBalanceChart: ChartDatum[] = feeRows
    .filter((f: any) => ["PENDING", "OVERDUE", "PARTIAL"].includes(String(f.status || "").toUpperCase()))
    .map((f: any, i: number) => ({
      name: String(f.description || f.title || f.label || `Invoice ${i + 1}`).slice(0, 14),
      value: Number(f.balance ?? f.amountDue ?? f.amount ?? 0),
      fill: ["#6366f1", "#f59e0b", "#f43f5e", "#3b82f6"][i % 4],
    }))
    .filter((d) => d.value > 0);
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
          icon={BookOpen}
          badge={t("dashboard.stats.myClasses")}
          label={t("dashboard.stats.myClasses")}
          value={fmt(kpis.classCount)}
        />
        <DashboardKpiTile
          icon={CreditCard}
          tone="rose"
          badge={t("dashboard.stats.feesDue")}
          label={t("dashboard.stats.feesDue")}
          value={fmt(kpis.feesDueCount)}
          subtext={
            kpis.feesDueAmount != null && kpis.feesDueAmount > 0
              ? t("dashboard.student.amountDue", { amount: money })
              : undefined
          }
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
        <DashboardChartCard title={c("feeStatus")} hint={c("feeStatusHint")}>
          <PremiumDonutChart
            data={feeChart}
            emptyMessage={c("noData")}
            centerLabel={t("dashboard.accountant.total")}
            centerValue={feeTotal > 0 ? String(feeTotal) : undefined}
          />
        </DashboardChartCard>
        <DashboardChartCard title={c("pendingObligations")} hint={c("pendingObligationsHint")}>
          <PremiumHorizontalBarChart
            data={feeBalanceChart}
            emptyMessage={c("noData")}
            valueFormatter={(v) => formatMoney(v, "USD")}
          />
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
              { to: "fees", label: t("dashboard.actions.myFees"), tone: "emerald" as const, icon: CreditCard },
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
