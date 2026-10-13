import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Check, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { fadeUp, revealViewport, staggerContainer, landingSpring } from "../motion";
import { featureLabel } from "../../../constants/platformFeatures";
import {
  FEATURED_PLAN_CODE,
  PRICING_FEATURE_PREVIEW,
  type PublicPlanCard,
} from "../content/plans";
import { usePublicPlans } from "../hooks/usePublicPlans";
import { cn } from "../../../lib/cn";
import { PricingCardsSkeleton } from "./skeletons";

function formatStorageMb(mb: number | null, unlimited: string): string {
  if (mb == null) return unlimited;
  if (mb >= 1024) return `${Math.round(mb / 1024)} GB`;
  return `${mb} MB`;
}

function formatSeats(n: number | null, unlimited: string): string {
  if (n == null) return unlimited;
  return n.toLocaleString();
}

export type PricingProps = {
  /** When provided with `loading`, skips an internal fetch (shared with compare matrix). */
  plans?: PublicPlanCard[];
  loading?: boolean;
  /** Hide section eyebrow/H2 when a page hero is shown above. */
  hideHeader?: boolean;
  /** How many feature labels to preview before “+N more”. */
  featurePreview?: number;
  showFootnote?: boolean;
};

/**
 * Plans & entitlements — list prices from `GET /api/public/plans`
 * (falls back to static catalog defaults).
 */
export function Pricing({
  plans: plansProp,
  loading: loadingProp,
  hideHeader = false,
  featurePreview = PRICING_FEATURE_PREVIEW,
  showFootnote = true,
}: PricingProps = {}) {
  const { t } = useTranslation("public");
  const controlled = plansProp !== undefined;
  const fetched = usePublicPlans({ enabled: !controlled });
  const plans = plansProp ?? fetched.plans;
  const loading = loadingProp ?? fetched.loading;

  return (
    <section
      id="pricing"
      className={cn(
        "relative overflow-hidden bg-slate-100",
        hideHeader ? "py-10 sm:py-14 lg:py-16" : "py-12 sm:py-20 lg:py-28"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      {!hideHeader ? (
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[min(90%,36rem)] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl"
          aria-hidden
        />
      ) : null}

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {!hideHeader ? (
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              {t("landing.pricingEyebrow")}
            </p>
            <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
              {t("landing.pricingTitle")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
              {t("landing.pricingBody")}
            </p>
          </Reveal>
        ) : null}

        {loading ? (
          <PricingCardsSkeleton />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={revealViewport}
            className={cn(
              "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
              hideHeader ? "mt-0" : "mt-10 sm:mt-14"
            )}
          >
            {plans.map((plan) => {
              const featured = plan.code === FEATURED_PLAN_CODE;
              const preview = plan.features.slice(0, featurePreview);
              const more = Math.max(0, plan.features.length - preview.length);
              const priceLabel =
                plan.monthlyPriceUsd <= 0
                  ? t("landing.pricingFree")
                  : t("landing.pricingAmount", { amount: plan.monthlyPriceUsd });

              return (
                <motion.article
                  key={plan.code}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  transition={landingSpring}
                  className={cn(
                    "relative flex flex-col rounded-[28px] border bg-white p-6 shadow-[0_4px_20px_rgb(15,23,42,0.03)]",
                    featured
                      ? "border-blue-200 ring-2 ring-blue-600/15"
                      : "border-slate-100"
                  )}
                >
                  {featured ? (
                    <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-[0_1px_2px_rgb(15,23,42,0.12)]">
                      {t("landing.pricingPopular")}
                    </span>
                  ) : null}

                  <div className="min-h-[5.5rem]">
                    <h3 className="font-landing-display text-xl tracking-tight text-slate-900">
                      {plan.label}
                    </h3>
                    <p className="mt-1.5 text-sm leading-snug text-slate-500">{plan.description}</p>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span
                      className={cn(
                        "font-landing-display tracking-tight text-slate-900",
                        plan.monthlyPriceUsd <= 0 ? "text-2xl" : "text-3xl"
                      )}
                    >
                      {priceLabel}
                    </span>
                    {plan.monthlyPriceUsd > 0 ? (
                      <span className="text-sm font-medium text-slate-400">
                        {t("landing.pricingPerMonth")}
                      </span>
                    ) : null}
                  </div>
                  {plan.trialDays ? (
                    <p className="mt-1 text-xs font-medium text-blue-600">
                      {t("landing.pricingTrialDays", { days: plan.trialDays })}
                    </p>
                  ) : (
                    <div className="mt-1 h-4" aria-hidden />
                  )}

                  <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <span>
                        {t("landing.pricingStudents", {
                          count: formatSeats(plan.maxStudents, t("landing.pricingUnlimited")),
                        })}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <span>
                        {t("landing.pricingStaff", {
                          count: formatSeats(plan.maxStaff, t("landing.pricingUnlimited")),
                        })}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <span>
                        {t("landing.pricingStorage", {
                          size: formatStorageMb(plan.maxStorageMb, t("landing.pricingUnlimited")),
                        })}
                      </span>
                    </li>
                  </ul>

                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                    {preview.map((key) => (
                      <li key={key} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span>{featureLabel(key)}</span>
                      </li>
                    ))}
                    {more > 0 ? (
                      <li className="ps-6 text-xs font-medium text-slate-400">
                        {t("landing.pricingMoreModules", { count: more })}
                      </li>
                    ) : null}
                  </ul>

                  <Link
                    to="/register-school"
                    className={cn(
                      "mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                      featured
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                    )}
                  >
                    {t("landing.pricingCta")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                  </Link>
                </motion.article>
              );
            })}
          </motion.div>
        )}

        {!loading && showFootnote ? (
          <Reveal className="mx-auto mt-10 max-w-xl text-center text-sm text-slate-500">
            {t("landing.pricingFootnote")}
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
