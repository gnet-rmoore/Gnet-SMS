import React from "react";
import { ArrowRight } from "lucide-react";
import { Reveal, LandingCta } from "./Reveal";
import { cn } from "../../../lib/cn";

type CrossLinkBandProps = {
  eyebrow: string;
  title: string;
  body: string;
  ctaTo: string;
  ctaLabel: React.ReactNode;
  className?: string;
};

/**
 * Short cross-link strip between related marketing pages (modules ↔ pricing).
 */
export function CrossLinkBand({
  eyebrow,
  title,
  body,
  ctaTo,
  ctaLabel,
  className,
}: CrossLinkBandProps) {
  return (
    <section className={cn("relative bg-slate-100 py-10 sm:py-14", className)}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_4px_20px_rgb(15,23,42,0.03)] sm:px-10 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                {eyebrow}
              </p>
              <h2 className="mt-2 font-landing-display text-2xl tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">{body}</p>
            </div>
            <LandingCta to={ctaTo} variant="primary" className="shrink-0">
              {ctaLabel}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </LandingCta>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
