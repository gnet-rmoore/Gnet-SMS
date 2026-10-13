import React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { landingEase } from "../motion";

export function StickyMobileCta() {
  const { t } = useTranslation("public");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const doc = document.documentElement;
      const nearBottom = y + window.innerHeight > doc.scrollHeight - 420;
      const pastHero = y > window.innerHeight * 0.55;
      setVisible(pastHero && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: landingEase }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(15,23,42,0.08)] backdrop-blur-md md:hidden"
        >
          <div className="mx-auto flex max-w-6xl gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-800"
            >
              {t("landing.signIn")}
            </Link>
            <Link
              to="/register-school"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white"
            >
              {t("landing.registerSchool")}
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
