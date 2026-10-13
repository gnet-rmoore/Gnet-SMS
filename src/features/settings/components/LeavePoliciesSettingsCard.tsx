import React from "react";
import { useTranslation } from "react-i18next";

export type LeavePolicyRow = {
  id?: string;
  type: string;
  annualDays: number;
  isActive: boolean;
};

type Props = {
  policies: LeavePolicyRow[];
  setPolicies: (rows: LeavePolicyRow[]) => void;
  saving?: boolean;
  onSave?: () => void;
};

const card =
  "rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 sm:p-8 space-y-5";

function formatType(type: string) {
  return type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function LeavePoliciesSettingsCard({ policies, setPolicies, saving, onSave }: Props) {
  const { t } = useTranslation(["pages", "common"]);

  const patchRow = (type: string, partial: Partial<LeavePolicyRow>) => {
    setPolicies(
      policies.map((p) => (p.type === type ? { ...p, ...partial } : p))
    );
  };

  return (
    <div className={card}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("settings.leavePolicies.title")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t("settings.leavePolicies.subtitle")}</p>
        </div>
        {onSave && (
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? t("common:saving") : t("settings.leavePolicies.save")}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
        {t("settings.leavePolicies.hint")}
      </p>

      <div className="space-y-3">
        {policies.map((policy) => (
          <div
            key={policy.type}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/80"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">{formatType(policy.type)}</p>
              <p className="text-xs text-slate-500 font-mono">{policy.type}</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>{t("settings.leavePolicies.annualDays")}</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={policy.annualDays}
                  onChange={(e) =>
                    patchRow(policy.type, {
                      annualDays: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.isActive}
                  onChange={(e) => patchRow(policy.type, { isActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{t("common:active")}</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
