import React from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { reportsApi } from "../../reports/api";
import {
  aggregateInventoryStock,
  aggregateLogSeverity,
  aggregateWorkOrderStatus,
  attendanceSnapshot,
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
import { DASHBOARD_CARD } from "./dashboardUi";

type SpecialtyChartsProps = {
  role: string | undefined;
  schoolId: string | undefined;
};

type ChartBundle = {
  primary: ChartDatum[];
  secondary: ChartDatum[];
  tertiary: ChartDatum[];
  loading: boolean;
};

function countLeavePending(rows: unknown): number {
  const list = Array.isArray(rows) ? rows : (rows as { items?: unknown[] })?.items || [];
  return list.filter((r) => {
    const status = String((r as { status?: string })?.status || "").toUpperCase();
    return status === "PENDING" || status === "SUBMITTED";
  }).length;
}

/** Role-aware charts for specialty ops dashboards — real API data only. */
export function SpecialtyDashboardCharts({ role, schoolId }: SpecialtyChartsProps) {
  const { t } = useTranslation("pages");
  const c = (key: string) => t(`dashboard.charts.${key}`);

  const [bundle, setBundle] = React.useState<ChartBundle>({
    primary: [],
    secondary: [],
    tertiary: [],
    loading: true,
  });

  React.useEffect(() => {
    if (!schoolId || !role) {
      setBundle({ primary: [], secondary: [], tertiary: [], loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      setBundle((b) => ({ ...b, loading: true }));
      try {
        const needsWorkOrders = ["MAINTENANCE", "VPA", "PROCUREMENT"].includes(role);
        const needsInventory = [
          "MAINTENANCE",
          "PROCUREMENT",
          "LIBRARIAN",
          "NURSE",
          "CAFETERIA_MANAGER",
        ].includes(role);
        const needsAttendance = [
          "HOSTEL_WARDEN",
          "NURSE",
          "SECURITY",
          "COUNSELOR",
          "ATHLETICS_DIRECTOR",
          "TRANSPORTATION",
        ].includes(role);
        const needsLeave = ["VPA", "HOSTEL_WARDEN"].includes(role);

        const [stats, attendance, workOrders, inventory, leaveRows] = await Promise.all([
          api.get(`/api/schools/${schoolId}/stats`).catch(() => null),
          needsAttendance
            ? reportsApi.fetchAttendanceStats(schoolId).catch(() => null)
            : Promise.resolve(null),
          needsWorkOrders
            ? reportsApi.fetchWorkOrders(schoolId).catch(() => [])
            : Promise.resolve([]),
          needsInventory
            ? api.get(`/api/schools/${schoolId}/inventory`).catch(() => [])
            : Promise.resolve([]),
          needsLeave
            ? reportsApi.fetchLeaveRequests(schoolId).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (cancelled) return;

        const logs = Array.isArray((stats as { recentLogs?: unknown[] })?.recentLogs)
          ? (stats as { recentLogs: unknown[] }).recentLogs
          : [];
        const woList = Array.isArray(workOrders)
          ? workOrders
          : (workOrders as { items?: unknown[] })?.items || [];
        const invList = Array.isArray(inventory)
          ? inventory
          : (inventory as { items?: unknown[] })?.items || [];

        let primary: ChartDatum[] = [];
        let secondary: ChartDatum[] = [];
        let tertiary: ChartDatum[] = [];

        if (role === "MAINTENANCE") {
          primary = aggregateWorkOrderStatus(woList);
          secondary = aggregateInventoryStock(invList);
          tertiary = aggregateLogSeverity(logs);
        } else if (role === "HOSTEL_WARDEN") {
          primary = attendanceSnapshot(attendance);
          secondary = [
            {
              name: "pendingLeave",
              value: countLeavePending(leaveRows),
              fill: "#6366f1",
            },
          ].filter((d) => d.value > 0);
          tertiary = aggregateLogSeverity(logs);
        } else if (role === "PROCUREMENT" || role === "CAFETERIA_MANAGER") {
          primary = aggregateInventoryStock(invList);
          secondary = aggregateWorkOrderStatus(woList);
          tertiary = aggregateLogSeverity(logs);
        } else if (role === "IT_ADMIN" || role === "SECURITY") {
          primary = aggregateLogSeverity(logs);
          secondary = attendanceSnapshot(attendance);
          tertiary = aggregateWorkOrderStatus(woList);
        } else {
          primary = attendanceSnapshot(attendance);
          secondary = aggregateLogSeverity(logs);
          tertiary = aggregateInventoryStock(invList);
        }

        setBundle({ primary, secondary, tertiary, loading: false });
      } catch {
        if (!cancelled) {
          setBundle({ primary: [], secondary: [], tertiary: [], loading: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, schoolId]);

  const titlesForRole = (): [string, string, string] => {
    switch (role) {
      case "MAINTENANCE":
        return [c("workOrderStatus"), c("inventoryStock"), c("recentActivityMix")];
      case "HOSTEL_WARDEN":
        return [c("attendanceToday"), c("pendingLeave"), c("recentActivityMix")];
      case "PROCUREMENT":
      case "CAFETERIA_MANAGER":
        return [c("inventoryStock"), c("workOrderStatus"), c("recentActivityMix")];
      case "IT_ADMIN":
      case "SECURITY":
        return [c("recentActivityMix"), c("attendanceToday"), c("workOrderStatus")];
      default:
        return [c("attendanceToday"), c("recentActivityMix"), c("inventoryStock")];
    }
  };

  const hintsForRole = (): [string, string, string] => {
    switch (role) {
      case "MAINTENANCE":
        return [c("workOrderStatusHint"), c("inventoryStockHint"), c("recentActivityMixHint")];
      case "HOSTEL_WARDEN":
        return [c("attendanceTodayHint"), c("pendingLeaveHint"), c("recentActivityMixHint")];
      case "PROCUREMENT":
      case "CAFETERIA_MANAGER":
        return [c("inventoryStockHint"), c("workOrderStatusHint"), c("recentActivityMixHint")];
      default:
        return [c("attendanceTodayHint"), c("recentActivityMixHint"), c("inventoryStockHint")];
    }
  };

  const [t1, t2, t3] = titlesForRole();
  const [h1, h2, h3] = hintsForRole();

  if (bundle.loading) {
    return (
      <DashboardChartsGrid>
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-72 animate-pulse ${DASHBOARD_CARD} bg-slate-50`} />
        ))}
      </DashboardChartsGrid>
    );
  }

  const chartType = (data: ChartDatum[], index: number) => {
    const usePie = index === 0 && data.length <= 4 && data.every((d) => d.fill);
    const label = (name: string) => c(`labels.${name}` as "dashboard.charts.labels.students") || name;
    const localized = data.map((d) => ({ ...d, name: label(d.name) }));
    const total = localized.reduce((sum, d) => sum + d.value, 0);
    const empty = c("noData");

    if (usePie) {
      return (
        <PremiumDonutChart
          data={localized}
          emptyMessage={empty}
          centerLabel={t("dashboard.accountant.total")}
          centerValue={total > 0 ? String(total) : undefined}
        />
      );
    }
    return (
      <PremiumBarChart
        data={localized}
        emptyMessage={empty}
        layout={data.length <= 3 ? "horizontal" : "vertical"}
        tall={data.length <= 3}
      />
    );
  };

  return (
    <DashboardChartsGrid>
      <DashboardChartCard title={t1} hint={h1}>
        {chartType(bundle.primary, 0)}
      </DashboardChartCard>
      <DashboardChartCard title={t2} hint={h2}>
        {chartType(bundle.secondary, 1)}
      </DashboardChartCard>
      <DashboardChartCard title={t3} hint={h3}>
        {chartType(bundle.tertiary, 2)}
      </DashboardChartCard>
    </DashboardChartsGrid>
  );
}
