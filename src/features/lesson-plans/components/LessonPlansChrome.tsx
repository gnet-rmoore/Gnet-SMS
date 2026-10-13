import React from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle, NotebookPen, Plus, RefreshCw } from "lucide-react";

type Props = {
  isReviewer: boolean;
  pendingCount: number;
  loading: boolean;
  onRefresh: () => void;
  onNew: () => void;
  showNew: boolean;
  showHelp?: boolean;
  onToggleHelp?: () => void;
  title?: string;
  subtitle?: string;
};

export function LessonPlansChrome({
  isReviewer,
  pendingCount,
  loading,
  onRefresh,
  onNew,
  showNew,
  showHelp,
  onToggleHelp,
  title,
  subtitle,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          {isReviewer ? t("lessonPlans.chrome.supervision") : t("lessonPlans.chrome.myTeaching")}
        </p>
        <div className="flex items-center gap-3 flex-wrap mt-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {title ?? t("lessonPlans.title")}
          </h1>
          {onToggleHelp && (
            <button
              type="button"
              onClick={onToggleHelp}
              className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
              title={t("lessonPlans.chrome.helpTitle")}
            >
              <HelpCircle className="w-4 h-4" />
              <span>
                {showHelp ? t("lessonPlans.chrome.hideGuide") : t("lessonPlans.chrome.needHelp")}
              </span>
            </button>
          )}
        </div>
        <p className="text-slate-500 font-medium mt-1 max-w-xl">
          {subtitle ?? t("lessonPlans.subtitle")}
          {isReviewer && pendingCount > 0 ? (
            <span className="text-amber-700">
              {" "}
              {t("lessonPlans.chrome.awaitingReview", { count: pendingCount })}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {t("lessonPlans.chrome.refresh")}
        </button>
        {showNew && (
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            {t("lessonPlans.chrome.newLesson")}
          </button>
        )}
      </div>
    </div>
  );
}

export function LessonPlansEmpty({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
        <NotebookPen className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
      <p className="text-slate-500 font-medium max-w-md mx-auto">{body}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
