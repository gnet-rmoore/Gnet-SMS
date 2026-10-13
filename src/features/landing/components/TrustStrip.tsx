import React from "react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";

export function TrustStrip() {
  const { t } = useTranslation("public");

  return (
    <section id="trust-strip" className="border-b border-slate-200 bg-white py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {t("landing.trustStripEyebrow")}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600 sm:text-lg">
            {t("landing.trustStripBody")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
