import React, { Suspense, lazy } from "react";
import { LandingNav } from "./components/LandingNav";
import { Hero } from "./components/Hero";
import { LandingFooter } from "./components/LandingFooter";
import { StickyMobileCta } from "./components/StickyMobileCta";
import { CursorTrail } from "./components/CursorTrail";
import {
  GallerySkeleton,
  CardGridSkeleton,
  ParallaxSkeleton,
  FaqSkeleton,
  CtaBandSkeleton,
} from "./components/skeletons";

const HeroImageGrid = lazy(() =>
  import("./components/HeroImageGrid").then((m) => ({ default: m.HeroImageGrid }))
);
const TrustStrip = lazy(() =>
  import("./components/TrustStrip").then((m) => ({ default: m.TrustStrip }))
);
const Capabilities = lazy(() =>
  import("./components/Capabilities").then((m) => ({ default: m.Capabilities }))
);
const ParallaxBand = lazy(() =>
  import("./components/ParallaxBand").then((m) => ({ default: m.ParallaxBand }))
);
const Workflows = lazy(() =>
  import("./components/Workflows").then((m) => ({ default: m.Workflows }))
);
const HowItWorks = lazy(() =>
  import("./components/HowItWorks").then((m) => ({ default: m.HowItWorks }))
);
const Audience = lazy(() =>
  import("./components/Audience").then((m) => ({ default: m.Audience }))
);
const Faq = lazy(() => import("./components/Faq").then((m) => ({ default: m.Faq })));
const CtaBand = lazy(() =>
  import("./components/CtaBand").then((m) => ({ default: m.CtaBand }))
);

/**
 * Public marketing landing for Gnet SMS (`/`).
 * Modules → `/modules`; pricing → `/pricing` (not inline).
 * Below-fold sections lazy-load with landing skeletons.
 */
export default function LandingPage() {
  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "pricing") window.location.replace("/pricing");
    if (hash === "modules") window.location.replace("/modules");
  }, []);

  return (
    <div id="top" className="landing-root min-h-screen overflow-x-hidden bg-slate-100 font-landing-sans antialiased">
      <CursorTrail />
      <LandingNav />
      <main id="main-content">
        <Hero />
        <Suspense fallback={<GallerySkeleton />}>
          <HeroImageGrid />
        </Suspense>
        <Suspense
          fallback={
            <section className="border-b border-slate-200 bg-white py-8 sm:py-12" aria-busy="true">
              <div className="mx-auto max-w-6xl space-y-3 px-5 sm:px-8">
                <div className="h-3 w-28 animate-pulse rounded-full bg-blue-100" />
                <div className="h-4 w-full max-w-2xl animate-pulse rounded-xl bg-slate-200/80" />
                <div className="h-4 w-4/5 max-w-xl animate-pulse rounded-xl bg-slate-200/80" />
              </div>
            </section>
          }
        >
          <TrustStrip />
        </Suspense>
        <Suspense fallback={<CardGridSkeleton cards={6} />}>
          <Capabilities />
        </Suspense>
        <Suspense fallback={<ParallaxSkeleton />}>
          <ParallaxBand />
        </Suspense>
        <Suspense fallback={<CardGridSkeleton cards={4} cols="sm:grid-cols-2 lg:grid-cols-4" light />}>
          <Audience />
        </Suspense>
        <Suspense fallback={<CardGridSkeleton cards={3} cols="md:grid-cols-2 lg:grid-cols-3" />}>
          <Workflows />
        </Suspense>
        <Suspense fallback={<CardGridSkeleton cards={3} cols="md:grid-cols-3" light />}>
          <HowItWorks />
        </Suspense>
        <Suspense fallback={<FaqSkeleton />}>
          <Faq />
        </Suspense>
        <Suspense fallback={<CtaBandSkeleton />}>
          <CtaBand />
        </Suspense>
      </main>
      <LandingFooter />
      <StickyMobileCta />
    </div>
  );
}
