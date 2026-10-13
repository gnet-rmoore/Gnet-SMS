import {
  DollarSign,
  AlertCircle,
  TrendingUp,
  FileText,
  History,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
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
import { CATEGORY_COLORS } from "../types";
import { formatMoney } from "../../../i18n/format";

export type OverviewTabProps = {
  analytics: {
    totalCollected: number;
    totalOverdue: number;
    totalExpected: number;
    overdueCount: number;
    pendingCount: number;
    efficiency: number;
    trends: any[];
    categoryBreakdown: any[];
  };
  feeRecords: any[];
  onViewHistory?: () => void;
};

export function OverviewTab({ analytics, feeRecords, onViewHistory }: OverviewTabProps) {
  const { t } = useTranslation("pages");
  const activeCount = feeRecords.filter((r) => r.status !== "VOIDED").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {onViewHistory && (
        <button
          type="button"
          onClick={onViewHistory}
          className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
        >
          <History className="w-4 h-4" />
          {t("fees.overview.viewHistory")}
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-[32px] text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              {t("fees.overview.collected")}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{t("fees.overview.feesCollected")}</p>
          <p className="text-2xl font-extrabold tracking-tight font-mono">
            {formatMoney(analytics.totalCollected)}
          </p>
        </div>

        <div className={`${cardShell} p-6 space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
              {t("fees.overview.overdue")}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{t("fees.overview.overdueBalances")}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {formatMoney(analytics.totalOverdue)}
          </p>
          <p className="text-xs text-slate-500">
            {t(
              analytics.overdueCount === 1
                ? "fees.overview.invoiceCount"
                : "fees.overview.invoiceCount_plural",
              { count: analytics.overdueCount }
            )}
          </p>
        </div>

        <div className={`${cardShell} p-6 space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              {t("fees.overview.rate")}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{t("fees.overview.collectionRate")}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {analytics.efficiency}%
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.min(100, analytics.efficiency)}%` }}
            />
          </div>
        </div>

        <div className={`${cardShell} p-6 space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
              {t("fees.overview.invoiced")}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{t("fees.overview.totalInvoiced")}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {formatMoney(analytics.totalExpected)}
          </p>
          <p className="text-xs text-slate-500">
            {t("fees.overview.activePending", {
              active: activeCount,
              pending: analytics.pendingCount,
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${cardShell} p-6 sm:p-8 space-y-4`}>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("fees.overview.collectionsOverTime")}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{t("fees.overview.collectionsOverTimeHint")}</p>
          </div>
          <div className="h-72">
            {analytics.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.trends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #f1f5f9",
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "12px", fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    name={t("fees.overview.chartCollected")}
                    dataKey="Collected"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorColl)"
                  />
                  <Area
                    type="monotone"
                    name={t("fees.overview.chartOutstanding")}
                    dataKey="Pending"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                {t("fees.overview.noChartData")}
              </div>
            )}
          </div>
        </div>

        <div className={`${cardShell} p-6 sm:p-8 space-y-4 flex flex-col`}>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("fees.overview.byFeeType")}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{t("fees.overview.byFeeTypeHint")}</p>
          </div>

          <div className="h-44 flex items-center justify-center relative">
            {analytics.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="Total"
                    nameKey="name"
                  >
                    {analytics.categoryBreakdown.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          CATEGORY_COLORS[entry.name.toUpperCase().replace(/ /g, "_")] ||
                          CATEGORY_COLORS[entry.name.toUpperCase()] ||
                          "#8B5CF6"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #f1f5f9",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm font-medium">{t("fees.overview.noDataYet")}</p>
            )}
            {analytics.categoryBreakdown.length > 0 && (
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("fees.overview.total")}
                </span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">
                  {formatMoney(analytics.totalExpected)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-600 pt-4 border-t border-slate-100 mt-auto">
            {analytics.categoryBreakdown.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[item.name.toUpperCase().replace(/ /g, "_")] ||
                      "#8B5CF6",
                  }}
                />
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
