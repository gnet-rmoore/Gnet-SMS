import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { fadeUp, revealViewport, staggerContainer, landingSpring } from "../motion";

export function Workflows() {
  const { t } = useTranslation("public");
  const items = [
    { n: "01", title: t("landing.wf1Title"), body: t("landing.wf1Body") },
    { n: "02", title: t("landing.wf2Title"), body: t("landing.wf2Body") },
    { n: "03", title: t("landing.wf3Title"), body: t("landing.wf3Body") },
    { n: "04", title: t("landing.wf4Title"), body: t("landing.wf4Body") },
    { n: "05", title: t("landing.wf5Title"), body: t("landing.wf5Body") },
  ];

  return (
    <section id="workflows" className="relative overflow-hidden bg-slate-100 py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {t("landing.workflowsEyebrow")}
          </p>
          <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
            {t("landing.workflowsTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            {t("landing.workflowsBody")}
          </p>
        </Reveal>

        <motion.ol
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="mt-10 grid gap-4 sm:mt-14 md:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <motion.li
              key={item.n}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={landingSpring}
              className="flex gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:gap-5 sm:rounded-[28px] sm:p-8"
            >
              <span className="font-landing-display text-3xl tracking-tight text-blue-600/80 sm:text-4xl">
                {item.n}
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
