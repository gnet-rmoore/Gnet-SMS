import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { fadeUp, revealViewport, staggerContainer, landingEase, landingSpring } from "../motion";
import { cn } from "../../../lib/cn";

export type MarketingFaqItem = {
  qKey: string;
  aKey: string;
};

type MarketingFaqProps = {
  eyebrow: string;
  title: string;
  body?: string;
  items: MarketingFaqItem[];
  id?: string;
  className?: string;
};

/**
 * Compact FAQ accordion for marketing subpages (same open-state blue fill as home FAQ).
 */
export function MarketingFaq({
  eyebrow,
  title,
  body,
  items,
  id = "page-faq",
  className,
}: MarketingFaqProps) {
  const { t } = useTranslation("public");
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <section
      id={id}
      className={cn("relative overflow-hidden bg-slate-100 py-12 sm:py-20 lg:py-24", className)}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p>
          <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>
          {body ? (
            <p className="mt-4 text-base leading-relaxed text-slate-500">{body}</p>
          ) : null}
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="mx-auto mt-10 max-w-3xl space-y-2.5"
          role="list"
        >
          {items.map((item, index) => {
            const isOpen = open === index;
            const panelId = `${id}-panel-${index}`;
            const buttonId = `${id}-button-${index}`;
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
                    : "border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:border-slate-300"
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
                        isOpen ? "bg-white/15 text-white" : "bg-white text-slate-400"
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
                          : "border-slate-100 bg-white text-slate-400"
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
    </section>
  );
}
