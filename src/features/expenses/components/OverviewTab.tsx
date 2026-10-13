import React from "react";
import {
  Download,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { CATEGORY_CHART, CATEGORY_BADGE } from "../categoryStyles";

export type OverviewTabProps = {
  handleDownloadPLReport?: () => void;
  metrics?: any;
  summary?: any;
};

export function OverviewTab({
  handleDownloadPLReport,
  metrics,
  summary,
}: OverviewTabProps) {
  const { t } = useTranslation(["pages", "common"]);

  const net = summary?.totals?.netCashFlow ?? 0;
  const feesIn = summary?.totals?.totalRevenue ?? metrics?.totalIn ?? 0;
  const expensesOut = summary?.totals?.totalExpenses ?? 0;
  const payrollOut = summary?.totals?.totalPayroll ?? 0;
  const pendingRev = summary?.totals?.pendingRevenue ?? 0;
  const pendingExp = summary?.totals?.pendingExpenses ?? 0;

  const chartColors = CATEGORY_CHART;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-[32px] text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              {t("expenses.overview.netCash")}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{t("expenses.overview.feesMinusExpPayroll")}</p>
          <p className="text-2xl font-extrabold tracking-tight font-mono mt-1">
            ${Number(net).toLocaleString()}
          </p>
        </div>

        <div className={`${cardShell} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              {t("expenses.overview.inflow")}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{t("expenses.overview.feesCollected")}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            ${Number(feesIn).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {t("expenses.overview.pendingAmount", {
              amount: `$${Number(pendingRev).toLocaleString()}`,
            })}
          </p>
        </div>

        <div className={`${cardShell} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
              {t("expenses.overview.expensesLabel")}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{t("expenses.overview.approvedExpenses")}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            ${Number(expensesOut).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {t("expenses.overview.pendingAmount", {
              amount: `$${Number(pendingExp).toLocaleString()}`,
            })}
          </p>
        </div>

        <div className={`${cardShell} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-1 rounded-lg">
              {t("expenses.overview.payrollLabel")}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{t("expenses.overview.paidPayroll")}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            ${Number(payrollOut).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${cardShell} p-6 sm:p-8 space-y-4`}>
          <div className="flex justify-between items-start gap-3">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                {t("expenses.overview.cashFlow")}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {t("expenses.overview.cashFlowHint")}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs uppercase tracking-wider shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
              {t("expenses.overview.summary")}
            </span>
          </div>

          <div className="h-72">
            {summary?.chartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={summary.chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    name={t("expenses.overview.chartFeesIn")}
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGradient)"
                  />
                  <Area
                    type="monotone"
                    name={t("expenses.overview.chartOutflow")}
                    dataKey="expenses"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expensesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                {t("expenses.overview.noCashFlowData")}
              </div>
            )}
          </div>
        </div>

        <div className={`${cardShell} p-6 sm:p-8 flex flex-col`}>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("expenses.overview.byCategory")}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">{t("expenses.overview.byCategoryHint")}</p>
          </div>

          <div className="h-44 flex items-center justify-center relative flex-1">
            {summary?.categoriesBreakdown?.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.categoriesBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="category"
                    >
                      {summary.categoriesBreakdown.map(
                        (entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={chartColors[entry.category] || "#6B7280"}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t("common:total")}
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    ${Number(expensesOut).toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-sm font-medium">
                {t("expenses.overview.noCategoriesYet")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-slate-100">
            {summary?.categoriesBreakdown?.slice(0, 6).map((item: any) => (
              <div key={item.category} className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider truncate max-w-full ${
                    CATEGORY_BADGE[item.category] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t(`expenses.categories.${item.category}`, { defaultValue: item.category })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-8 rounded-[32px] text-white space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-4 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {t("expenses.overview.statement")}
            </p>
            <h3 className="text-xl font-extrabold tracking-tight mt-1">
              {t("expenses.overview.profitLoss")}
            </h3>
          </div>
          <button
            type="button"
            id="download-pl-pdf-btn"
            onClick={handleDownloadPLReport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("expenses.exportPdf")}
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <span>{t("expenses.overview.revenue")}</span>
              <span>{t("expenses.overview.amount")}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>{t("expenses.overview.feesCollected")}</span>
              <span className="font-mono">${Number(feesIn).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-white/50">
              <span>{t("expenses.overview.feesPending")}</span>
              <span className="font-mono">${Number(pendingRev).toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex justify-between text-rose-300 text-xs font-bold uppercase tracking-wider">
              <span>{t("expenses.overview.costs")}</span>
              <span>{t("expenses.overview.amount")}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>{t("expenses.overview.approvedExpenses")}</span>
              <span className="font-mono">${Number(expensesOut).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>{t("expenses.overview.payrollLabel")}</span>
              <span className="font-mono">${Number(payrollOut).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-white/50">
              <span>{t("expenses.overview.pendingExpenses")}</span>
              <span className="font-mono">${Number(pendingExp).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/10">
            <div>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                {t("expenses.overview.netSurplus")}
              </p>
              <p className="text-2xl font-extrabold tracking-tight font-mono mt-1">
                ${Number(net).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
