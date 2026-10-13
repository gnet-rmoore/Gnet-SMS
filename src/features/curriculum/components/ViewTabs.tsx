import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export type ViewTabsProps = {
  activeView?: any;
  setActiveView?: any;
  [key: string]: any;
};

export function ViewTabs({ activeView, setActiveView }: ViewTabsProps) {
  const { t } = useTranslation("pages");
  const tabs = [
    { id: "SYLLABI", label: t("curriculum.tabs.syllabi") },
    { id: "SUBJECTS", label: t("curriculum.tabs.subjects") },
    { id: "GRADE_LEVELS", label: t("curriculum.tabs.gradeLevels") },
  ] as const;

  return (
    <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto">
      {tabs.map((tab) => {
        const active = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className={`relative px-5 py-3 text-sm font-bold transition-colors whitespace-nowrap ${
              active ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {active && (
              <motion.div
                layoutId="activeView"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 rounded-full"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
