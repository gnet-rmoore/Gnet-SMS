import React, { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "./components/LandingNav";
import { LandingFooter } from "./components/LandingFooter";
import { StickyMobileCta } from "./components/StickyMobileCta";
import { CursorTrail } from "./components/CursorTrail";
import { MarketingPageHero } from "./components/MarketingPageHero";
import { ModulesRolesStrip } from "./components/ModulesRolesStrip";
import { MarketingFaq } from "./components/MarketingFaq";
import { CrossLinkBand } from "./components/CrossLinkBand";
import { ModulesCatalogSkeleton, CtaBandSkeleton } from "./components/skeletons";
import { MODULES, MODULE_GROUP_ORDER } from "./content/modules";

const ModuleCatalog = lazy(() =>
  import("./components/ModuleCatalog").then((m) => ({ default: m.ModuleCatalog }))
);
const CtaBand = lazy(() =>
  import("./components/CtaBand").then((m) => ({ default: m.CtaBand }))
);

const MODULES_FAQ = [
  { qKey: "landing.modulesPageFaq1q", aKey: "landing.modulesPageFaq1a" },
  { qKey: "landing.modulesPageFaq2q", aKey: "landing.modulesPageFaq2a" },
  { qKey: "landing.modulesPageFaq3q", aKey: "landing.modulesPageFaq3a" },
  { qKey: "landing.modulesPageFaq4q", aKey: "landing.modulesPageFaq4a" },
  { qKey: "landing.modulesPageFaq5q", aKey: "landing.modulesPageFaq5a" },
];

/**
 * Dedicated public modules catalog (`/modules`).
 */
export default function ModulesPage() {
  const { t } = useTranslation("public");
  const liveCount = MODULES.filter((m) => m.status === "live").length;
  const domainCount = MODULE_GROUP_ORDER.length;

  React.useEffect(() => {
    const prev = document.title;
    document.title = t("landing.modulesPageDocTitle");
    return () => {
      document.title = prev;
    };
  }, [t]);

  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-slate-100 font-landing-sans antialiased">
      <CursorTrail />
      <LandingNav activeRoute="modules" />
      <main id="main-content" className="pt-[4.25rem] sm:pt-24">
        <MarketingPageHero
          eyebrow={t("landing.modulesPageEyebrow")}
          title={t("landing.modulesPageTitle")}
          body={t("landing.modulesPageBody")}
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
            to: "/pricing",
            label: t("landing.modulesPageCtaPricing"),
            variant: "light",
          }}
          stats={[
            { value: String(liveCount), label: t("landing.modulesPageStatLive") },
            { value: String(domainCount), label: t("landing.modulesPageStatDomains") },
          ]}
        />

        <Suspense fallback={<ModulesCatalogSkeleton />}>
          <ModuleCatalog standalone />
        </Suspense>

        <ModulesRolesStrip />

        <MarketingFaq
          id="modules-faq"
          eyebrow={t("landing.modulesPageFaqEyebrow")}
          title={t("landing.modulesPageFaqTitle")}
          body={t("landing.modulesPageFaqBody")}
          items={MODULES_FAQ}
        />

        <CrossLinkBand
          eyebrow={t("landing.modulesPageCrossEyebrow")}
          title={t("landing.modulesPageCrossTitle")}
          body={t("landing.modulesPageCrossBody")}
          ctaTo="/pricing"
          ctaLabel={t("landing.modulesPageCrossCta")}
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
