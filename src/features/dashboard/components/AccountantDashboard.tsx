import React from "react";
import { useTranslation } from "react-i18next";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  CreditCard,
  Receipt,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { CATEGORY_CHART, CATEGORY_BADGE } from "../../expenses/categoryStyles";
import { formatMoney } from "../../../i18n/format";
import {
  DashboardChartCard,
  DashboardChartsGrid,
} from "./charts/DashboardChartCard";
import {
  DashboardFeaturedChartRow,
  DashboardFeaturedChartSide,
  DashboardFeaturedChartWide,
} from "./charts/DashboardFeaturedChartRow";
import { DashboardAreaChart, DashboardDonutChart } from "./charts/FinanceChartWidgets";
import { SimpleBarChart, SimpleLineChart } from "./charts/SimpleCharts";
import {
  DASHBOARD_CARD,
  DashboardBodyShell,
  DashboardHeroKpi,
  DashboardKpiSkeleton,
  DashboardKpiTile,
  DashboardLinkTile,
  DashboardPanel,
} from "./dashboardUi";

export type AccountantDashboardProps = {
  financeSummary?: any;
  user?: any;
  navigate?: (path: string) => void;
  slug?: string;
  loading?: boolean;
};

function money(n: number | undefined | null) {
  return formatMoney(Number(n || 0), "USD");
}

/**
 * Finance home for ACCOUNTANT (and school admin finance view).
 * Uses Finance `/finance/summary` only — no invented % deltas.
 */
export function AccountantDashboard({
  financeSummary,
  slug,
  loading,
}: AccountantDashboardProps) {
  const { t } = useTranslation("pages");
  const base = slug ? `/${slug}` : "";
  const totals = financeSummary?.totals;
  const chartData = Array.isArray(financeSummary?.chartData)
    ? financeSummary.chartData
    : [];
  const categories = Array.isArray(financeSummary?.categoriesBreakdown)
    ? financeSummary.categoriesBreakdown
    : [];

  const net = totals?.netCashFlow ?? 0;
  const feesIn = totals?.totalRevenue ?? 0;
  const pendingRev = totals?.pendingRevenue ?? 0;
  const expensesOut = totals?.totalExpenses ?? 0;
  const pendingExp = totals?.pendingExpenses ?? 0;
  const payrollOut = totals?.totalPayroll ?? 0;
  const pendingPayroll = totals?.pendingPayroll ?? 0;
  const outflow = expensesOut + payrollOut;

  const pendingChart = [
    { name: "feesPending", value: pendingRev, fill: "#10b981" },
    { name: "expensesPending", value: pendingExp, fill: "#f43f5e" },
    { name: "payrollPending", value: pendingPayroll, fill: "#6366f1" },
  ]
    .filter((d) => d.value > 0)
    .map((d) => ({
      ...d,
      name: t(`dashboard.charts.labels.${d.name}`, { defaultValue: d.name }),
    }));

  const surplusSeries = chartData
    .map((row: any) => ({
      name: String(row.month || ""),
      value: Number(row.surplus ?? Number(row.income || 0) - Number(row.expenses || 0)),
    }))
    .filter((d) => d.name);

  if (loading) {
    return <DashboardKpiSkeleton count={4} />;
  }

  return (
    <DashboardBodyShell>
      {!financeSummary && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{t("dashboard.accountant.summaryUnavailable")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardHeroKpi
          icon={Wallet}
          badge={t("dashboard.accountant.netCash")}
          label={t("dashboard.accountant.feesMinusExpPayroll")}
          value={money(net)}
          valueClassName={net >= 0 ? "text-white" : "text-rose-300"}
        />
        <DashboardKpiTile
          icon={ArrowUpRight}
          tone="emerald"
          badge={t("dashboard.accountant.inflow")}
          label={t("dashboard.accountant.feesCollected")}
          value={money(feesIn)}
          subtext={
            <span className="font-mono">
              {t("dashboard.accountant.pendingAmount", { amount: money(pendingRev) })}
            </span>
          }
        />
        <DashboardKpiTile
          icon={ArrowDownRight}
          tone="rose"
          badge={t("dashboard.accountant.outflow")}
          label={t("dashboard.accountant.expensesPlusPayroll")}
          value={money(outflow)}
          subtext={t("dashboard.accountant.expensesPayrollBreakdown", {
            expenses: money(expensesOut),
            payroll: money(payrollOut),
          })}
        />
        <DashboardKpiTile
          icon={FileText}
          tone="amber"
          badge={t("dashboard.accountant.open")}
          label={t("dashboard.accountant.awaitingAction")}
          value={money(pendingRev + pendingExp + pendingPayroll)}
          subtext={t("dashboard.accountant.pendingBuckets")}
        />
      </div>

      <DashboardFeaturedChartRow>
        <DashboardFeaturedChartWide>
          <DashboardPanel
            title={t("dashboard.accountant.cashFlow")}
            hint={t("dashboard.accountant.cashFlowHint")}
            badge={
              <>
                <TrendingUp className="w-3.5 h-3.5" />
                {t("dashboard.accountant.lastMonths")}
              </>
            }
          >
            <DashboardAreaChart
              data={chartData}
              emptyMessage={t("dashboard.accountant.noCashFlowHistory")}
              series={[
                {
                  dataKey: "income",
                  name: t("dashboard.accountant.feesIn"),
                  stroke: "#10B981",
                  gradientStops: [
                    { offset: "5%", color: "#10B981", opacity: 0.15 },
                    { offset: "95%", color: "#10B981", opacity: 0 },
                  ],
                },
                {
                  dataKey: "expenses",
                  name: t("dashboard.accountant.outflowSeries"),
                  stroke: "#EF4444",
                  gradientStops: [
                    { offset: "5%", color: "#EF4444", opacity: 0.15 },
                    { offset: "95%", color: "#EF4444", opacity: 0 },
                  ],
                },
              ]}
            />
          </DashboardPanel>
        </DashboardFeaturedChartWide>

        <DashboardFeaturedChartSide>
          <div className={`${DASHBOARD_CARD} flex flex-col p-6 sm:p-8`}>
            <div className="mb-4">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                {t("dashboard.accountant.expenseMix")}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {t("dashboard.accountant.approvedByCategory")}
              </p>
            </div>
            <DashboardDonutChart
              data={categories}
              emptyMessage={t("dashboard.accountant.noApprovedExpenses")}
              centerLabel={t("dashboard.accountant.total")}
              centerValue={money(expensesOut)}
              getFill={(entry) => CATEGORY_CHART[entry.category || ""] || "#6B7280"}
              footerItems={categories.slice(0, 6).map((item: any) => ({
                key: item.category,
                label: item.category,
                value: money(item.value),
                badgeClassName: CATEGORY_BADGE[item.category] || "bg-slate-100 text-slate-600",
              }))}
            />
          </div>
        </DashboardFeaturedChartSide>
      </DashboardFeaturedChartRow>

      <DashboardChartsGrid>
        <DashboardChartCard
          title={t("dashboard.accountant.pendingObligations")}
          hint={t("dashboard.accountant.pendingObligationsHint")}
        >
          <SimpleBarChart
            data={pendingChart}
            emptyMessage={t("dashboard.charts.noData")}
            layout="horizontal"
            valueFormatter={(v) => money(v)}
          />
        </DashboardChartCard>
        <DashboardChartCard
          title={t("dashboard.accountant.monthlySurplus")}
          hint={t("dashboard.accountant.monthlySurplusHint")}
          className="lg:col-span-2"
        >
          <SimpleLineChart
            data={surplusSeries}
            emptyMessage={t("dashboard.accountant.noSurplusHistory")}
            valueFormatter={(v) => money(v)}
            showAreaFill
          />
        </DashboardChartCard>
      </DashboardChartsGrid>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardLinkTile
          to={`${base}/fees`}
          icon={CreditCard}
          tone="emerald"
          label={t("dashboard.accountant.feesLedger")}
          description={t("dashboard.accountant.feesLedgerDesc")}
        />
        <DashboardLinkTile
          to={`${base}/expenses`}
          icon={Receipt}
          tone="rose"
          label={t("dashboard.accountant.expenses")}
          description={t("dashboard.accountant.expensesDesc")}
        />
        <DashboardLinkTile
          to={`${base}/payroll`}
          icon={FileText}
          tone="indigo"
          label={t("dashboard.accountant.payroll")}
          description={t("dashboard.accountant.payrollDesc")}
        />
      </div>
    </DashboardBodyShell>
  );
}
