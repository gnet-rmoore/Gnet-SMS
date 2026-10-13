import React from "react";
import { useTranslation } from "react-i18next";
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from "lucide-react";
import type { SyncStatus } from "../hooks/useGradebookAutosave";

export function SyncStatusChip({
  status,
  lastSavedAt,
  errorMessage,
  onRetry,
}: {
  status: SyncStatus;
  lastSavedAt?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}) {
  const { t } = useTranslation("common");
  const time =
    lastSavedAt &&
    new Date(lastSavedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const configs: Record<
    SyncStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    idle: {
      label: t("sync.ready"),
      className: "bg-slate-50 text-slate-500 border-slate-100",
      icon: <Cloud className="w-3.5 h-3.5" />,
    },
    saving: {
      label: t("sync.saving"),
      className: "bg-indigo-50 text-indigo-700 border-indigo-100",
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    saved_local: {
      label: time ? t("sync.savedLocallyAt", { time }) : t("sync.savedLocally"),
      className: "bg-amber-50 text-amber-700 border-amber-100",
      icon: <Cloud className="w-3.5 h-3.5" />,
    },
    synced: {
      label: time ? t("sync.syncedAt", { time }) : t("sync.synced"),
      className: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: <Check className="w-3.5 h-3.5" />,
    },
    offline: {
      label: t("sync.offline"),
      className: "bg-slate-100 text-slate-600 border-slate-200",
      icon: <CloudOff className="w-3.5 h-3.5" />,
    },
    error: {
      label: errorMessage || t("sync.syncFailed"),
      className: "bg-rose-50 text-rose-700 border-rose-100",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
  };

  const c = configs[status] || configs.idle;
  const clickable = status === "error" && onRetry;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? onRetry : undefined}
      title={errorMessage || c.label}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border max-w-full sm:max-w-xs truncate min-h-[36px] ${c.className} ${
        clickable ? "cursor-pointer hover:opacity-90" : "cursor-default"
      }`}
    >
      {c.icon}
      <span className="truncate">{c.label}</span>
    </button>
  );
}
