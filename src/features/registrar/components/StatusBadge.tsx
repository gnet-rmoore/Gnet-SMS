import React from "react";
import { Clock, Sliders, Check, FileX, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("pages");
  const label = t(`admissions.status.${status}`, { defaultValue: status });

  switch (status) {
    case "PENDING":
      return (
        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold border border-amber-100 flex items-center gap-1 w-fit">
          <Clock className="w-3.5 h-3.5" /> {label}
        </span>
      );
    case "UNDER_REVIEW":
      return (
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1 w-fit">
          <Sliders className="w-3.5 h-3.5" /> {label}
        </span>
      );
    case "APPROVED":
      return (
        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100 flex items-center gap-1 w-fit">
          <Check className="w-3.5 h-3.5" /> {label}
        </span>
      );
    case "REJECTED":
      return (
        <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100 flex items-center gap-1 w-fit">
          <FileX className="w-3.5 h-3.5" /> {label}
        </span>
      );
    case "ENROLLED":
      return (
        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-1 w-fit">
          <UserCheck className="w-3.5 h-3.5" /> {label}
        </span>
      );
    default:
      return (
        <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold border border-slate-100 w-fit">
          {label}
        </span>
      );
  }
}
