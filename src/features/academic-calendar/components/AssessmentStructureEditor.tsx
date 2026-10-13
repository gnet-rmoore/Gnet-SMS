import React, { useMemo } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Link2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  activeStructureWeightTotal,
  parseAssessmentStructure,
  serializeAssessmentStructure,
  DEFAULT_ASSESSMENT_STRUCTURE,
  type AssessmentStructureColumn,
} from "../../../lib/assessmentStructure";

export type AssessmentStructureEditorProps = {
  structureJson?: string | null;
  structureCustom?: boolean;
  onChange: (structureJson: string) => void;
  onCustomChange?: (custom: boolean) => void;
  defaultOpen?: boolean;
};

function newColumn(index: number): AssessmentStructureColumn {
  return {
    id: `col-${Date.now()}-${index}`,
    shortCode: `C${index + 1}`,
    label: `Activity ${index + 1}`,
    weightPct: 0,
    componentType: "ASSIGNMENT",
    isActive: true,
  };
}

export function AssessmentStructureEditor({
  structureJson,
  structureCustom = false,
  onChange,
  onCustomChange,
  defaultOpen = false,
}: AssessmentStructureEditorProps) {
  const { t } = useTranslation("pages");
  const [open, setOpen] = React.useState(defaultOpen);

  const columns = useMemo(() => {
    const parsed = parseAssessmentStructure(structureJson);
    return parsed.columns.length ? parsed.columns : DEFAULT_ASSESSMENT_STRUCTURE;
  }, [structureJson]);

  const totalWeight = activeStructureWeightTotal(columns);
  const isCustom = Boolean(structureCustom);

  const updateColumns = (next: AssessmentStructureColumn[]) => {
    onChange(serializeAssessmentStructure({ columns: next }));
    if (!isCustom && onCustomChange) onCustomChange(true);
  };

  const s = (key: string, opts?: Record<string, unknown>) =>
    t(`academicCalendar.setup.structure.${key}`, opts);

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {s("title", { defaultValue: "Gradebook structure" })}
          </p>
          <p className="text-sm font-medium text-slate-700 mt-0.5">
            {isCustom
              ? s("subtitleCustom", {
                  defaultValue: "Custom breakdown for this assessment only",
                })
              : s("subtitleTemplate", {
                  defaultValue: "Follows Settings → Grading → Structure (school template)",
                })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
              isCustom
                ? "bg-indigo-100 text-indigo-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {isCustom
              ? s("badgeCustom", { defaultValue: "Custom" })
              : s("badgeTemplate", { defaultValue: "School template" })}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-200 bg-white">
          {onCustomChange && (
            <div className="flex flex-wrap gap-2 pt-3">
              {!isCustom ? (
                <button
                  type="button"
                  onClick={() => onCustomChange(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {s("customizeCta", { defaultValue: "Customize for this assessment" })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCustomChange(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {s("useTemplateCta", { defaultValue: "Use school template" })}
                </button>
              )}
            </div>
          )}

          {!isCustom ? (
            <p className="text-sm text-slate-500 leading-relaxed py-2">
              {s("templateHint", {
                defaultValue:
                  "Teachers see columns from your school-wide gradebook structure. Save Settings → Grading → Structure to update all template-following assessments.",
              })}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="text-left py-2 pr-2">{s("code", { defaultValue: "Code" })}</th>
                      <th className="text-left py-2 pr-2">{s("label", { defaultValue: "Label" })}</th>
                      <th className="text-left py-2 pr-2">{s("type", { defaultValue: "Type" })}</th>
                      <th className="text-left py-2 pr-2">{s("weight", { defaultValue: "Weight %" })}</th>
                      <th className="py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col, idx) => (
                      <tr key={col.id} className="border-t border-slate-100">
                        <td className="py-2 pr-2">
                          <input
                            value={col.shortCode || col.code || ""}
                            onChange={(e) => {
                              const next = [...columns];
                              next[idx] = {
                                ...col,
                                shortCode: e.target.value.toUpperCase(),
                                code: e.target.value.toUpperCase(),
                              };
                              updateColumns(next);
                            }}
                            className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs font-bold"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={col.label || col.name || ""}
                            onChange={(e) => {
                              const next = [...columns];
                              next[idx] = { ...col, label: e.target.value, name: e.target.value };
                              updateColumns(next);
                            }}
                            className="w-full min-w-[8rem] px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={col.componentType || "ASSIGNMENT"}
                            onChange={(e) => {
                              const next = [...columns];
                              next[idx] = { ...col, componentType: e.target.value };
                              updateColumns(next);
                            }}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="ASSIGNMENT">Assignment</option>
                            <option value="QUIZ">Quiz</option>
                            <option value="CLASSWORK">Class work</option>
                            <option value="EXAM">Exam</option>
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={col.weightPct}
                            onChange={(e) => {
                              const next = [...columns];
                              next[idx] = {
                                ...col,
                                weightPct: Number(e.target.value) || 0,
                              };
                              updateColumns(next);
                            }}
                            className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                          />
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => updateColumns(columns.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            aria-label="Remove column"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateColumns([...columns, newColumn(columns.length)])}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {s("addColumn", { defaultValue: "Add column" })}
                </button>
                <button
                  type="button"
                  onClick={() => updateColumns([...DEFAULT_ASSESSMENT_STRUCTURE])}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  {s("resetDefault", { defaultValue: "Reset to default" })}
                </button>
              </div>
              {Math.abs(totalWeight - 100) >= 0.01 && (
                <p className="text-xs font-medium text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
                  {s("weightWarning", {
                    total: totalWeight,
                    defaultValue: "Active weights should total 100% (currently {{total}}%).",
                  })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
