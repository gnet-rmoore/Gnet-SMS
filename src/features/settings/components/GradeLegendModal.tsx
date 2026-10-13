import React from "react";
import { Plus, Trash2, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  fieldSelect,
} from "../../academics-shared/FeatureModalShell";

export type GradeLegendModalProps = {
  editingLegend?: any;
  handleAddScale?: () => void;
  handleRemoveScale?: (idx: number) => void;
  handleSaveLegend?: () => void;
  handleScaleChange?: (idx: number, field: string, value: any) => void;
  newLegendCategory?: string;
  newLegendName?: string;
  newScales?: any[];
  saving?: boolean;
  setIsLegendModalOpen?: (open: boolean) => void;
  setNewLegendCategory?: (v: string) => void;
  setNewLegendName?: (v: string) => void;
};

export function GradeLegendModal({
  editingLegend,
  handleAddScale,
  handleRemoveScale,
  handleSaveLegend,
  handleScaleChange,
  newLegendCategory,
  newLegendName,
  newScales = [],
  saving,
  setIsLegendModalOpen,
  setNewLegendCategory,
  setNewLegendName,
}: GradeLegendModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const m = (key: string) => t(`settings.gradeLegendModal.${key}`);

  return (
    <FeatureModalShell
      wide
      eyebrow={m("eyebrow")}
      title={editingLegend ? m("editTitle") : m("createTitle")}
      subtitle={m("subtitle")}
      onClose={() => setIsLegendModalOpen?.(false)}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => setIsLegendModalOpen?.(false)}
            className="px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
          >
            {m("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSaveLegend}
            disabled={saving || !newLegendName}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            {saving ? m("saving") : m("save")}
          </button>
        </div>
      }
    >
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{m("name")}</label>
            <input
              type="text"
              value={newLegendName}
              onChange={(e) => setNewLegendName?.(e.target.value)}
              placeholder={m("namePlaceholder")}
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{m("category")}</label>
            <select
              value={newLegendCategory}
              onChange={(e) => setNewLegendCategory?.(e.target.value)}
              className={fieldSelect}
            >
              <option value="CLASS">{m("categoryClass")}</option>
              <option value="ASSIGNMENT">{m("categoryAssignment")}</option>
              <option value="QUIZ">{m("categoryQuiz")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              {m("scales")}
            </h4>
            <button
              type="button"
              onClick={handleAddScale}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 px-3 py-1.5 bg-indigo-50 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              {m("addRow")}
            </button>
          </div>

          <div className="space-y-3">
            {newScales.map((scale, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-2xl border border-slate-100"
              >
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                    {m("minScore")}
                  </label>
                  <input
                    type="number"
                    value={scale.minScore}
                    onChange={(e) =>
                      handleScaleChange?.(idx, "minScore", parseInt(e.target.value, 10))
                    }
                    className={`${fieldInput} py-2 text-sm`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                    {m("maxScore")}
                  </label>
                  <input
                    type="number"
                    value={scale.maxScore}
                    onChange={(e) =>
                      handleScaleChange?.(idx, "maxScore", parseInt(e.target.value, 10))
                    }
                    className={`${fieldInput} py-2 text-sm`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                    {m("letter")}
                  </label>
                  <input
                    type="text"
                    value={scale.gradeLetter}
                    onChange={(e) =>
                      handleScaleChange?.(idx, "gradeLetter", e.target.value)
                    }
                    className={`${fieldInput} py-2 text-sm text-center text-indigo-700`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                    {m("gpa")}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={scale.gpaPoints}
                    onChange={(e) =>
                      handleScaleChange?.(
                        idx,
                        "gpaPoints",
                        parseFloat(e.target.value)
                      )
                    }
                    className={`${fieldInput} py-2 text-sm`}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                    {m("remark")}
                  </label>
                  <input
                    type="text"
                    value={scale.remark}
                    onChange={(e) =>
                      handleScaleChange?.(idx, "remark", e.target.value)
                    }
                    className={`${fieldInput} py-2 text-sm`}
                  />
                </div>
                <div className="col-span-1 pb-0.5">
                  <button
                    type="button"
                    onClick={() => handleRemoveScale?.(idx)}
                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FeatureModalShell>
  );
}
