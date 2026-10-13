import React from "react";
import { Users, Puzzle, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal, RevealItem } from "./Reveal";

const CARDS = [
  {
    icon: Users,
    titleKey: "landing.pricingPageEntSeatTitle",
    bodyKey: "landing.pricingPageEntSeatBody",
  },
  {
    icon: Puzzle,
    titleKey: "landing.pricingPageEntFeatureTitle",
    bodyKey: "landing.pricingPageEntFeatureBody",
  },
  {
    icon: SlidersHorizontal,
    titleKey: "landing.pricingPageEntOverrideTitle",
    bodyKey: "landing.pricingPageEntOverrideBody",
  },
] as const;

/** Honest entitlements explainer — no self-serve SaaS billing claim. */
export function PricingEntitlements() {
  const { t } = useTranslation("public");

  return (
    <section className="relative overflow-hidden bg-slate-100 py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {t("landing.pricingPageEntitlementsEyebrow")}
          </p>
          <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
            {t("landing.pricingPageEntitlementsTitle")}
          </h2>
        </Reveal>

        <Reveal stagger className="mt-10 grid gap-4 sm:grid-cols-3">
          {CARDS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <RevealItem
              key={titleKey}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgb(15,23,42,0.03)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-sm font-extrabold tracking-tight text-slate-900">
                {t(titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{t(bodyKey)}</p>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
