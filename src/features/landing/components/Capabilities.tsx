import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { fadeUp, revealViewport, staggerContainer, landingSpring } from "../motion";
import { PILLARS } from "../content/pillars";

/**
 * Capability domains — each card is a unique solid color panel on slate canvas.
 */
export function Capabilities() {
  const { t } = useTranslation("public");

  return (
    <section id="capabilities" className="relative overflow-hidden bg-slate-100 py-12 sm:py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-slate-200" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            {t("landing.capabilitiesEyebrow")}
          </p>
          <h2 className="mt-3 font-landing-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t("landing.capabilitiesTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            {t("landing.capabilitiesBody")}
          </p>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3"
        >
          {PILLARS.map((cap) => {
            const Icon = cap.icon;
            const th = cap.theme;
            return (
              <motion.article
                key={cap.id}
                id={cap.id}
                variants={fadeUp}
                whileHover={{ y: -3 }}
                transition={landingSpring}
                className={`group relative overflow-hidden rounded-2xl p-5 shadow-[0_10px_28px_rgb(15,23,42,0.14)] outline-none transition-[filter,transform,box-shadow] duration-200 sm:p-6 ${th.cardBg} ${th.hover}`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${th.iconBg} ${th.iconFg} shadow-sm transition-transform duration-200 group-hover:scale-[1.04]`}
                  >
                    <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-base font-extrabold tracking-tight ${th.title}`}>
                        {t(cap.titleKey)}
                      </h3>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${th.tag}`}
                      >
                        {t(cap.tagKey)}
                      </span>
                    </div>
                    <p className={`mt-2.5 line-clamp-2 text-sm leading-relaxed ${th.body}`}>
                      {t(cap.bodyKey)}
                    </p>
                  </div>
                </div>

                <ul className={`mt-4 flex flex-wrap gap-1.5 border-t pt-4 ${th.divider}`}>
                  {cap.pointKeys.map((key) => (
                    <li
                      key={key}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium leading-tight ${th.chip}`}
                    >
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
