import React from "react";

export type GradebookMode = "exams" | "assessment";

export function GradebookModeSwitch({
  mode,
  onChange,
  examLabel,
  assessmentLabel,
}: {
  mode: GradebookMode;
  onChange: (mode: GradebookMode) => void;
  examLabel: string;
  assessmentLabel: string;
}) {
  return (
    <div
      className="inline-flex w-full sm:w-auto p-1 rounded-2xl bg-slate-100 border border-slate-200"
      role="tablist"
      aria-label="Gradebook mode"
    >
      {(
        [
          { id: "assessment" as const, label: assessmentLabel, primary: true },
          { id: "exams" as const, label: examLabel, primary: false },
        ] as const
      ).map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              active
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
            {tab.primary && !active && (
              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                ·
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
