import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { BookOpen, Check, Circle, Play, RotateCcw, SkipForward } from "lucide-react";
import { useGuide } from "./GuideProvider";
import { resolveGuideHowTo } from "./guideHowTo";
import { PageShell } from "../../components/ui";

export default function PlatformGuidePage() {
  const { t } = useTranslation("pages");
  const { track, steps, progress, percent, loading, startTour, restart, markStep, basePath, meta } =
    useGuide();

  if (loading) {
    return (
      <PageShell>
        <p className="text-sm text-slate-500">{t("guide.loading")}</p>
      </PageShell>
    );
  }

  if (!track) {
    return (
      <PageShell>
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_4px_20px_rgb(15,23,42,0.03)]">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-dashboard">{t("guide.unavailableTitle")}</h1>
          <p className="mt-2 text-slate-500">{t("guide.unavailableBody")}</p>
          <Link to={basePath || "/"} className="mt-6 inline-flex text-sm font-semibold text-indigo-600">
            {t("guide.backDashboard")}
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-8"
      >
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_4px_20px_rgb(15,23,42,0.03)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{t("guide.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
                {t(track.titleKey)}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-500">{t(track.subtitleKey)}</p>
              {meta?.under13 ? (
                <p className="mt-2 text-sm text-slate-500">{t("guide.under13Note")}</p>
              ) : null}
              {meta?.guideRequired ? (
                <p className="mt-2 text-sm text-amber-700">{t("guide.requiredHint")}</p>
              ) : null}
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BookOpen className="h-7 w-7" />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{t("guide.progressLabel")}</span>
              <span className="font-mono text-slate-500">{percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startTour()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
            >
              <Play className="h-4 w-4" />
              {progress?.status === "IN_PROGRESS" ? t("guide.continue") : t("guide.start")}
            </button>
            <button
              type="button"
              onClick={() => void restart()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-indigo-200"
            >
              <RotateCcw className="h-4 w-4" />
              {t("guide.restart")}
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgb(15,23,42,0.03)] sm:p-8">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{t("guide.checklistTitle")}</h2>
          <ul className="mt-5 divide-y divide-slate-100">
            {steps.map((s, i) => {
              const st = progress?.steps?.[s.id] || "todo";
              const howTo = resolveGuideHowTo(
                t as (k: string, o?: Record<string, unknown>) => unknown,
                s.id
              );
              return (
                <li key={s.id} className="flex items-start gap-3 py-4">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      st === "done"
                        ? "bg-emerald-50 text-emerald-600"
                        : st === "skipped"
                          ? "bg-slate-100 text-slate-400"
                          : "bg-indigo-50 text-indigo-600"
                    }`}
                  >
                    {st === "done" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : st === "skipped" ? (
                      <SkipForward className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      <span className="me-2 font-mono text-slate-400">{i + 1}.</span>
                      {t(s.titleKey)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{t(s.bodyKey)}</p>
                    {howTo.length > 0 ? (
                      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                          {t("guide.howToLabel")}
                        </p>
                        <ol className="mt-2 list-decimal space-y-1.5 ps-4 text-sm leading-relaxed text-slate-600">
                          {howTo.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                  {st === "todo" ? (
                    <button
                      type="button"
                      onClick={() => void startTour(s.id)}
                      className="shrink-0 text-xs font-bold uppercase tracking-wide text-indigo-600 hover:text-indigo-700"
                    >
                      {t("guide.openStep")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void markStep(s.id, "todo")}
                      className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-600"
                    >
                      {t("guide.resetStep")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </PageShell>
  );
}
