import React, { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "./components/LandingNav";
import { LandingFooter } from "./components/LandingFooter";
import { StickyMobileCta } from "./components/StickyMobileCta";
import { CursorTrail } from "./components/CursorTrail";
import { MarketingPageHero } from "./components/MarketingPageHero";
import { Pricing } from "./components/Pricing";
import { PricingCompare } from "./components/PricingCompare";
import { PricingEntitlements } from "./components/PricingEntitlements";
import { MarketingFaq } from "./components/MarketingFaq";
import { CrossLinkBand } from "./components/CrossLinkBand";
import { usePublicPlans } from "./hooks/usePublicPlans";
import { PricingCardsSkeleton, CtaBandSkeleton } from "./components/skeletons";

const CtaBand = lazy(() =>
  import("./components/CtaBand").then((m) => ({ default: m.CtaBand }))
);

const PRICING_FAQ = [
  { qKey: "landing.pricingPageFaq1q", aKey: "landing.pricingPageFaq1a" },
  { qKey: "landing.pricingPageFaq2q", aKey: "landing.pricingPageFaq2a" },
  { qKey: "landing.pricingPageFaq3q", aKey: "landing.pricingPageFaq3a" },
  { qKey: "landing.pricingPageFaq4q", aKey: "landing.pricingPageFaq4a" },
  { qKey: "landing.pricingPageFaq5q", aKey: "landing.pricingPageFaq5a" },
];

/**
 * Dedicated public pricing page (`/pricing`).
 */
export default function PricingPage() {
  const { t } = useTranslation("public");
  const { plans, loading } = usePublicPlans();

  React.useEffect(() => {
    const prev = document.title;
    document.title = t("landing.pricingPageDocTitle");
    return () => {
      document.title = prev;
    };
  }, [t]);

  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-slate-100 font-landing-sans antialiased">
      <CursorTrail />
      <LandingNav activeRoute="pricing" />
      <main id="main-content" className="pt-[4.25rem] sm:pt-24">
        <MarketingPageHero
          eyebrow={t("landing.pricingPageEyebrow")}
          title={t("landing.pricingPageTitle")}
          body={t("landing.pricingPageBody")}
          primaryCta={{
            to: "/register-school",
            label: (
              <>
                {t("landing.registerSchool")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </>
            ),
          }}
          secondaryCta={{
            to: "/modules",
            label: t("landing.pricingPageCtaModules"),
            variant: "light",
          }}
        />

        {loading ? (
          <section className="relative overflow-hidden bg-slate-100 py-10 sm:py-14" aria-busy="true">
            <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
              <PricingCardsSkeleton />
            </div>
          </section>
        ) : (
          <Pricing
            plans={plans}
            loading={false}
            hideHeader
            featurePreview={8}
            showFootnote
          />
        )}

        <PricingCompare plans={plans} loading={loading} />
        <PricingEntitlements />

        <MarketingFaq
          id="pricing-faq"
          eyebrow={t("landing.pricingPageFaqEyebrow")}
          title={t("landing.pricingPageFaqTitle")}
          body={t("landing.pricingPageFaqBody")}
          items={PRICING_FAQ}
        />

        <CrossLinkBand
          eyebrow={t("landing.pricingPageCrossEyebrow")}
          title={t("landing.pricingPageCrossTitle")}
          body={t("landing.pricingPageCrossBody")}
          ctaTo="/modules"
          ctaLabel={t("landing.pricingPageCrossCta")}
        />

        <Suspense fallback={<CtaBandSkeleton />}>
          <CtaBand />
        </Suspense>
      </main>
      <LandingFooter />
      <StickyMobileCta />
    </div>
  );
}
