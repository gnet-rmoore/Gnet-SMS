import React from "react";
import { useTranslation } from "react-i18next";
import type { StageHistorySummary } from "../../lib/admissionStage";

export function ReadOnlyStageView({ rows }: { rows: StageHistorySummary["rows"] }) {
  const { t } = useTranslation(["pages"]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.labelKey + row.value}>
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{t(row.labelKey, { defaultValue: row.labelKey })}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 break-words">{row.value || "-"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}