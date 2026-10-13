import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  LayoutDashboard,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LandingCta, Reveal } from "./Reveal";
import { fadeUp, landingEase, landingSpring, revealViewport, staggerContainer } from "../motion";

type Step = {
  n: string;
  icon: LucideIcon;
  title: string;
  body: string;
};

function FlowArrow({ delay, vertical = false }: { delay: number; vertical?: boolean }) {
  const Icon = vertical ? ArrowDown : ArrowRight;
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [rtl, setRtl] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    setRtl(document.documentElement.dir === "rtl");
    return () => mq.removeEventListener("change", apply);
  }, []);

  const pulse = reduceMotion
    ? undefined
    : vertical
      ? { y: [0, 4, 0] }
      : { x: rtl ? [0, -5, 0] : [0, 5, 0] };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={revealViewport}
      transition={{ duration: 0.45, ease: landingEase, delay }}
      className={`flex shrink-0 items-center justify-center ${vertical ? "py-1" : "px-1"}`}
      aria-hidden
    >
      <motion.span
        animate={pulse}
        transition={{
          duration: 1.6,
          ease: "easeInOut",
          repeat: Infinity,
          delay: delay + 0.4,
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_4px_16px_rgb(15,23,42,0.06)]"
      >
        <Icon className={`h-4 w-4 ${vertical ? "" : "rtl:rotate-180"}`} strokeWidth={2.25} />
      </motion.span>
    </motion.div>
  );
}

function StepCard({
  step,
  isLast,
  registerLabel,
}: {
  step: Step;
  isLast: boolean;
  registerLabel: string;
}) {
  const Icon = step.icon;

  return (
    <motion.li
      variants={fadeUp}
      className={`group flex h-full flex-col rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-[0_8px_28px_rgb(15,23,42,0.05)] sm:p-8 ${
        isLast ? "bg-gradient-to-b from-white to-slate-50/80" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <motion.div
            whileHover={{ y: -2, scale: 1.04 }}
            transition={landingSpring}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50 text-blue-600 shadow-[0_4px_16px_rgb(15,23,42,0.04)] transition-[background-color,border-color,color,box-shadow] duration-300 group-hover:border-blue-200 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_12px_28px_rgb(37,99,235,0.28)]"
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </motion.div>
          <span className="absolute -end-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-lg bg-slate-900 px-1.5 font-mono text-[11px] font-bold tracking-wide text-white">
            {step.n}
          </span>
        </div>
        <div className="min-w-0 pt-1.5">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{step.title}</h3>
        </div>
      </div>
      <p className="mt-5 flex-1 text-sm leading-relaxed text-slate-500 sm:mt-6 sm:text-[15px]">
        {step.body}
      </p>
      {isLast ? (
        <Link
          to="/register-school"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2"
        >
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />
          {registerLabel}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        </Link>
      ) : null}
    </motion.li>
  );
}

export function HowItWorks() {
  const { t } = useTranslation("public");
  const steps: Step[] = [
    {
      n: "01",
      icon: Building2,
      title: t("landing.how1Title"),
      body: t("landing.how1Body"),
    },
    {
      n: "02",
      icon: UserPlus,
      title: t("landing.how2Title"),
      body: t("landing.how2Body"),
    },
    {
      n: "03",
      icon: LayoutDashboard,
      title: t("landing.how3Title"),
      body: t("landing.how3Body"),
    },
  ];
  const registerLabel = t("landing.registerSchool");

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-slate-100 py-12 sm:py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(37,99,235,0.07),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              {t("landing.howEyebrow")}
            </p>
            <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
              {t("landing.howTitle")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
              {t("landing.howBody")}
            </p>
          </Reveal>

          <Reveal className="shrink-0">
            <LandingCta to="/register-school" variant="light">
              {t("landing.registerCta")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </LandingCta>
          </Reveal>
        </div>

        {/* Desktop: card | arrow | card | arrow | card */}
        <motion.ol
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="mt-10 hidden md:mt-14 md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch"
        >
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <React.Fragment key={step.n}>
                <StepCard step={step} isLast={isLast} registerLabel={registerLabel} />
                {!isLast ? (
                  <li className="flex items-center justify-center self-stretch" aria-hidden>
                    <FlowArrow delay={0.35 + index * 0.22} />
                  </li>
                ) : null}
              </React.Fragment>
            );
          })}
        </motion.ol>

        {/* Mobile: stacked cards with arrows in the gaps */}
        <motion.ol
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="mt-10 flex flex-col md:mt-14 md:hidden"
        >
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <React.Fragment key={step.n}>
                <StepCard step={step} isLast={isLast} registerLabel={registerLabel} />
                {!isLast ? (
                  <li className="flex justify-center py-2" aria-hidden>
                    <FlowArrow delay={0.35 + index * 0.22} vertical />
                  </li>
                ) : null}
              </React.Fragment>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}
