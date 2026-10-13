import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion } from "motion/react";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
  wide?: boolean;
};

/** Shared Executive Slate modal chrome for Curriculum / Classrooms. */
export function FeatureModalShell({
  title,
  subtitle,
  eyebrow,
  onClose,
  children,
  footer,
  maxWidthClass,
  wide,
}: Props) {
  const width = maxWidthClass || (wide ? "max-w-3xl" : "max-w-lg");

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className={`relative w-full ${width} bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden flex flex-col max-h-[90dvh]`}
      >
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 px-6 py-5 text-white flex items-start justify-between gap-4 shrink-0 sm:px-8 sm:py-6">
          <div className="min-w-0 space-y-1">
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{eyebrow}</p>
            )}
            <h2 className="text-xl font-extrabold tracking-tight text-white">{title}</h2>
            {subtitle && (
              <p className="text-sm text-slate-300 font-medium leading-relaxed">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 sm:px-8 sm:py-5">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}

export const fieldLabel =
  "block text-xs font-bold uppercase tracking-wider text-slate-500";
export const fieldInput =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
export const fieldSelect = fieldInput;
export const cardShell =
  "bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]";
export const childCard =
  "rounded-2xl border border-slate-100 bg-slate-50";
