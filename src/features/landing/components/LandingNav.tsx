import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES, type AppLocale } from "../../../i18n/locales";
import { changeAppLocale, getStoredLocale, normalizeLocale } from "../../../i18n";
import { landingEase } from "../motion";
import { cn } from "../../../lib/cn";

const HOME_SECTION_IDS = [
  "product",
  "capabilities",
  "campus",
  "audience",
  "faq",
] as const;

type LandingNavProps = {
  /** Highlight a dedicated marketing route (`/pricing` or `/modules`). */
  activeRoute?: "pricing" | "modules";
};

/** Floating pill nav — TrustLine shot pattern. */
export function LandingNav({ activeRoute }: LandingNavProps) {
  const { t, i18n } = useTranslation("public");
  const location = useLocation();
  const onHome = location.pathname === "/" || location.pathname === "";
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [active, setActive] = React.useState<string>(activeRoute || "product");
  const locale = (normalizeLocale(i18n.language) || getStoredLocale() || "en") as AppLocale;

  const links = [
    {
      to: onHome ? "#product" : "/#product",
      id: "product",
      label: t("landing.navProduct"),
      externalHash: !onHome,
    },
    {
      to: onHome ? "#capabilities" : "/#capabilities",
      id: "capabilities",
      label: t("landing.navCapabilities"),
      externalHash: !onHome,
    },
    {
      to: "/modules",
      id: "modules",
      label: t("landing.navModules"),
      externalHash: false,
      isRoute: true,
    },
    {
      to: "/pricing",
      id: "pricing",
      label: t("landing.navPricing"),
      externalHash: false,
      isRoute: true,
    },
    {
      to: onHome ? "#audience" : "/#audience",
      id: "audience",
      label: t("landing.navAudience"),
      externalHash: !onHome,
    },
    {
      to: onHome ? "#faq" : "/#faq",
      id: "faq",
      label: t("landing.navFaq"),
      externalHash: !onHome,
    },
  ];

  React.useEffect(() => {
    if (activeRoute) setActive(activeRoute);
  }, [activeRoute]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!onHome || activeRoute) return;
    const nodes = HOME_SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.intersectionRatio > 0)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0.1, 0.35, 0.6] }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [onHome, activeRoute]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as AppLocale;
    await changeAppLocale(next);
  };

  /** Home, unscrolled: sit over dark hero. Scrolled / other routes: light pill. */
  const onDarkHero = onHome && !scrolled && !open && !activeRoute;

  const langControl = (
    <label className="relative inline-flex items-center gap-1.5">
      <Globe className="pointer-events-none absolute start-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
      <span className="sr-only">{t("landing.language")}</span>
      <select
        value={locale}
        onChange={onLocaleChange}
        className={cn(
          "appearance-none rounded-full border py-2 ps-8 pe-7 text-xs font-semibold outline-none transition-colors focus:ring-2 focus:ring-blue-500/40",
          onDarkHero
            ? "border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
        )}
        aria-label={t("landing.language")}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option
            key={loc.code}
            value={loc.code}
            className="bg-white text-slate-900"
            style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
          >
            {loc.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );

  const renderNavLink = (
    link: (typeof links)[number],
    opts?: { mobile?: boolean; index?: number }
  ) => {
    const isActive = active === link.id;
    const className = opts?.mobile
      ? cn(
          "rounded-xl px-3 py-2.5 text-sm font-medium",
          isActive ? "bg-slate-100 text-slate-950" : "text-slate-600"
        )
      : cn(
          "relative rounded-full px-3 py-2 text-sm font-medium transition-colors",
          onDarkHero
            ? isActive
              ? "text-white"
              : "text-slate-400 hover:text-white"
            : isActive
              ? "text-slate-950"
              : "text-slate-500 hover:text-slate-900"
        );

    const inner = (
      <>
        {link.label}
        {!opts?.mobile && isActive ? (
          <motion.span
            layoutId="landing-nav-pill"
            className={cn(
              "absolute inset-0 -z-10 rounded-full",
              onDarkHero ? "bg-white/10" : "bg-slate-100"
            )}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        ) : null}
      </>
    );

    if (link.isRoute) {
      return (
        <Link
          key={link.to}
          to={link.to}
          className={className}
          onClick={() => setOpen(false)}
        >
          {inner}
        </Link>
      );
    }

    if (opts?.mobile) {
      return (
        <motion.a
          key={link.to}
          href={link.to}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.04 * (opts.index ?? 0), duration: 0.25 }}
          className={className}
          onClick={() => setOpen(false)}
        >
          {link.label}
        </motion.a>
      );
    }

    return (
      <a key={link.to} href={link.to} className={className}>
        {inner}
      </a>
    );
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: landingEase }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-2 sm:px-5 sm:pt-4"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900"
      >
        {t("landing.skipToContent")}
      </a>

      <div
        className={cn(
          "mx-auto max-w-5xl rounded-2xl border backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 sm:rounded-[1.75rem]",
          onDarkHero
            ? "border-white/10 bg-slate-950/55 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.45)]"
            : cn(
                "border-slate-200/80 bg-white/90",
                scrolled || open
                  ? "shadow-[0_12px_40px_-12px_rgba(15,23,42,0.14)]"
                  : "shadow-[0_8px_30px_-10px_rgba(15,23,42,0.08)]"
              )
        )}
      >
        <div className="flex h-14 items-center justify-between gap-3 px-3.5 sm:h-[3.75rem] sm:px-5">
          <Link
            to="/"
            className={cn(
              "group flex shrink-0 items-center gap-2",
              onDarkHero ? "text-white" : "text-slate-950"
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              G
            </span>
            <span className="font-landing-sans text-[15px] font-bold tracking-tight">
              Gnet{" "}
              <span className={onDarkHero ? "text-blue-400" : "text-blue-600"}>SMS</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {links.map((link) => renderNavLink(link))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {langControl}
            <Link
              to="/login"
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                onDarkHero
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-950"
              )}
            >
              {t("landing.signIn")}
            </Link>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/register-school"
                className="inline-flex min-h-9 items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                {t("landing.registerSchool")}
              </Link>
            </motion.div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {langControl}
            <button
              type="button"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                onDarkHero
                  ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              )}
              aria-label={open ? t("landing.closeMenu") : t("landing.openMenu")}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: landingEase }}
              className="overflow-hidden border-t border-slate-100 md:hidden"
            >
              <div className="flex max-h-[min(70vh,28rem)] flex-col px-4 py-3">
                <nav className="flex flex-col gap-0.5 overflow-y-auto" aria-label="Mobile">
                  {links.map((link, i) => renderNavLink(link, { mobile: true, index: i }))}
                </nav>
                <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-slate-100 pt-3 pb-1">
                  <Link
                    to="/login"
                    className="rounded-full border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                    onClick={() => setOpen(false)}
                  >
                    {t("landing.signIn")}
                  </Link>
                  <Link
                    to="/register-school"
                    className="rounded-full bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                    onClick={() => setOpen(false)}
                  >
                    {t("landing.registerSchool")}
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
