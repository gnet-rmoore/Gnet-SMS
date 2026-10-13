import React from "react";
import { TrendingUp, BarChart3, Percent, LineChart as LineIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { cardShell } from "../../academics-shared/FeatureModalShell";

export type AnalyticsTabProps = {
  forecastData?: any[];
  forecastModel?: "conservative" | "neutral" | "optimistic";
  metrics?: any;
  setForecastModel?: (m: "conservative" | "neutral" | "optimistic") => void;
};

export function AnalyticsTab({
  forecastData = [],
  forecastModel = "neutral",
  metrics,
  setForecastModel,
}: AnalyticsTabProps) {
  const { t } = useTranslation(["pages", "common"]);

  const hasForecast = forecastData.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${cardShell} p-6 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("expenses.analytics.avgMonthlyOutflow")}
            </p>
            <p className="text-xl font-extrabold tracking-tight text-slate-900 font-mono mt-0.5">
              ${Math.round(metrics?.monthlyBurnRate || 0).toLocaleString()}
              <span className="text-sm font-bold text-slate-400">{t("expenses.analytics.perMonth")}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">{t("expenses.analytics.avgOutflowHint")}</p>
          </div>
        </div>

        <div className={`${cardShell} p-6 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("expenses.analytics.feeCollection")}
            </p>
            <p className="text-xl font-extrabold tracking-tight text-slate-900 font-mono mt-0.5">
              {metrics?.feeCollectionEfficiency ?? 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">{t("expenses.analytics.feeCollectionHint")}</p>
          </div>
        </div>

        <div className={`${cardShell} p-6 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("expenses.analytics.operatingRatio")}
            </p>
            <p className="text-xl font-extrabold tracking-tight text-slate-900 font-mono mt-0.5">
              {metrics?.operatingRatio ?? 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">{t("expenses.analytics.operatingRatioHint")}</p>
          </div>
        </div>
      </div>

      <div className={`${cardShell} p-6 sm:p-8 space-y-6`}>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("expenses.analytics.forecastTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {t("expenses.analytics.forecastHint")}
            </p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {(["conservative", "neutral", "optimistic"] as const).map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => setForecastModel?.(model)}
                disabled={!hasForecast}
                className={`px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                  forecastModel === model
                    ? "bg-white text-indigo-600 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t(`expenses.analytics.${model}`)}
              </button>
            ))}
          </div>
        </div>

        {hasForecast ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  type="monotone"
                  name={t("expenses.analytics.chartProjectedRevenue")}
                  dataKey="projectedRevenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  name={t("expenses.analytics.chartProjectedCosts")}
                  dataKey="projectedCosts"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  name={t("expenses.analytics.chartCumulativeCash")}
                  dataKey="projectedCumulative"
                  stroke="#6366F1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <LineIcon className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("expenses.analytics.noForecastTitle")}
            </h4>
            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              {t("expenses.analytics.noForecastHint")}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
