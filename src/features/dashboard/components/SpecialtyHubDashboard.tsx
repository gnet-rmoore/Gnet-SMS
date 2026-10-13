import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SMS_SHADOW_SURFACE } from "../../../components/ui";
import type { HubCardDef } from "../registry";
import { hasCapability, navCapabilityKey } from "../../../lib/capabilities";
import { useAuthStore } from "../../../store/authStore";
import { SpecialtyDashboardCharts } from "./SpecialtyDashboardCharts";
import {
  DashboardBodyShell,
  DashboardLinkTile,
  dashboardToneAt,
} from "./dashboardUi";

export type SpecialtyHubDashboardProps = {
  hubs: HubCardDef[];
  role?: string;
  schoolId?: string;
};

/**
 * Specialty ops home — large cards to role hubs.
 * No invented domain KPIs; stubs still deep-link honestly.
 */
export function SpecialtyHubDashboard({ hubs, role, schoolId }: SpecialtyHubDashboardProps) {
  const { t } = useTranslation("pages");
  const { slug } = useParams();
  const capabilities = useAuthStore((s) => s.capabilities);

  const visible = hubs.filter((h) => {
    if (!Array.isArray(capabilities)) return true;
    return hasCapability(capabilities, navCapabilityKey(h.path));
  });

  if (visible.length === 0) {
    return (
      <DashboardBodyShell>
        <SpecialtyDashboardCharts role={role} schoolId={schoolId} />
        <div
          className={`rounded-[32px] border border-dashed border-slate-200 bg-white py-16 text-center px-6 ${SMS_SHADOW_SURFACE}`}
        >
          <p className="text-slate-500 text-sm font-medium">{t("dashboard.hubs.empty")}</p>
        </div>
      </DashboardBodyShell>
    );
  }

  return (
    <DashboardBodyShell>
      <SpecialtyDashboardCharts role={role} schoolId={schoolId} />
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("dashboard.hubs.title")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t("dashboard.hubs.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((hub, i) => {
            const Icon = hub.icon;
            return (
              <DashboardLinkTile
                key={hub.path}
                to={`/${slug}/${hub.path}`}
                icon={Icon}
                tone={dashboardToneAt(i)}
                label={t(hub.labelKey)}
                description={hub.hintKey ? t(hub.hintKey) : undefined}
              />
            );
          })}
        </div>
      </div>
    </DashboardBodyShell>
  );
}
