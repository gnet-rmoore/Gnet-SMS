import React from "react";
import { useTranslation } from "react-i18next";
import { CloudOff, Loader2, RefreshCw } from "lucide-react";
import { Button, Surface } from "../../../components/ui";

export type PendingSyncBannerProps = {
  pendingCount: number;
  syncing?: boolean;
  onSyncAll: () => void;
};

export function PendingSyncBanner({
  pendingCount,
  syncing,
  onSyncAll,
}: PendingSyncBannerProps) {
  const { t } = useTranslation(["pages", "common"]);

  if (pendingCount <= 0) return null;

  return (
    <Surface className="p-4 sm:p-5 border-amber-200 bg-amber-50/60">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            {syncing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CloudOff className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold tracking-tight text-slate-900">
              {t("gradebook.pendingSyncTitle", {
                count: pendingCount,
                defaultValue:
                  pendingCount === 1
                    ? "1 gradebook waiting to sync"
                    : "{{count}} gradebooks waiting to sync",
              })}
            </p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {t("gradebook.pendingSyncHint", {
                defaultValue:
                  "Offline work from other classes is saved on this device. Sync sends drafts to the server in the background.",
              })}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={syncing || !navigator.onLine}
          onClick={onSyncAll}
          className="shrink-0 min-h-[44px] inline-flex items-center gap-2"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {syncing
            ? t("gradebook.syncingAll", { defaultValue: "Syncing…" })
            : t("gradebook.syncAllPending", { defaultValue: "Sync all" })}
        </Button>
      </div>
    </Surface>
  );
}
