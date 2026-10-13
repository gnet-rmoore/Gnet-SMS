import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { Link } from "react-router-dom";
import { fadeUp, revealViewport, staggerContainer, landingSpring } from "../motion";
import { cn } from "../../../lib/cn";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
} & Omit<HTMLMotionProps<"div">, "children" | "className">;

export function Reveal({ children, className, stagger = false, ...rest }: RevealProps) {
  return (
    <motion.div
      variants={stagger ? staggerContainer : fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  ...rest
}: { children: React.ReactNode; className?: string } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div variants={fadeUp} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

type LandingCtaProps = {
  to: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "outline" | "light";
  className?: string;
  onClick?: () => void;
};

export function LandingCta({
  to,
  children,
  variant = "primary",
  className,
  onClick,
}: LandingCtaProps) {
  const base =
    "group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2";

  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 focus-visible:ring-offset-white"
      : variant === "outline"
        ? "border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15 focus-visible:ring-offset-slate-950"
        : variant === "light"
          ? "border border-slate-200/90 bg-white text-slate-800 shadow-[0_4px_20px_rgb(15,23,42,0.04)] hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-offset-white"
          : "text-slate-200 hover:text-white focus-visible:ring-offset-slate-950";

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={landingSpring}
    >
      <Link to={to} onClick={onClick} className={cn(base, styles, className)}>
        {variant === "primary" ? (
          <span
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
            aria-hidden
          />
        ) : null}
        <span className="relative inline-flex items-center gap-2">{children}</span>
      </Link>
    </motion.div>
  );
}
