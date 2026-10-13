import React from "react";
import { motion } from "motion/react";
import { LandingCta } from "./Reveal";
import { fadeUp, staggerContainer } from "../motion";
import { cn } from "../../../lib/cn";

export type MarketingHeroStat = {
  label: string;
  value: string;
};

export type MarketingHeroCta = {
  to: string;
  label: React.ReactNode;
  variant?: "primary" | "light";
};

type MarketingPageHeroProps = {
  eyebrow: string;
  title: string;
  body: string;
  primaryCta?: MarketingHeroCta;
  secondaryCta?: MarketingHeroCta;
  stats?: MarketingHeroStat[];
  className?: string;
};

/**
 * Page-level hero for dedicated marketing routes (`/modules`, `/pricing`).
 */
export function MarketingPageHero({
  eyebrow,
  title,
  body,
  primaryCta,
  secondaryCta,
  stats,
  className,
}: MarketingPageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-[#f7f8fb] pb-10 pt-6 sm:pb-14 sm:pt-10",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(37,99,235,0.09),transparent_55%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-2xl text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600"
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
          >
            {title}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg"
          >
            {body}
          </motion.p>

          {primaryCta || secondaryCta ? (
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center"
            >
              {primaryCta ? (
                <LandingCta to={primaryCta.to} variant={primaryCta.variant ?? "primary"}>
                  {primaryCta.label}
                </LandingCta>
              ) : null}
              {secondaryCta ? (
                <LandingCta to={secondaryCta.to} variant={secondaryCta.variant ?? "light"}>
                  {secondaryCta.label}
                </LandingCta>
              ) : null}
            </motion.div>
          ) : null}

          {stats && stats.length > 0 ? (
            <motion.ul
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
            >
              {stats.map((stat) => (
                <li
                  key={stat.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 text-sm shadow-[0_4px_20px_rgb(15,23,42,0.03)]"
                >
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                    {stat.value}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
