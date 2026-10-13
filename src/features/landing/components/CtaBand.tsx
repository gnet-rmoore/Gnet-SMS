import React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LandingCta } from "./Reveal";
import { revealViewport, landingEase } from "../motion";

export function CtaBand() {
  const { t } = useTranslation("public");

  return (
    <section id="get-started" className="bg-slate-100 pb-28 sm:pb-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={revealViewport}
          transition={{ duration: 0.55, ease: landingEase }}
          className="relative overflow-hidden rounded-[28px] shadow-[0_24px_60px_rgb(15,23,42,0.18)] sm:rounded-[32px]"
        >
          <motion.img
            src="/marketing/hero-campus.jpg"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            initial={{ scale: 1.08 }}
            whileInView={{ scale: 1 }}
            viewport={revealViewport}
            transition={{ duration: 1.1, ease: landingEase }}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-slate-950/85" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950/55 via-transparent to-slate-950/50" />
          <div className="landing-grain absolute inset-0 opacity-30" aria-hidden />
          <div className="relative px-6 py-10 sm:px-12 sm:py-16 lg:py-20">
            <div className="max-w-xl">
              <h2 className="font-landing-display text-3xl tracking-tight text-white sm:text-4xl">
                {t("landing.ctaTitle")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300">{t("landing.ctaBody")}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <LandingCta to="/register-school" variant="primary">
                  {t("landing.registerSchool")}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180" />
                </LandingCta>
                <LandingCta to="/login" variant="outline">
                  {t("landing.signIn")}
                </LandingCta>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
