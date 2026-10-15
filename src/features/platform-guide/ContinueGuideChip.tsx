import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, X } from "lucide-react";
import { useGuideOptional } from "./GuideProvider";

/** Sticky chip when guide is in progress — Phase 3. */
export function ContinueGuideChip() {
  const { t } = useTranslation("pages");
  const { slug } = useParams();
  const guide = useGuideOptional();
  const [hidden, setHidden] = React.useState(false);

  if (!guide || hidden || !guide.track) return null;
  if (guide.progress?.status !== "IN_PROGRESS" && guide.progress?.status !== "NOT_STARTED") {
    if (!(guide.meta?.guideRequired && guide.progress?.status === "DISMISSED")) return null;
  }
  if (guide.tourOpen) return null;

  const hub = guide.basePath ? `${guide.basePath}/guide` : slug ? `/${slug}/guide` : "/guide";
  const percent = guide.percent;

  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-[60] max-w-sm sm:bottom-6 sm:end-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_40px_rgb(15,23,42,0.12)]">
        <span
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
          aria-hidden
        >
          <BookOpen className="h-5 w-5" />
          <span className="absolute inset-0 rounded-full ring-2 ring-indigo-500/20" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-xs font-bold text-slate-900">
            {t(guide.track.titleKey)}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full bg-indigo-600"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-slate-500">
              {t("guide.continueChip", { percent })}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void guide.startTour()}
          className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          {t("guide.continue")}
        </button>
        <Link
          to={hub}
          className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-200"
        >
          {t("guide.hub")}
        </Link>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          aria-label={t("guide.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
