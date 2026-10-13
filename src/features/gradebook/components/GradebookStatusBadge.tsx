import React from "react";
import { useTranslation } from "react-i18next";

export function GradebookStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("common");
  const tone =
    status === "ACCEPTED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "REJECTED"
        ? "bg-rose-50 text-rose-700 border-rose-100"
        : status === "SUBMITTED"
          ? "bg-amber-50 text-amber-700 border-amber-100"
          : status === "DRAFT"
            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
            : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${tone}`}
    >
      {t(`gradeStatus.${status}`, { defaultValue: status })}
    </span>
  );
}
