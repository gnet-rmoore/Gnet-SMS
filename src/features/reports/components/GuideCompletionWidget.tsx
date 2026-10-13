import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, GraduationCap } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { fetchGuideStats, type GuideStatsResponse } from "../../platform-guide/api";

const EXPANDED_KEY = "sms.reports.guideCompletionExpanded";

function readExpandedPreference(): boolean | null {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function writeExpandedPreference(expanded: boolean) {
  try {
    localStorage.setItem(EXPANDED_KEY, expanded ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

/** School Admin / Principal / IT — honest completion % by role (no PII). */
export function GuideCompletionWidget({ defaultExpanded = true }: { defaultExpanded?: boolean } = {}) {
  const { t } = useTranslation("pages");
  const { user, school } = useAuthStore();
  const [stats, setStats] = React.useState<GuideStatsResponse | null>(null);
  const [error, setError] = React.useState(false);
  const [expanded, setExpanded] = React.useState(() => readExpandedPreference() ?? defaultExpanded);

  const allowed =
    user?.role === "SCHOOL_ADMIN" || user?.role === "PRINCIPAL" || user?.role === "IT_ADMIN";

  React.useEffect(() => {
    if (!allowed || !school?.id) return;
    let cancelled = false;
    void fetchGuideStats(school.id)
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, school?.id]);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      writeExpandedPreference(next);
      return next;
    });
  };

  if (!allowed) return null;
  if (error || !stats) return null;
  if (!stats.totals.users) return null;

  const overall = Math.round((stats.totals.completed / stats.totals.users) * 100);
  const panelId = "guide-completion-by-role";

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 rounded-[32px] p-6 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:p-8"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("guide.completionByRole")}
            </h2>
            <ChevronDown
              className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </div>
          <p className="mt-2 font-mono text-sm text-slate-700">
            {t("guide.completionUsers", {
              completed: stats.totals.completed,
              users: stats.totals.users,
              percent: overall,
            })}
          </p>
        </div>
      </button>

      {expanded ? (
        <div id={panelId} className="border-t border-slate-100 px-6 pb-6 sm:px-8 sm:pb-8">
          <p className="pt-4 text-sm text-slate-500">{t("guide.completionByRoleHint")}</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {stats.byRole.map((row) => (
              <li key={row.role} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="font-semibold text-slate-800">{row.role.replace(/_/g, " ")}</span>
                <span className="font-mono text-slate-500">
                  {row.completed}/{row.users} · {row.percentComplete}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
