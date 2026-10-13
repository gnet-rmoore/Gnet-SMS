import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** User-provided campus / student photos for the login backdrop slideshow */
export const LOGIN_SLIDES = [
  "/marketing/login-slides/01-study-group.png",
  "/marketing/login-slides/02-campus-selfie-railing.png",
  "/marketing/login-slides/03-campus-selfie-glass.png",
  "/marketing/login-slides/04-friends-together.png",
  "/marketing/login-slides/05-walking-campus.png",
  "/marketing/login-slides/06-cheerful-group.png",
  "/marketing/login-slides/07-golden-hour-selfie.png",
  "/marketing/login-slides/08-thumbs-up-campus.png",
] as const;

const SLIDE_MS = 7000;
const FADE_S = 1.25;

type LoginBackgroundProps = {
  className?: string;
};

export function LoginBackground({ className }: LoginBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    LOGIN_SLIDES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  React.useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOGIN_SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const src = LOGIN_SLIDES[index];

  return (
    <div className={className} aria-hidden>
      <div className="absolute inset-0 overflow-hidden bg-slate-950">
        {reduceMotion ? (
          <img
            src={LOGIN_SLIDES[0]}
            alt=""
            width={1024}
            height={682}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <AnimatePresence initial={false} mode="sync">
            <motion.img
              key={src}
              src={src}
              alt=""
              width={1024}
              height={682}
              fetchPriority={index === 0 ? "high" : "low"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1.12 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: FADE_S, ease: [0.22, 1, 0.36, 1] },
                scale: { duration: SLIDE_MS / 1000 + FADE_S, ease: "linear" },
              }}
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
