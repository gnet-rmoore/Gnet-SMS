import React, { useState } from "react";
import { X, Check, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  { id: "gradeLevels", title: "Grade Levels", description: "Set up your grade levels" },
  { id: "subjects", title: "Subjects", description: "Add core subjects" },
  { id: "classes", title: "Classes/Sections", description: "Create classes for each grade" },
  { id: "offerings", title: "Subject Offerings", description: "Assign subjects to grades" },
  { id: "review", title: "Review", description: "Review your setup" },
];

export function CurriculumSetupWizard({ open, onClose, onComplete }: any) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Quick Setup Wizard</h2>
            <p className="text-sm text-slate-500 mt-1">Set up your curriculum in minutes</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {STEPS.map((s: any, idx: number) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={"w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm " + (idx < currentStep ? "bg-green-100 text-green-700" : idx === currentStep ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400")}
                  >
                    {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-bold text-slate-900">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.description}</p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
            <p className="text-slate-500">{step.description}</p>
            <p className="text-sm text-slate-400 mt-4">Use the forms in each tab to complete setup.</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-6 border-t border-slate-200">
          <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold disabled:opacity-50 flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button onClick={() => { if (currentStep === STEPS.length - 1) { onComplete(); onClose(); } else { setCurrentStep(currentStep + 1); } }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-2">
            {currentStep === STEPS.length - 1 ? "Complete" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}