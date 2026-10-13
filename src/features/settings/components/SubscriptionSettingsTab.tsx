import React from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  CreditCard,
  Infinity as InfinityIcon,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { featuresByGroup, featureLabel } from "../../../constants/platformFeatures";
import { Button } from "../../../components/ui";

export type SchoolSubscription = {
  planCode: string;
  plan: {
    code: string;
    label: string;
    description: string;
    monthlyPriceUsd: number;
  };
  billingStatus: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  listPriceUsd: number;
  hasCustomEntitlements: boolean;
  hasCustomQuotas: boolean;
  entitlements: string[];
  quotas: {
    maxStudents: number | null;
    maxStaff: number | null;
    maxStorageMb?: number | null;
  };
};

type Props = {
  subscription: SchoolSubscription | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
};

function formatQuota(value: number | null | undefined): string {
  if (value == null) return "∞";
  return value.toLocaleString();
}

function formatStorageMb(value: number | null | undefined): string {
  if (value == null) return "∞";
  if (value >= 1024) return `${(value / 1024).toFixed(value % 1024 === 0 ? 0 : 1)} GB`;
  return `${value.toLocaleString()} MB`;
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function billingTone(status: string): string {
  switch (status) {
    case "ACTIVE_PAID":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "PAST_DUE":
    case "SUSPENDED":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "TRIAL":
      return "bg-amber-50 text-amber-900 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function SubscriptionSettingsTab({
  subscription,
  loading,
  error,
  onRefresh,
}: Props) {
  const { t, i18n } = useTranslation(["pages", "common"]);
  const s = (key: string, opts?: Record<string, unknown>) =>
    t(`settings.subscriptionTab.${key}`, opts);
  const entitlementSet = React.useMemo(
    () => new Set(subscription?.entitlements || []),
    [subscription?.entitlements]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            {s("title")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{s("subtitle")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={onRefresh}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {t("common:refresh")}
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !subscription ? (
        <div className="space-y-4">
          <div className="h-28 rounded-2xl bg-slate-50 animate-pulse" />
          <div className="h-48 rounded-2xl bg-slate-50 animate-pulse" />
        </div>
      ) : subscription ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {s("planLabel")}
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">
                {subscription.plan.label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{subscription.plan.code}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {s("billingStatus")}
              </p>
              <p className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${billingTone(subscription.billingStatus)}`}
                >
                  {s(`billing.${subscription.billingStatus}`, {
                    defaultValue: subscription.billingStatus.replace(/_/g, " "),
                  })}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {s("listPrice")}
              </p>
              <p className="text-sm font-mono font-extrabold text-slate-900 mt-1">
                ${subscription.listPriceUsd}/mo
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {subscription.billingStatus === "TRIAL" ? s("trialEnds") : s("periodEnd")}
              </p>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {subscription.billingStatus === "TRIAL"
                  ? formatDate(subscription.trialEndsAt, i18n.language)
                  : formatDate(subscription.currentPeriodEnd, i18n.language)}
              </p>
            </div>
          </div>

          {subscription.plan.description && (
            <p className="text-sm text-slate-600">{subscription.plan.description}</p>
          )}

          {(subscription.hasCustomEntitlements || subscription.hasCustomQuotas) && (
            <p className="text-sm text-slate-500 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              {s("customizedHint")}
            </p>
          )}

          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
              {s("quotasTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{s("quotasHint")}</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {s("quotaStudents")}
                </p>
                <p className="text-lg font-mono font-extrabold text-slate-900 mt-1 flex items-center gap-1">
                  {formatQuota(subscription.quotas.maxStudents)}
                  {subscription.quotas.maxStudents == null && (
                    <InfinityIcon className="w-4 h-4 text-slate-400" />
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {s("quotaStaff")}
                </p>
                <p className="text-lg font-mono font-extrabold text-slate-900 mt-1 flex items-center gap-1">
                  {formatQuota(subscription.quotas.maxStaff)}
                  {subscription.quotas.maxStaff == null && (
                    <InfinityIcon className="w-4 h-4 text-slate-400" />
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {s("quotaStorage")}
                </p>
                <p className="text-lg font-mono font-extrabold text-slate-900 mt-1">
                  {formatStorageMb(subscription.quotas.maxStorageMb)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
              {s("modulesTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {s("modulesHint", { count: subscription.entitlements.length })}
            </p>
            <div className="mt-4 space-y-6">
              {featuresByGroup().map(({ group, items }) => (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {group}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map(({ key, label }) => {
                      const enabled = entitlementSet.has(key);
                      return (
                        <div
                          key={key}
                          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                            enabled
                              ? "border-emerald-100 bg-emerald-50/60 text-slate-800"
                              : "border-slate-100 bg-slate-50/80 text-slate-400"
                          }`}
                        >
                          {enabled ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 shrink-0 text-slate-300 mt-0.5" />
                          )}
                          <span className="font-semibold leading-snug">
                            {label || featureLabel(key)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">
            {s("contactSupport")}
          </p>
        </>
      ) : null}
    </motion.div>
  );
}
