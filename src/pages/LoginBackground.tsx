import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** User-provided campus / student photos for the login backdrop slideshow */
export const LOGIN_SLIDES = [
  {
    src: "/marketing/optimized/login-01-1920.webp",
    srcSet:
      "/marketing/optimized/login-01-640.webp 640w, /marketing/optimized/login-01-1280.webp 1280w, /marketing/optimized/login-01-1920.webp 1920w",
  },
  {
    src: "/marketing/optimized/login-02-1920.webp",
    srcSet:
      "/marketing/optimized/login-02-640.webp 640w, /marketing/optimized/login-02-1280.webp 1280w, /marketing/optimized/login-02-1920.webp 1920w",
  },
  {
    src: "/marketing/optimized/login-03-1920.webp",
    srcSet:
      "/marketing/optimized/login-03-640.webp 640w, /marketing/optimized/login-03-1280.webp 1280w, /marketing/optimized/login-03-1920.webp 1920w",
  },
  {
    src: "/marketing/optimized/login-04-1920.webp",
    srcSet:
      "/marketing/optimized/login-04-640.webp 640w, /marketing/optimized/login-04-1280.webp 1280w, /marketing/optimized/login-04-1920.webp 1920w",
  },
] as const;

const SLIDE_MS = 7000;
const FADE_S = 0.9;

type LoginBackgroundProps = {
  className?: string;
};

export function LoginBackground({ className }: LoginBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const next = LOGIN_SLIDES[(index + 1) % LOGIN_SLIDES.length];
    const img = new Image();
    img.src = next.src;
    img.srcset = next.srcSet;
    img.sizes = "100vw";
  }, [index]);

  React.useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOGIN_SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const slide = LOGIN_SLIDES[index];

  return (
    <div className={className} aria-hidden>
      <div className="absolute inset-0 overflow-hidden bg-slate-950">
        {reduceMotion ? (
          <img
            src={LOGIN_SLIDES[0].src}
            srcSet={LOGIN_SLIDES[0].srcSet}
            sizes="100vw"
            alt=""
            width={1920}
            height={1280}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <AnimatePresence initial={false} mode="sync">
            <motion.img
              key={slide.src}
              src={slide.src}
              srcSet={slide.srcSet}
              sizes="100vw"
              alt=""
              width={1920}
              height={1280}
              fetchPriority={index === 0 ? "high" : "low"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: FADE_S, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
        )}
      </div>

      {/* Readability overlays — keep faces visible, form chrome readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/30 to-slate-950/70" />
      <div className="absolute inset-0 bg-gradient-to-tr from-teal-950/40 via-transparent to-amber-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,transparent_0%,rgb(2_6_23/0.5)_100%)]" />
      <div className="absolute -start-24 top-1/4 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />
      <div className="absolute -end-16 bottom-1/4 h-80 w-80 rounded-full bg-amber-400/12 blur-3xl" />
    </div>
  );
}
