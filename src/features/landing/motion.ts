import type { Transition, Variants } from "motion/react";

/** Shared easing — confident, not bouncy. */
export const landingEase = [0.22, 1, 0.36, 1] as const;

export const landingTransition: Transition = {
  duration: 0.55,
  ease: landingEase,
};

/** Soft spring for cards / CTAs ([motion.dev](https://motion.dev/) springs). */
export const landingSpring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 28,
  mass: 0.7,
};

export const landingSpringSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.85,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: landingTransition,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.5, ease: landingEase },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

export const staggerFast: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: landingSpringSoft,
  },
};

/** Viewport once + generous margin so sections feel early. */
export const revealViewport = { once: true, amount: 0.22, margin: "0px 0px -8% 0px" } as const;
