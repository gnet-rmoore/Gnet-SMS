import React from "react";
import { useTranslation } from "react-i18next";
import { Send, RefreshCw, ArrowLeft } from "lucide-react";
import { SyncStatusChip } from "./SyncStatusChip";
import type { SyncStatus } from "../hooks/useGradebookAutosave";
import { gradebookMobileBarClass } from "./gradebookUi";
import { Button } from "../../../components/ui";

export type GradebookToolbarProps = {
  title: string;
  subtitle?: string;
  grantBanner?: string | null;
  syncStatus: SyncStatus;
  lastSavedAt?: string | null;
  errorMessage?: string | null;
  onSyncNow: () => void;
  onSubmit: () => void;
  onBack?: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  stickyMobileActions?: boolean;
};

export function GradebookToolbar({
  title,
  subtitle,
  grantBanner,
  syncStatus,
  lastSavedAt,
  errorMessage,
  onSyncNow,
  onSubmit,
  onBack,
  submitting,
  submitDisabled,
  submitLabel,
  stickyMobileActions = true,
}: GradebookToolbarProps) {
  const { t } = useTranslation(["pages", "common"]);

  const resolvedSubmit =
    submitLabel || t("common:submitForReview", { defaultValue: "Submit for review" });

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-2 min-h-[44px] sm:min-h-0 -ml-1 px-1"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("common:back")}
              </button>
            )}
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 break-words">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
            )}
          </div>
          <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
            <SyncStatusChip
              status={syncStatus}
              lastSavedAt={lastSavedAt}
              errorMessage={errorMessage}
              onRetry={onSyncNow}
            />
            <button
              type="button"
              onClick={onSyncNow}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              {t("common:syncNow")}
            </button>
            <Button
              type="button"
              variant="primary"
              onClick={onSubmit}
              disabled={submitting || submitDisabled}
              className="min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              {submitting ? t("common:submitting") : resolvedSubmit}
            </Button>
          </div>
        </div>

        {grantBanner && (
          <p className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm font-medium text-amber-900 leading-relaxed">
            {grantBanner}
          </p>
        )}
      </div>

      {stickyMobileActions && (
        <div
          className={gradebookMobileBarClass}
          aria-label={t("gradebook.mobileActions", { defaultValue: "Gradebook actions" })}
        >
          <div className="max-w-6xl mx-auto space-y-2">
            <SyncStatusChip
              status={syncStatus}
              lastSavedAt={lastSavedAt}
              errorMessage={errorMessage}
              onRetry={onSyncNow}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSyncNow}
                className="inline-flex flex-1 items-center justify-center gap-2 min-h-[48px] px-4 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm bg-white hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" />
                {t("common:syncNow")}
              </button>
              <Button
                type="button"
                variant="primary"
                onClick={onSubmit}
                disabled={submitting || submitDisabled}
                className="flex-[1.2] min-h-[48px] justify-center"
              >
                <Send className="w-4 h-4" />
                {submitting ? t("common:submitting") : resolvedSubmit}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
