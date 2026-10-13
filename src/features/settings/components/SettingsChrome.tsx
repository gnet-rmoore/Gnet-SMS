import React from "react";
import { useTranslation } from "react-i18next";
import {
  Save,
  RefreshCw,
  Settings as SettingsIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { cardShell } from "../../academics-shared/FeatureModalShell";

export type SettingsChromeProps = {
  title?: string;
  subtitle?: string;
  showSave?: boolean;
  saving?: boolean;
  refreshing?: boolean;
  onSave?: () => void;
  onRefresh?: () => void;
};

export function SettingsChrome({
  title,
  subtitle,
  showSave,
  saving,
  refreshing,
  onSave,
  onRefresh,
}: SettingsChromeProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 ${cardShell}`}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          {t("settings.chromeEyebrow")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2 font-dashboard">
          <SettingsIcon className="w-7 h-7 text-indigo-600" />
          {title ?? t("settings.chromeTitle")}
        </h1>
        <p className="text-slate-500 font-medium mt-1">{subtitle ?? t("settings.chromeSubtitle")}</p>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title={t("common:refresh")}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        )}
        {showSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t("common:saving") : t("common:saveChanges")}
          </button>
        )}
      </div>
    </motion.div>
  );
}
