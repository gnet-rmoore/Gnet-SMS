import React from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useTranslation } from "react-i18next";
import { LandingCta } from "./Reveal";
import { landingEase } from "../motion";

const PARALLAX_IMAGE = "/marketing/parallax-campus.jpg";

/**
 * Mid-page full-bleed campus band with scroll parallax.
 * Image: Unsplash campus exterior (photo-1562774053-701939374585).
 */
export function ParallaxBand() {
  const { t } = useTranslation("public");
  const sectionRef = React.useRef<HTMLElement>(null);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.18]);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="campus"
      className="relative isolate flex min-h-0 items-center overflow-hidden bg-slate-950 sm:min-h-[min(72vh,36rem)]"
      aria-labelledby="parallax-heading"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.img
          src={PARALLAX_IMAGE}
          alt=""
          width={2400}
          height={1571}
          decoding="async"
          loading="lazy"
          className="h-[130%] w-full object-cover"
          style={
            reduceMotion
              ? { y: 0, scale: 1.06 }
              : { y: imageY, scale: imageScale }
          }
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, ease: landingEase }}
          className="max-w-xl"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            {t("landing.parallaxEyebrow")}
          </p>
          <h2
            id="parallax-heading"
            className="mt-4 font-landing-display text-3xl tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight"
          >
            {t("landing.parallaxTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            {t("landing.parallaxBody")}
          </p>
          <div className="mt-8">
            <LandingCta to="/register-school" variant="primary">
              {t("landing.registerCta")}
            </LandingCta>
          </div>
        </motion.div>
      </div>

      <span className="sr-only">{t("landing.parallaxImageAlt")}</span>
    </section>
  );
}
