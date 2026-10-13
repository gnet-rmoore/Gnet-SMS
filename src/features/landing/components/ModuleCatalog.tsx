import React from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { fadeUp, staggerContainer, landingSpring, landingEase } from "../motion";
import {
  MODULES,
  MODULE_GROUP_ICONS,
  MODULE_GROUP_LABEL_KEYS,
  MODULE_GROUP_ORDER,
  type ModuleGroupId,
} from "../content/modules";
import { cn } from "../../../lib/cn";

type StatusFilter = "all" | "live" | "stub";

function isModuleGroupId(value: string | null): value is ModuleGroupId {
  return !!value && (MODULE_GROUP_ORDER as readonly string[]).includes(value);
}

type ModuleCatalogProps = {
  /** Hide the old section H2 when a page-level MarketingPageHero is shown above. */
  standalone?: boolean;
};

/**
 * Domain explorer — one group at a time; optional search + live/limited filter on `/modules`.
 */
export function ModuleCatalog({ standalone = false }: ModuleCatalogProps) {
  const { t } = useTranslation("public");
  const [searchParams, setSearchParams] = useSearchParams();
  const domainParam = searchParams.get("domain");

  const [active, setActive] = React.useState<ModuleGroupId>(() =>
    isModuleGroupId(domainParam) ? domainParam : "admissions"
  );
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  React.useEffect(() => {
    if (isModuleGroupId(domainParam) && domainParam !== active) {
      setActive(domainParam);
    }
  }, [domainParam, active]);

  const selectDomain = (group: ModuleGroupId) => {
    setActive(group);
    const next = new URLSearchParams(searchParams);
    next.set("domain", group);
    setSearchParams(next, { replace: true });
  };

  const liveTotal = MODULES.filter((m) => m.status === "live").length;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODULES.filter((m) => {
      if (m.group !== active) return false;
      if (statusFilter === "live" && m.status !== "live") return false;
      if (statusFilter === "stub" && m.status !== "stub") return false;
      if (!q) return true;
      const title = t(m.titleKey).toLowerCase();
      const body = t(m.bodyKey).toLowerCase();
      const detail = t(m.detailKey).toLowerCase();
      const roles = t(m.rolesKey).toLowerCase();
      const highlights = m.highlightKeys.map((key) => t(key).toLowerCase()).join(" ");
      return (
        title.includes(q) ||
        body.includes(q) ||
        detail.includes(q) ||
        roles.includes(q) ||
        highlights.includes(q)
      );
    });
  }, [active, statusFilter, query, t]);

  const liveInGroup = MODULES.filter((m) => m.group === active && m.status === "live").length;
  const totalInGroup = MODULES.filter((m) => m.group === active).length;

  const filterChips: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("landing.modulesFilterAll") },
    { id: "live", label: t("landing.modulesFilterLive") },
    { id: "stub", label: t("landing.modulesFilterStub") },
  ];

  return (
    <section
      id="modules"
      className={cn(
        "relative overflow-hidden bg-slate-100",
        standalone ? "py-10 sm:py-14 lg:py-16" : "py-12 sm:py-20 lg:py-28"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {!standalone ? (
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              {t("landing.modulesEyebrow")}
            </p>
            <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
              {t("landing.modulesTitle")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
              {t("landing.modulesBody")}
            </p>
            <p className="mt-3 text-sm font-medium text-slate-400">
              {t("landing.modulesLiveSummary", { count: liveTotal })}
            </p>
          </Reveal>
        ) : null}

        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            standalone ? "" : "mt-10"
          )}
        >
          <label className="relative min-w-0 flex-1 sm:max-w-md">
            <span className="sr-only">{t("landing.modulesPageSearchLabel")}</span>
            <Search
              className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("landing.modulesPageSearchPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pe-3.5 ps-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label={t("landing.modulesFilterAll")}
          >
            {filterChips.map((chip) => {
              const selected = statusFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setStatusFilter(chip.id)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                    selected
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
          <nav
            className="lg:sticky lg:top-28 lg:self-start"
            aria-label={t("landing.modulesDomainsLabel")}
          >
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {MODULE_GROUP_ORDER.map((group) => {
                const Icon = MODULE_GROUP_ICONS[group];
                const selected = active === group;
                const count = MODULES.filter((m) => m.group === group).length;
                return (
                  <button
                    key={group}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectDomain(group)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                      selected
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                    {t(MODULE_GROUP_LABEL_KEYS[group])}
                    <span
                      className={cn(
                        "font-mono text-[11px]",
                        selected ? "text-white/60" : "text-slate-400"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <ul className="hidden space-y-1 lg:block">
              {MODULE_GROUP_ORDER.map((group) => {
                const Icon = MODULE_GROUP_ICONS[group];
                const selected = active === group;
                const count = MODULES.filter((m) => m.group === group).length;
                return (
                  <li key={group}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectDomain(group)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                        selected
                          ? "bg-slate-50 text-slate-900"
                          : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-800"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                          selected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-600"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold tracking-tight">
                        {t(MODULE_GROUP_LABEL_KEYS[group])}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${active}-${statusFilter}-${query}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: landingEase }}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:p-7"
              >
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div>
                    <h2 className="font-landing-display text-xl tracking-tight text-slate-900 sm:text-2xl">
                      {t(MODULE_GROUP_LABEL_KEYS[active])}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("landing.modulesDomainMeta", {
                        total: totalInGroup,
                        live: liveInGroup,
                      })}
                    </p>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">
                    {t("landing.modulesPageSearchEmpty")}
                  </p>
                ) : (
                  <motion.ul
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="mt-2 divide-y divide-slate-200/70"
                  >
                    {filtered.map(
                      ({
                        icon: Icon,
                        titleKey,
                        bodyKey,
                        detailKey,
                        rolesKey,
                        highlightKeys,
                        status,
                        id,
                      }) => (
                      <motion.li
                        key={id}
                        variants={fadeUp}
                        whileHover={{ x: 2 }}
                        transition={landingSpring}
                        className="group py-5 first:pt-3 last:pb-2 sm:py-6"
                      >
                        <article className="flex w-full items-start gap-4 sm:gap-5">
                          <span
                            className={cn(
                              "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
                              status === "live"
                                ? "bg-white text-blue-600 shadow-[0_4px_14px_rgb(15,23,42,0.04)] group-hover:bg-blue-600 group-hover:text-white"
                                : "bg-white/70 text-slate-400"
                            )}
                          >
                            <Icon className="h-[18px] w-[18px]" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold tracking-tight text-slate-900">
                                {t(titleKey)}
                              </h3>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-[11px] font-semibold",
                                  status === "live" ? "text-emerald-600" : "text-slate-400"
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    status === "live" ? "bg-emerald-500" : "bg-slate-300"
                                  )}
                                  aria-hidden
                                />
                                {status === "live"
                                  ? t("landing.modulesStatusLive")
                                  : t("landing.modulesStatusStub")}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm font-medium leading-snug text-slate-700">
                              {t(bodyKey)}
                            </p>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                              {t(detailKey)}
                            </p>
                            <p className="mt-3 text-xs leading-relaxed text-slate-500">
                              <span className="font-semibold text-slate-600">
                                {t("landing.modulesUsedByLabel")}:
                              </span>{" "}
                              {t(rolesKey)}
                            </p>
                            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                              {highlightKeys.map((key) => (
                                <li
                                  key={key}
                                  className="flex items-start gap-2 text-sm leading-snug text-slate-600"
                                >
                                  <span
                                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-blue-500"
                                    aria-hidden
                                  />
                                  {t(key)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      </motion.li>
                    )
                    )}
                  </motion.ul>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
