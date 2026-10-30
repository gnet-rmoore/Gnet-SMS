import React from "react";
import { cn } from "../../../lib/cn";

/** Shared pulse bone for landing marketing surfaces. */
export function SkeletonBone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/80", className)} aria-hidden />;
}

function SectionShell({
  children,
  className,
  light,
}: {
  children: React.ReactNode;
  className?: string;
  light?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden py-12 sm:py-20 lg:py-28",
        light ? "bg-white" : "bg-slate-50",
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section
      className="relative isolate overflow-hidden bg-slate-950 pt-[4.25rem] sm:min-h-[70vh] sm:pt-[4.75rem]"
      aria-busy="true"
    >
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-16 pt-5 sm:px-8 sm:pb-28 sm:pt-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <SkeletonBone className="h-4 w-24 rounded-full bg-blue-500/20" />
          <SkeletonBone className="mt-4 h-10 w-[90%] max-w-md bg-white/10 sm:h-12" />
          <SkeletonBone className="mt-2 h-10 w-[70%] max-w-sm bg-white/10 sm:h-12" />
          <SkeletonBone className="mt-5 h-4 w-full max-w-lg bg-white/10" />
          <SkeletonBone className="mt-2 h-4 w-4/5 max-w-md bg-white/10" />
          <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
            <SkeletonBone className="h-11 w-full rounded-full bg-white/10 sm:w-40" />
            <SkeletonBone className="h-11 w-full rounded-full bg-white/10 sm:w-40" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function GallerySkeleton() {
  return (
    <SectionShell light className="pb-12 pt-4 sm:pb-24 sm:pt-10">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-4">
          <SkeletonBone className="h-9 w-4/5 max-w-sm" />
          <SkeletonBone className="h-9 w-3/5 max-w-xs" />
          <SkeletonBone className="mt-4 h-4 w-full max-w-md" />
          <SkeletonBone className="h-4 w-5/6 max-w-sm" />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <SkeletonBone key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
        <SkeletonBone className="aspect-[1/1.05] w-full rounded-[28px] sm:aspect-square" />
      </div>
    </SectionShell>
  );
}

export function CardGridSkeleton({
  cards = 6,
  cols = "sm:grid-cols-2 lg:grid-cols-3",
  light,
}: {
  cards?: number;
  cols?: string;
  light?: boolean;
}) {
  return (
    <SectionShell light={light}>
      <div className="max-w-2xl space-y-3">
        <SkeletonBone className="h-3 w-24 rounded-full bg-blue-100" />
        <SkeletonBone className="h-9 w-3/4 max-w-md" />
        <SkeletonBone className="h-4 w-full max-w-lg" />
      </div>
      <div className={cn("mt-8 grid gap-3 sm:mt-12 sm:gap-4", cols)}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgb(15,23,42,0.03)]"
          >
            <div className="flex items-center gap-3">
              <SkeletonBone className="h-9 w-9 rounded-xl" />
              <SkeletonBone className="h-4 w-1/2" />
            </div>
            <SkeletonBone className="mt-4 h-3 w-full" />
            <SkeletonBone className="mt-2 h-3 w-4/5" />
            <div className="mt-4 flex flex-wrap gap-1.5">
              <SkeletonBone className="h-6 w-16 rounded-lg" />
              <SkeletonBone className="h-6 w-20 rounded-lg" />
              <SkeletonBone className="h-6 w-14 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function ParallaxSkeleton() {
  return (
    <section className="relative overflow-hidden bg-slate-900 py-14 sm:min-h-[min(50vh,28rem)] sm:py-28" aria-busy="true">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <SkeletonBone className="h-3 w-28 rounded-full bg-slate-700" />
        <SkeletonBone className="mt-4 h-10 w-3/4 max-w-md bg-slate-700" />
        <SkeletonBone className="mt-3 h-4 w-full max-w-lg bg-slate-700/80" />
        <SkeletonBone className="mt-2 h-4 w-2/3 max-w-sm bg-slate-700/80" />
        <SkeletonBone className="mt-8 h-11 w-40 rounded-xl bg-slate-700" />
      </div>
    </section>
  );
}

export function FaqSkeleton() {
  return (
    <SectionShell>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-4 lg:col-span-4">
          <SkeletonBone className="h-11 w-11 rounded-2xl" />
          <SkeletonBone className="h-3 w-20 rounded-full bg-blue-100" />
          <SkeletonBone className="h-9 w-4/5" />
          <SkeletonBone className="h-4 w-full" />
          <SkeletonBone className="mt-4 h-28 w-full rounded-[24px]" />
        </div>
        <div className="space-y-2.5 lg:col-span-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBone key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function PricingCardsSkeleton() {
  return (
    <div
      className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading plans"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgb(15,23,42,0.03)]"
        >
          <SkeletonBone className="h-6 w-28" />
          <SkeletonBone className="mt-3 h-4 w-full" />
          <SkeletonBone className="mt-2 h-4 w-3/4" />
          <SkeletonBone className="mt-6 h-10 w-24" />
          <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
            {[0, 1, 2, 3, 4].map((j) => (
              <div key={j} className="flex gap-2">
                <SkeletonBone className="h-4 w-4 shrink-0 rounded-full" />
                <SkeletonBone className="h-4 flex-1" />
              </div>
            ))}
          </div>
          <SkeletonBone className="mt-6 h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function MarketingPageHeroSkeleton() {
  return (
    <section className="relative overflow-hidden bg-[#f7f8fb] pb-10 pt-6 sm:pb-14 sm:pt-10" aria-busy="true">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <SkeletonBone className="mx-auto h-3 w-32 rounded-full bg-blue-100" />
          <SkeletonBone className="mx-auto h-10 w-4/5 max-w-lg" />
          <SkeletonBone className="mx-auto h-4 w-full max-w-md" />
          <SkeletonBone className="mx-auto h-4 w-3/4 max-w-sm" />
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
            <SkeletonBone className="h-11 w-full rounded-xl sm:w-40" />
            <SkeletonBone className="h-11 w-full rounded-xl sm:w-36" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function PricingCompareSkeleton() {
  return (
    <SectionShell light>
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <SkeletonBone className="mx-auto h-3 w-28 rounded-full bg-blue-100" />
        <SkeletonBone className="mx-auto h-9 w-3/4 max-w-md" />
        <SkeletonBone className="mx-auto h-4 w-full max-w-lg" />
      </div>
      <div className="mt-10 space-y-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
        <SkeletonBone className="h-10 w-full" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonBone key={i} className="h-8 w-full" />
        ))}
      </div>
    </SectionShell>
  );
}

export function ModulesCatalogSkeleton() {
  return (
    <SectionShell light>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SkeletonBone className="h-11 w-full max-w-md rounded-xl" />
        <div className="flex gap-1.5">
          <SkeletonBone className="h-9 w-16 rounded-full" />
          <SkeletonBone className="h-9 w-16 rounded-full" />
          <SkeletonBone className="h-9 w-20 rounded-full" />
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden space-y-2 lg:block">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonBone key={i} className="h-11 w-full rounded-2xl" />
          ))}
        </div>
        <div className="flex gap-2 overflow-hidden lg:hidden">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBone key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="rounded-[28px] border border-slate-100 bg-slate-50/60 p-5 sm:p-7">
          <SkeletonBone className="h-7 w-48" />
          <SkeletonBone className="mt-2 h-4 w-40" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <SkeletonBone className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBone className="h-4 w-2/3" />
                  <SkeletonBone className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

export function CtaBandSkeleton() {
  return (
    <div className="bg-slate-100 pb-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SkeletonBone className="h-48 w-full rounded-[28px] sm:h-56 sm:rounded-[32px]" />
      </div>
    </div>
  );
}

/** Full-page fallback while lazy landing / pricing / modules chunks load. */
export function LandingPageSkeleton({ variant = "home" }: { variant?: "home" | "pricing" | "modules" }) {
  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-slate-100 font-landing-sans antialiased">
      <div className="fixed inset-x-0 top-0 z-50 px-3 pt-2 sm:px-5 sm:pt-4">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:h-[3.75rem] sm:px-5">
          <div className="flex items-center gap-2">
            <SkeletonBone className="h-8 w-8 rounded-xl bg-blue-100" />
            <SkeletonBone className="hidden h-4 w-24 sm:block" />
          </div>
          <div className="hidden gap-2 lg:flex">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBone key={i} className="h-8 w-16 rounded-full" />
            ))}
          </div>
          <div className="flex gap-2">
            <SkeletonBone className="h-8 w-8 rounded-full" />
            <SkeletonBone className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <main id="main-content" className={variant === "home" ? undefined : "pt-[4.25rem] sm:pt-24"}>
        {variant === "home" ? (
          <>
            <HeroSkeleton />
            <GallerySkeleton />
            <CardGridSkeleton cards={6} />
            <ParallaxSkeleton />
            <CardGridSkeleton cards={4} cols="sm:grid-cols-2 lg:grid-cols-4" light />
            <FaqSkeleton />
            <CtaBandSkeleton />
          </>
        ) : null}
        {variant === "pricing" ? (
          <>
            <MarketingPageHeroSkeleton />
            <SectionShell>
              <PricingCardsSkeleton />
            </SectionShell>
            <PricingCompareSkeleton />
            <CtaBandSkeleton />
          </>
        ) : null}
        {variant === "modules" ? (
          <>
            <MarketingPageHeroSkeleton />
            <ModulesCatalogSkeleton />
            <CtaBandSkeleton />
          </>
        ) : null}
      </main>
    </div>
  );
}
