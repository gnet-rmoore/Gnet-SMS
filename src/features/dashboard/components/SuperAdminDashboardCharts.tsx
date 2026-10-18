import React from "react";
import { useTranslation } from "react-i18next";
import {
  platformHeadcountChart,
  platformSchoolStatusChart,
  type ChartDatum,
} from "../lib/chartAggregates";
import {
  DashboardChartCard,
  DashboardChartsGrid,
} from "./charts/DashboardChartCard";
import {
  PremiumDonutChart,
  PremiumHorizontalBarChart,
} from "./charts/PremiumChartWidgets";

type SuperAdminDashboardChartsProps = {
  statsData: any;
  loading?: boolean;
};

export function SuperAdminDashboardCharts({ statsData, loading }: SuperAdminDashboardChartsProps) {
  const { t } = useTranslation("pages");
  const c = (key: string) => t(`dashboard.charts.${key}`);
  const label = (name: string) =>
    t(`dashboard.charts.labels.${name}`, { defaultValue: name });
  const localize = (data: ChartDatum[]) =>
    data.map((d) => ({ ...d, name: label(d.name) }));

  if (loading) {
    return (
      <DashboardChartsGrid>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-[32px] bg-slate-50" />
        ))}
      </DashboardChartsGrid>
    );
  }

  const schoolStatus = localize(platformSchoolStatusChart(statsData || {}));
  const headcount = localize(platformHeadcountChart(statsData || {}));
  const paid = Number(statsData?.billingMix?.paid ?? 0);
  const unpaid = Number(statsData?.billingMix?.unpaid ?? 0);
  const billing = localize(
    [
      { name: "paidPlans", value: paid, fill: "#10b981" },
      { name: "unpaid", value: unpaid, fill: "#94a3b8" },
    ].filter((d) => d.value > 0)
  );

  const schoolStatusTotal = schoolStatus.reduce((sum, d) => sum + d.value, 0);
  const billingTotal = billing.reduce((sum, d) => sum + d.value, 0);
  const billingPaidPct = billingTotal > 0 ? Math.round((paid / billingTotal) * 100) : 0;

  return (
    <DashboardChartsGrid>
      <DashboardChartCard title={c("platformSchoolStatus")} hint={c("platformSchoolStatusHint")}>
        <PremiumDonutChart
          data={schoolStatus}
          emptyMessage={c("noData")}
          centerLabel={t("dashboard.accountant.total")}
          centerValue={schoolStatusTotal > 0 ? String(schoolStatusTotal) : undefined}
        />
      </DashboardChartCard>
      <DashboardChartCard title={c("platformHeadcount")} hint={c("platformHeadcountHint")}>
        <PremiumHorizontalBarChart data={headcount} emptyMessage={c("noData")} />
      </DashboardChartCard>
      <DashboardChartCard
        title={c("billingMix")}
        hint={c("billingMixHint")}
        badge={
          billingTotal > 0
            ? t("dashboard.charts.billingPaidBadge", { pct: billingPaidPct })
            : undefined
        }
      >
        <PremiumDonutChart
          data={billing}
          emptyMessage={c("noData")}
          centerLabel={t("dashboard.accountant.total")}
          centerValue={billingTotal > 0 ? String(billingTotal) : undefined}
        />
      </DashboardChartCard>
    </DashboardChartsGrid>
  );
}
