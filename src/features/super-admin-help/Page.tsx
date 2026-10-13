import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, ChevronRight, CircleHelp, Search, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageShell, PageHeader, Surface, Button, fieldControlClass } from "../../components/ui";
import { cn } from "../../lib/cn";
import {
  HELP_CATEGORIES,
  SA_HELP_GLOSSARY,
  filterHelpEntries,
  type HelpCategory,
} from "./glossary";

export default function SuperAdminHelpPage() {
  const { t } = useTranslation(["pages", "common"]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<HelpCategory | "ALL">("ALL");

  const entries = useMemo(
    () => filterHelpEntries(SA_HELP_GLOSSARY, q, category),
    [q, category]
  );

  return (
    <PageShell>
      <PageHeader
        title={t("pages:superAdmin.helpPage.title", { defaultValue: "Help & glossary" })}
        subtitle={t("pages:superAdmin.helpPage.subtitle", {
          defaultValue:
            "Definitions for platform billing, tenants, operators, domains, and security — for every Super Admin account.",
        })}
        actions={
          <Link
            to="/super-admin/guide"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Sparkles className="w-4 h-4" />
            {t("pages:superAdmin.helpPage.openGuide", { defaultValue: "Platform guide" })}
          </Link>
        }
      />

      <Surface variant="primary" className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("pages:superAdmin.helpPage.searchPlaceholder", {
                defaultValue: "Search terms (MRR, custom domain, DSR…)",
              })}
              className={cn(fieldControlClass.default, "w-full bg-white ps-10")}
              aria-label={t("pages:listFilters.search")}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("ALL")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
              category === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100"
            )}
          >
            {t("common:all")}
          </button>
          {HELP_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                category === c.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-xs font-medium text-slate-500 font-mono">
          {t("pages:listFilters.showingOf", {
            shown: entries.length,
            total: SA_HELP_GLOSSARY.length,
          })}
        </p>
      </Surface>

      {entries.length === 0 ? (
        <Surface variant="primary" className="p-12 text-center">
          <CircleHelp className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-700">
            {t("pages:listFilters.noMatches")}
          </p>
          <p className="mt-1 text-sm text-slate-500">{t("pages:listFilters.noMatchesHint")}</p>
          <Button
            type="button"
            variant="secondary"
            size="compact"
            className="mt-4"
            onClick={() => {
              setQ("");
              setCategory("ALL");
            }}
          >
            {t("pages:listFilters.clearAll")}
          </Button>
        </Surface>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry, i) => {
            const categoryLabel = HELP_CATEGORIES.find((c) => c.id === entry.category)?.label;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.02 }}
              >
                <Link
                  to={`/super-admin/help/${entry.id}`}
                  className="group block rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] transition-colors hover:border-indigo-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        {categoryLabel}
                      </p>
                      <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2 group-hover:text-indigo-700">
                        <BookOpen className="h-5 w-5 text-slate-400 shrink-0" aria-hidden />
                        {entry.term}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{entry.shortDef}</p>
                      {entry.aliases?.length ? (
                        <p className="mt-2 text-xs text-slate-400 font-mono truncate">
                          {entry.aliases.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500"
                      aria-hidden
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <Surface variant="primary" className="p-6 space-y-2">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
          {t("pages:superAdmin.helpPage.docsTitle", { defaultValue: "Operator docs in the repo" })}
        </h3>
        <ul className="text-sm text-slate-600 space-y-1 list-disc ps-5">
          <li>
            <span className="font-mono text-xs">docs/CUSTOM_DOMAIN_EDGE.md</span> — DNS, CNAME, HTTPS edge
          </li>
          <li>
            <span className="font-mono text-xs">docs/SUPER_ADMIN_PLATFORM_PLAN.md</span> — control plane scope
          </li>
          <li>
            <span className="font-mono text-xs">docs/SA_HELP_GLOSSARY_PLAN.md</span> — this Help page plan
          </li>
        </ul>
      </Surface>
    </PageShell>
  );
}
