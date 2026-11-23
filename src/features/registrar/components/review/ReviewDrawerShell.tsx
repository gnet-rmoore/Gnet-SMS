import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui";

type Props = {
  panelRef: React.RefObject<HTMLDivElement | null>;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  description?: string;
  title: string;
  headerMeta: React.ReactNode;
  stageRail: React.ReactNode;
  historyBanner?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  overlay?: React.ReactNode;
};

export function ReviewDrawerShell({ panelRef, closeRef, onClose, titleId, descriptionId, description, title, headerMeta, stageRail, historyBanner, children, footer, overlay }: Props) {
  const { t } = useTranslation(["common"]);
  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-end">
      <button type="button" aria-label={t("common:close")} onClick={onClose} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 flex h-[100dvh] w-full max-w-[720px] xl:max-w-[880px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[-20px_0_60px_rgb(15,23,42,0.18)]"
      >
        {descriptionId ? <p id={descriptionId} className="sr-only">{description}</p> : null}
        <div className="flex shrink-0 items-start justify-between gap-5 border-b border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 px-5 py-5 text-white sm:px-8 sm:py-6">
          <div className="min-w-0">
            {headerMeta}
            <h3 id={titleId} className="mt-1 text-lg font-extrabold tracking-tight">{title}</h3>
          </div>
          <Button ref={closeRef} type="button" variant="ghost" size="icon" aria-label={t("common:close")} onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="shrink-0 border-b border-slate-100 bg-white px-5 pb-1 pt-5 sm:px-8">{stageRail}</div>
        {historyBanner}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white p-5 sm:p-7">{children}</div>
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-4 sm:px-8">{footer}</div>
        {overlay}
      </div>
    </div>
  );
}