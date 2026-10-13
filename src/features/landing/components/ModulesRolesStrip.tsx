import React from "react";
import { useTranslation } from "react-i18next";
import { Reveal, RevealItem } from "./Reveal";
import { PERSONAS } from "../content/personas";

/** Compact 4-up role strip for `/modules` (reuses persona copy — no invented metrics). */
export function ModulesRolesStrip() {
  const { t } = useTranslation("public");
  const roles = PERSONAS.slice(0, 4);

  return (
    <section className="relative overflow-hidden bg-slate-100 py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {t("landing.modulesPageRolesEyebrow")}
          </p>
          <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
            {t("landing.modulesPageRolesTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500">
            {t("landing.modulesPageRolesBody")}
          </p>
        </Reveal>

        <Reveal stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map(({ id, icon: Icon, titleKey, bodyKey }) => (
            <RevealItem
              key={id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgb(15,23,42,0.03)]"
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
