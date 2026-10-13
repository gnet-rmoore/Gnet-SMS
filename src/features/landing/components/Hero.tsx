import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LandingCta } from "./Reveal";
import { landingEase } from "../motion";

const HERO_IMAGE = "/marketing/hero-students-laptop.jpg";

/**
 * Full-bleed campus photo hero — headline + CTAs over a readable gradient overlay.
 */
export function Hero() {
  const { t } = useTranslation("public");
  const [showCue, setShowCue] = React.useState(true);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  React.useEffect(() => {
    const onScroll = () => setShowCue(window.scrollY < 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="product"
      className="relative isolate overflow-hidden bg-slate-950 pt-[4.25rem] sm:min-h-[100svh] sm:pt-[4.75rem]"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {!imageLoaded ? (
          <div className="absolute inset-0 animate-pulse bg-slate-900" />
        ) : null}
        <img
          src={HERO_IMAGE}
          alt=""
          fetchPriority="high"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover object-[center_72%] transition-opacity duration-700 sm:object-[center_68%] lg:object-[center_62%] ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/88 via-slate-950/62 to-slate-950/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/20 to-slate-950/45" />
        <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white/50 to-transparent sm:h-6" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-16 pt-8 sm:min-h-[calc(100svh-4.75rem)] sm:px-8 sm:pb-24 sm:pt-10">
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-2 text-center sm:flex-1">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: landingEase }}
            className="font-landing-sans text-sm font-bold tracking-tight text-blue-300"
          >
            Gnet SMS
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: landingEase }}
            className="mt-3 font-landing-sans text-[2rem] font-extrabold leading-[1.12] tracking-tight text-white sm:mt-4 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.1]"
          >
            {t("landing.heroHeadline")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: landingEase }}
            className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-200/90 sm:mt-5 sm:text-lg"
          >
            {t("landing.heroBody")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: landingEase }}
            className="mt-8 flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center"
          >
            <LandingCta
              to="/register-school"
              variant="primary"
              className="w-full min-w-0 rounded-full px-8 shadow-lg shadow-blue-600/30 focus-visible:ring-offset-slate-950 sm:w-auto sm:min-w-[10.5rem]"
            >
              {t("landing.registerCta")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </LandingCta>
            <LandingCta
              to="/modules"
              variant="outline"
              className="w-full min-w-0 rounded-full border-white/25 bg-white/10 px-8 text-white backdrop-blur-sm hover:bg-white/15 sm:w-auto sm:min-w-[10.5rem]"
            >
              {t("landing.navModules")}
            </LandingCta>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showCue ? (
          <motion.a
            href="#capabilities"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1 text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 sm:flex"
            aria-label={t("landing.navCapabilities")}
          >
            <motion.span
              animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-5 w-5" />
            </motion.span>
          </motion.a>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
