import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { pageShellClass } from "../../../components/ui";
import { QuickActionRow } from "./QuickActionRow";
import type { QuickActionDef } from "../registry";

export type RoleHomeShellProps = {
  title: string;
  subtitle: string;
  slug: string | undefined;
  quickActions: QuickActionDef[];
  capabilities: string[] | null | undefined;
  showQuickActions?: boolean;
  guideTrack?: boolean;
  guideIncomplete?: boolean;
  onStartTour?: () => void;
  children: React.ReactNode;
};

/** Shared dashboard chrome: title, optional guide, quick actions, body. */
export function RoleHomeShell({
  title,
  subtitle,
  slug,
  quickActions,
  capabilities,
  showQuickActions = true,
  guideTrack,
  guideIncomplete,
  onStartTour,
  children,
}: RoleHomeShellProps) {
  const { t } = useTranslation("pages");

  return (
    <div className={pageShellClass.default}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
              {title}
            </h1>
            {guideTrack ? (
              <Link
                to={`/${slug}/guide`}
                className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t("guide.eyebrow")}</span>
              </Link>
            ) : null}
          </div>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>
        {showQuickActions ? (
          <QuickActionRow
            slug={slug}
            actions={quickActions}
            capabilities={capabilities}
          />
        ) : null}
      </div>

      {guideTrack && guideIncomplete ? (
        <div className="flex flex-col gap-3 rounded-[28px] border border-indigo-100 bg-indigo-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-tight text-slate-900">
              {t("guide.dashboardBannerTitle")}
            </p>
            <p className="mt-1 text-sm text-slate-600">{t("guide.dashboardBannerBody")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onStartTour?.()}
              className="inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              {t("guide.continue")}
            </button>
            <Link
              to={`/${slug}/guide`}
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              {t("guide.dashboardBannerCta")}
            </Link>
          </div>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-8"
      >
        {children}
      </motion.div>
    </div>
  );
}
