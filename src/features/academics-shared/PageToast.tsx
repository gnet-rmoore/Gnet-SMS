import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

export type ToastState = {
  message: string;
  type: "success" | "error" | "info";
} | null;

export function usePageToast(durationMs = 3500) {
  const [toast, setToast] = React.useState<ToastState>(null);

  const showToast = React.useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), durationMs);
    },
    [durationMs]
  );

  return { toast, setToast, showToast };
}

export function PageToast({ toast }: { toast: ToastState }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-6 right-6 z-[110] flex items-center gap-3 px-5 py-4 rounded-2xl border text-sm font-bold shadow-[0_4px_20px_rgb(0,0,0,0.08)] max-w-sm ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-100"
              : toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-100"
                : "bg-indigo-50 text-indigo-800 border-indigo-100"
          }`}
        >
          {toast.type === "error" ? (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : toast.type === "info" ? (
            <Info className="w-5 h-5 text-indigo-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span className="leading-snug">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
