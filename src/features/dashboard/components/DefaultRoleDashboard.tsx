import React from "react";
import { RecentActivityPanel } from "./RecentActivityPanel";
import { useTranslation } from "react-i18next";
import { aggregateLogSeverity, type ChartDatum } from "../lib/chartAggregates";
import {
  DashboardChartCard,
  DashboardChartsGrid,
} from "./charts/DashboardChartCard";
import {
  PremiumBarChart,
  PremiumHorizontalBarChart,
} from "./charts/PremiumChartWidgets";
import { DashboardBodyShell } from "./dashboardUi";

export type DefaultRoleDashboardProps = {
  loading?: boolean;
  statsData?: { recentLogs?: any[] } | null;
  user?: unknown;
};

/**
 * Minimal fallback body — recent activity only.
 * No invented attendance charts or static fake events.
 */
export function DefaultRoleDashboard({ loading, statsData }: DefaultRoleDashboardProps) {
  const { t } = useTranslation("pages");
  const c = (key: string) => t(`dashboard.charts.${key}`);
  const label = (name: string) =>
    t(`dashboard.charts.labels.${name}`, { defaultValue: name });
  const logs = statsData?.recentLogs || [];
  const severity = aggregateLogSeverity(logs).map((d) => ({
    ...d,
    name: label(d.name),
  }));
  const byModule = new Map<string, number>();
  for (const log of logs) {
    const mod = String((log as { module?: string })?.module || "other");
    byModule.set(mod, (byModule.get(mod) || 0) + 1);
  }
  const moduleChart: ChartDatum[] = Array.from(byModule.entries())
    .slice(0, 6)
    .map(([name, value], i) => ({
      name,
      value,
      fill: ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#14b8a6"][i % 6],
    }));

  return (
    <DashboardBodyShell>
      <DashboardChartsGrid>
        <DashboardChartCard title={c("recentActivityMix")} hint={c("recentActivityMixHint")}>
          <PremiumHorizontalBarChart data={severity} emptyMessage={c("noData")} />
        </DashboardChartCard>
        <DashboardChartCard title={c("recentActivityMix")} hint={t("dashboard.defaultPanel.recentActivity")}>
          <PremiumBarChart data={moduleChart} emptyMessage={c("noData")} layout="vertical" />
        </DashboardChartCard>
        <DashboardChartCard title={t("dashboard.defaultPanel.recentActivity")} hint={c("recentActivityMixHint")}>
          <PremiumHorizontalBarChart
            data={
              logs.length > 0
                ? [{ name: "info", value: logs.length, fill: "#6366f1" }].map((d) => ({
                    ...d,
                    name: t("dashboard.defaultPanel.recentActivity"),
                  }))
                : []
            }
            emptyMessage={c("noData")}
          />
        </DashboardChartCard>
      </DashboardChartsGrid>
      <RecentActivityPanel loading={loading} recentLogs={statsData?.recentLogs} />
    </DashboardBodyShell>
  );
}
