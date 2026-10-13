import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { fadeUp, revealViewport, staggerContainer, landingSpring } from "../motion";
import { PERSONAS } from "../content/personas";

export function Audience() {
  const { t } = useTranslation("public");

  return (
    <section id="audience" className="relative overflow-hidden bg-slate-100 py-12 sm:py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {t("landing.audienceEyebrow")}
          </p>
          <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
            {t("landing.audienceTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            {t("landing.audienceBody")}
          </p>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="mt-8 grid gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        >
          {PERSONAS.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                transition={landingSpring}
                className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] transition-shadow duration-300 hover:border-blue-200 hover:shadow-[0_20px_50px_rgb(15,23,42,0.07)] sm:p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-blue-600 ring-1 ring-slate-100 transition-colors duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:ring-blue-500">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-extrabold tracking-tight text-slate-900">
                  {t(item.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{t(item.bodyKey)}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
