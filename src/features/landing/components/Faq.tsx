import React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ArrowRight, HelpCircle, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { fadeUp, revealViewport, staggerContainer, landingEase, landingSpring } from "../motion";
import { FAQ_ITEMS } from "../content/faqs";
import { cn } from "../../../lib/cn";

export function Faq() {
  const { t } = useTranslation("public");
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <section id="faq" className="relative overflow-hidden bg-slate-100 py-12 sm:py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_15%_0%,rgba(37,99,235,0.06),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(148,163,184,0.28)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_75%_35%,black_15%,transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-16">
          <Reveal className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white text-blue-600 shadow-[0_1px_0_rgb(255,255,255)_inset]">
              <HelpCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              {t("landing.faqEyebrow")}
            </p>
            <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
              {t("landing.faqTitle")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              {t("landing.faqBody")}
            </p>

            <div className="relative mt-8 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <div
                className="pointer-events-none absolute -end-8 -top-8 h-24 w-24 rounded-full bg-blue-50/80 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold tracking-tight text-slate-900">
                    {t("landing.faqCtaTitle")}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                    {t("landing.faqCtaBody")}
                  </p>
                  <Link
                    to="/register-school"
                    className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2"
                  >
                    {t("landing.registerSchool")}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={revealViewport}
            className="space-y-2.5 lg:col-span-8"
            role="list"
          >
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = open === index;
              const panelId = `faq-panel-${index}`;
              const buttonId = `faq-button-${index}`;
              const num = String(index + 1).padStart(2, "0");

              return (
                <motion.div
                  key={item.qKey}
                  variants={fadeUp}
                  role="listitem"
                  className={cn(
                    "relative overflow-hidden rounded-2xl border transition-[background-color,border-color,box-shadow,color] duration-300",
                    isOpen
                      ? "border-blue-600 bg-blue-600 text-white shadow-[0_14px_40px_rgb(37,99,235,0.28)]"
                      : "border-slate-100/90 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:border-slate-200 hover:shadow-[0_8px_28px_rgb(15,23,42,0.04)]"
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : index)}
                      className={cn(
                        "flex w-full items-start gap-4 px-5 py-5 text-start sm:gap-5 sm:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                        isOpen ? "focus-visible:ring-white/50" : "focus-visible:ring-blue-500/40"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg font-landing-display text-xs tabular-nums tracking-tight transition-colors sm:h-8 sm:min-w-[2rem] sm:text-sm",
                          isOpen
                            ? "bg-white/15 text-white"
                            : "bg-slate-50 text-slate-400"
                        )}
                        aria-hidden
                      >
                        {num}
                      </span>
                      <span
                        className={cn(
                          "flex-1 pt-0.5 text-sm font-extrabold tracking-tight sm:text-[15px]",
                          isOpen ? "text-white" : "text-slate-800"
                        )}
                      >
                        {t(item.qKey)}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={landingSpring}
                        className={cn(
                          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors",
                          isOpen
                            ? "border-white/25 bg-white/15 text-white"
                            : "border-slate-100 bg-slate-50 text-slate-400"
                        )}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </motion.span>
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: landingEase }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/20 px-5 pb-5 sm:px-6">
                          <p className="ps-11 pt-4 text-sm leading-relaxed text-blue-50 sm:ps-12 sm:text-[15px] sm:leading-7">
                            {t(item.aKey)}
                          </p>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
