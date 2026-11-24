import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useDrawerA11y } from "../../hooks/useDrawerA11y";

type Props = {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  headerLead?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  layerClass?: string;
  suspendA11y?: boolean;
};

export function DetailDrawerShell({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  badge,
  headerLead,
  headerActions,
  children,
  footer,
  bodyClassName = "p-5 sm:p-7",
  layerClass = "z-[100]",
  suspendA11y = false,
}: Props) {
  const { t } = useTranslation(["common"]);
  const titleId = React.useId();
  const subtitleId = React.useId();
  const panelRef = React.useRef<HTMLElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const openRef = React.useRef(open);
  const [a11yActive, setA11yActive] = React.useState(open);

  openRef.current = open;
  React.useEffect(() => {
    if (open) setA11yActive(true);
  }, [open]);

  useDrawerA11y({
    open: a11yActive && !suspendA11y,
    panelRef,
    initialFocusRef: closeRef,
    onRequestClose: onClose,
  });

  const layer = (
    <AnimatePresence onExitComplete={() => { if (!openRef.current) setA11yActive(false); }}>
      {open ? (
        <div className={`fixed inset-0 flex items-stretch justify-end ${layerClass}`}>
          <motion.button
            type="button"
            aria-label={t("common:close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={subtitle ? subtitleId : undefined}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="relative z-10 flex h-[100dvh] w-full max-w-[720px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[-20px_0_60px_rgb(15,23,42,0.18)] xl:max-w-[880px]"
          >
            <header className="shrink-0 border-b border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 px-5 py-5 text-white sm:px-8 sm:py-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-4">
                  {headerLead}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {eyebrow ? (
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">
                          {eyebrow}
                        </p>
                      ) : null}
                      {badge}
                    </div>
                    <h2 id={titleId} className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                      {title}
                    </h2>
                    {subtitle ? (
                      <p id={subtitleId} className="mt-1 text-sm font-medium text-slate-400">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {headerActions}
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                    aria-label={t("common:close")}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </header>
            <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white ${bodyClassName}`}>
              {children}
            </div>
            {footer ? (
              <div className="flex shrink-0 items-center justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
                {footer}
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return layer;
  return createPortal(layer, document.body);
}
