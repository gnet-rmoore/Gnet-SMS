import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { PageShell, Surface } from "./ui";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
};

/**
 * Honest placeholder for specialty modules that do not yet have a real backend.
 * No fake KPIs, seeded lists, or localStorage demos.
 */
export function StubFeaturePage({
  title,
  description,
  icon: Icon = Construction,
}: Props) {
  const { t } = useTranslation("common");
  const body = description ?? t("stubDescription");

  return (
    <PageShell className="pb-16">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Surface className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7 text-slate-500" />
          </div>
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
              {title}
            </h1>
            <p className="text-slate-500 font-medium max-w-2xl">{body}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">
              {t("comingOnline")}
            </p>
            <p className="text-sm text-slate-500 pt-1">{t("stubNotAvailable")}</p>
          </div>
        </Surface>
      </motion.div>

      <Surface variant="empty">
        <p className="text-sm font-bold text-slate-600">{t("stubEmptyTitle")}</p>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          {t("stubEmptyHint")}
        </p>
      </Surface>
    </PageShell>
  );
}
