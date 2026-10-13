import React from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, RefreshCw, Wrench } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { Button } from "../../../components/ui";

export type WorkOrdersChromeProps = {
  canCreate: boolean;
  loading?: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  openCount: number;
  slug: string;
  title?: string;
  subtitle?: string;
};

export function WorkOrdersChrome({
  canCreate,
  loading,
  onCreate,
  onRefresh,
  openCount,
  slug,
  title,
  subtitle,
}: WorkOrdersChromeProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-8 ${cardShell}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          {t("workOrders.eyebrow")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2 font-dashboard">
          <ClipboardList className="w-7 h-7 text-indigo-600 shrink-0" />
          {title || t("workOrders.title")}
        </h1>
        <p className="text-slate-500 font-medium mt-1 max-w-xl">
          {subtitle || t("workOrders.subtitle")}
          {openCount > 0 ? (
            <span className="text-slate-700">
              {" "}
              {t("workOrders.openRightNow", { count: openCount })}
            </span>
          ) : null}
        </p>
        <Link
          to={`/${slug}/maintenance`}
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-700"
        >
          <Wrench className="w-3.5 h-3.5" />
          {t("workOrders.openFacilitiesHub")}
        </Link>
      </div>

      <div className="flex items-center flex-wrap gap-2 shrink-0">
        <Button
          variant="secondary"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          title={t("common:refresh")}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </Button>

        {canCreate && (
          <Button onClick={onCreate}>
            <Plus className="w-4 h-4" />
            {t("workOrders.newWorkOrder")}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
