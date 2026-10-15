import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  BookOpen,
  Check,
  Circle,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
} from "lucide-react";
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
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900">
            {t("guide.unavailableTitle")}
          </h1>
          <p className="mt-2 text-slate-500">{t("guide.unavailableBody")}</p>
          <Link to={basePath || "/"} className="mt-6 inline-flex text-sm font-semibold text-indigo-600">
            {t("guide.backDashboard")}
          </Link>
        </div>
      </PageShell>
    );
  }

  const complete = percent >= 100;

  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-8"
      >
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 p-8 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">
                  {t("guide.eyebrow")}
                </p>
                <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight">
                  {t(track.titleKey)}
                </h1>
                <p className="mt-3 text-base leading-relaxed text-white/90">
                  {t(track.subtitleKey)}
                </p>
                {meta?.under13 ? (
                  <p className="mt-2 text-sm text-white/80">{t("guide.under13Note")}</p>
                ) : null}
                {meta?.guideRequired ? (
                  <p className="mt-3 inline-flex rounded-xl bg-amber-400/20 px-3 py-1.5 text-sm font-medium text-amber-50">
                    {t("guide.requiredHint")}
                  </p>
                ) : null}
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                {complete ? <Sparkles className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-white/90">
                <span className="font-semibold">{t("guide.progressLabel")}</span>
                <span className="font-semibold tabular-nums">{percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void startTour()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-900/10 hover:bg-indigo-50"
              >
                <Play className="h-4 w-4" />
                {progress?.status === "IN_PROGRESS" ? t("guide.continue") : t("guide.start")}
              </button>
              <button
                type="button"
                onClick={() => void restart()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
                {t("guide.restart")}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:p-8">
          <h2 className="font-heading text-lg font-extrabold tracking-tight text-slate-900">
            {t("guide.checklistTitle")}
          </h2>
          <ul className="mt-5 space-y-3">
            {steps.map((s, i) => {
              const st = progress?.steps?.[s.id] || "todo";
              const howTo = resolveGuideHowTo(
                t as (k: string, o?: Record<string, unknown>) => unknown,
                s.id
              );
              return (
                <li
                  key={s.id}
                  className="rounded-2xl border border-slate-100 p-4 transition-colors hover:border-indigo-100"
                >
                  <div className="flex items-start gap-3">
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
                      <p className="font-heading text-sm font-bold text-slate-900">
                        <span className="me-2 font-mono text-slate-400">{i + 1}.</span>
                        {t(s.titleKey)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{t(s.bodyKey)}</p>
                      {howTo.length > 0 ? (
                        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                            {t("guide.howToLabel")}
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {howTo.map((line) => (
                              <li
                                key={line}
                                className="flex gap-2 text-sm leading-relaxed text-slate-600"
                              >
                                <Check
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                                  aria-hidden
                                />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                    {st === "todo" ? (
                      <button
                        type="button"
                        onClick={() => void startTour(s.id)}
                        className="shrink-0 rounded-xl px-2 py-1 text-xs font-bold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {t("guide.openStep")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void markStep(s.id, "todo")}
                        className="shrink-0 rounded-xl px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      >
                        {t("guide.resetStep")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </PageShell>
  );
}
