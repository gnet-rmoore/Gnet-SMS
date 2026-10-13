import React from "react";
import { motion, useMotionValue, useSpring, type MotionValue } from "motion/react";

type TrailSpring = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  size: number;
  opacity: number;
};

function useTrailSpring(sourceX: MotionValue<number>, sourceY: MotionValue<number>, index: number): TrailSpring {
  const stiffness = 300 - index * 30;
  const damping = 24 + index * 2.5;
  const x = useSpring(sourceX, { stiffness, damping, mass: 0.4 });
  const y = useSpring(sourceY, { stiffness, damping, mass: 0.4 });
  return {
    x,
    y,
    size: Math.max(5, 14 - index),
    opacity: Math.max(0.1, 0.5 - index * 0.05),
  };
}

/**
 * Soft cursor trail for the landing page — Motion springs ([motion.dev](https://motion.dev/)).
 * Fine-pointer desktop only; respects prefers-reduced-motion and touch.
 */
export function CursorTrail() {
  const [enabled, setEnabled] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  const mouseX = useMotionValue(-120);
  const mouseY = useMotionValue(-120);

  const trail = [
    useTrailSpring(mouseX, mouseY, 0),
    useTrailSpring(mouseX, mouseY, 1),
    useTrailSpring(mouseX, mouseY, 2),
    useTrailSpring(mouseX, mouseY, 3),
    useTrailSpring(mouseX, mouseY, 4),
    useTrailSpring(mouseX, mouseY, 5),
    useTrailSpring(mouseX, mouseY, 6),
    useTrailSpring(mouseX, mouseY, 7),
  ];

  React.useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setEnabled(fine.matches && !reduce.matches);
    apply();
    fine.addEventListener("change", apply);
    reduce.addEventListener("change", apply);
    return () => {
      fine.removeEventListener("change", apply);
      reduce.removeEventListener("change", apply);
    };
  }, []);

  React.useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setVisible(true);
    };
    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, mouseX, mouseY]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] hidden md:block" aria-hidden>
      {trail.map((dot, i) => (
        <motion.div
          key={i}
          style={{
            x: dot.x,
            y: dot.y,
            width: dot.size,
            height: dot.size,
            marginLeft: -dot.size / 2,
            marginTop: -dot.size / 2,
            opacity: visible ? dot.opacity : 0,
          }}
          className="absolute left-0 top-0 rounded-full bg-blue-500/65 mix-blend-multiply shadow-[0_0_10px_rgba(37,99,235,0.22)] transition-opacity duration-300"
        />
      ))}
    </div>
  );
}
