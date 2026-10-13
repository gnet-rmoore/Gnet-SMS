import React from "react";
import { Download, PieChart, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { cardShell } from "../../academics-shared/FeatureModalShell";

export type ReportsChromeProps = {
  canExport: boolean;
  loading?: boolean;
  onExport: () => void;
  onRefresh: () => void;
  subtitle?: string;
  title?: string;
};

export function ReportsChrome({
  canExport,
  loading,
  onExport,
  onRefresh,
  subtitle = "Live counts from attendance, roster, and finance — no placeholder figures.",
  title = "School Reports",
}: ReportsChromeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 ${cardShell}`}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          Insights
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2 font-dashboard">
          <PieChart className="w-7 h-7 text-indigo-600" />
          {title}
        </h1>
        <p className="text-slate-500 font-medium mt-1">{subtitle}</p>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </motion.div>
  );
}
