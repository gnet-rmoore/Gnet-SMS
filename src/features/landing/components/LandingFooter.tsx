import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { revealViewport, landingEase } from "../motion";

export function LandingFooter() {
  const { t } = useTranslation("public");
  const year = new Date().getFullYear();

  const explore = [
    { href: "/#capabilities", label: t("landing.navCapabilities") },
    { href: "/modules", label: t("landing.navModules") },
    { href: "/pricing", label: t("landing.navPricing") },
    { href: "/#audience", label: t("landing.navAudience") },
    { href: "/#how-it-works", label: t("landing.navHow") },
    { href: "/#faq", label: t("landing.navFaq") },
  ];

  const access = [
    { to: "/login", label: t("landing.signIn") },
    { to: "/register-school", label: t("landing.registerSchool") },
  ];

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={revealViewport}
      transition={{ duration: 0.45, ease: landingEase }}
      className="relative overflow-hidden bg-slate-950 text-slate-300"
    >
      {/* Atmospheric top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[min(90%,40rem)] -translate-x-1/2 rounded-full bg-blue-600/15 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 pt-12 pb-8 sm:px-8 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          {/* Brand column */}
          <div className="lg:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold shadow-lg shadow-blue-900/50">
                G
              </span>
              <span className="font-landing-display text-xl tracking-tight">
                Gnet <span className="text-blue-300">SMS</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
              {t("landing.footerTagline")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register-school"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                {t("landing.registerSchool")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {t("landing.signIn")}
              </Link>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7 lg:gap-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {t("landing.footerExplore")}
              </p>
              <ul className="mt-4 space-y-2.5">
                {explore.map((item) => (
                  <li key={item.href}>
                    {item.href === "/pricing" || item.href === "/modules" ? (
                      <Link
                        to={item.href}
                        className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {t("landing.footerAccess")}
              </p>
              <ul className="mt-4 space-y-2.5">
                {access.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs leading-relaxed text-slate-500">
                {t("landing.footerAccessHint")}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {t("landing.footerLanguages")}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                {t("landing.footerLanguagesBody")}
              </p>
              <p className="mt-3 text-xs font-medium tracking-wide text-slate-500">
                EN · FR · AR · ES · DE · 中文 · हिन्दी
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            © {year} {t("landing.brand")}. {t("landing.footerRights")}
          </p>
          <button
            type="button"
            onClick={scrollTop}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white sm:self-auto"
          >
            {t("landing.footerBackToTop")}
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.footer>
  );
}
