import React from "react";
import { useTranslation } from "react-i18next";
import { Package, Plus, RefreshCw, Wrench } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "../../../components/ui";

export type MaintenanceChromeProps = {
  canManage: boolean;
  loading?: boolean;
  onAddInventory: () => void;
  onNewWorkOrder: () => void;
  onRefresh: () => void;
  staffCount?: number;
  totalInventory?: number;
  totalWorkOrders?: number;
  title?: string;
  subtitle?: string;
};

export function MaintenanceChrome({
  canManage,
  loading,
  onAddInventory,
  onNewWorkOrder,
  onRefresh,
  staffCount = 0,
  totalInventory = 0,
  totalWorkOrders = 0,
  title,
  subtitle,
}: MaintenanceChromeProps) {
  const { t } = useTranslation(["pages", "common"]);
  const resolvedTitle = title ?? t("facilities.title");
  const resolvedSubtitle = subtitle ?? t("facilities.subtitle");

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-[32px] bg-gradient-to-br from-slate-950 to-slate-900 text-white p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
    >
      <div className="space-y-2 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
          {t("facilities.chromeEyebrow")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 font-dashboard">
          <span className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 text-indigo-300" />
          </span>
          {resolvedTitle}
        </h1>
        <p className="text-slate-300 text-sm font-medium max-w-xl">
          {resolvedSubtitle} ·{" "}
          {t("facilities.workOrderCount", { count: totalWorkOrders })} ·{" "}
          {t("facilities.stockItemCount", { count: totalInventory })} ·{" "}
          {t("facilities.maintenanceStaffCount", { count: staffCount })}
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-3 rounded-xl bg-white/10 border border-white/10 text-slate-200 hover:bg-white/15 transition-colors disabled:opacity-50"
          title={t("common:refresh")}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>

        {canManage && (
          <>
            <button
              type="button"
              onClick={onAddInventory}
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/10 font-bold text-slate-100 hover:bg-white/15 transition-colors flex items-center gap-2 text-sm"
            >
              <Package className="w-4 h-4" />
              {t("facilities.addInventory")}
            </button>
            <Button onClick={onNewWorkOrder}>
              <Plus className="w-4 h-4" />
              {t("facilities.newWorkOrder")}
            </Button>
          </>
        )}
      </div>
    </motion.section>
  );
}
