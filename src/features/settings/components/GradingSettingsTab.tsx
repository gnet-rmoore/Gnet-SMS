import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  Layout,
  ChevronUp,
  ChevronDown,
  Save,
} from "lucide-react";
import { settingsApi } from "../api";
import { DataTable, dataTableClass } from "../../../components/ui";
import { defaultMaxScoreForColumn } from "../../../lib/assessmentStructure";

export type GradeScale = {
  id?: string;
  minScore: number;
  maxScore: number;
  gradeLetter: string;
  gpaPoints: number;
  remark: string;
};

export type GradeLegend = {
  id: string;
  name: string;
  category?: string;
  scales: GradeScale[];
};

export type GradingSettingsTabProps = {
  gradingSubTab: "SCALES" | "STRUCTURE";
  setGradingSubTab: (t: "SCALES" | "STRUCTURE") => void;
  legends: GradeLegend[];
  setEditingLegend: (l: GradeLegend | null) => void;
  setNewLegendName: (v: string) => void;
  setNewLegendCategory: (v: string) => void;
  setNewScales: (s: GradeScale[]) => void;
  setIsLegendModalOpen: (v: boolean) => void;
  openEditModal: (legend: GradeLegend) => void;
  handleDeleteLegend: (id: string) => void;
  gradebookColumns: any[];
  setGradebookColumns: (cols: any[]) => void;
  schoolId?: string;
  setSchool: (s: any) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
};

const DEFAULT_SCALES: GradeScale[] = [
  { minScore: 90, maxScore: 100, gradeLetter: "A", gpaPoints: 4.0, remark: "Excellent" },
  { minScore: 80, maxScore: 89, gradeLetter: "B", gpaPoints: 3.0, remark: "Very Good" },
  { minScore: 70, maxScore: 79, gradeLetter: "C", gpaPoints: 2.0, remark: "Good" },
  { minScore: 60, maxScore: 69, gradeLetter: "D", gpaPoints: 1.0, remark: "Pass" },
  { minScore: 0, maxScore: 59, gradeLetter: "F", gpaPoints: 0.0, remark: "Fail" },
];

export function GradingSettingsTab({
  gradingSubTab,
  setGradingSubTab,
  legends,
  setEditingLegend,
  setNewLegendName,
  setNewLegendCategory,
  setNewScales,
  setIsLegendModalOpen,
  openEditModal,
  handleDeleteLegend,
  gradebookColumns,
  setGradebookColumns,
  schoolId,
  setSchool,
  saving,
  setSaving,
  showToast,
}: GradingSettingsTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const g = (key: string, opts?: Record<string, unknown>) =>
    t(`settings.grading.${key}`, opts);
  const totalWeight = gradebookColumns.reduce(
    (sum, col) => sum + (col.isActive ? Number(col.weightPct || 0) : 0),
    0
  );
  const totalMaxPoints = gradebookColumns.reduce(
    (sum, col) =>
      sum +
      (col.isActive
        ? defaultMaxScoreForColumn(col)
        : 0),
    0
  );
  const weightIsValid = Math.abs(totalWeight - 100) < 0.01;
  const maxPointsAreValid = totalMaxPoints <= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{g("title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{g("subtitle")}</p>
          <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
            {g("structureTemplateHint", {
              defaultValue:
                "Structure here is the default for all assessments. Per-assessment overrides live in Academic Calendar → Step 3.",
            })}
          </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {(
          [
            { id: "SCALES" as const, label: g("tabLegends") },
            { id: "STRUCTURE" as const, label: g("tabStructure") },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setGradingSubTab(tab.id)}
            className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
              gradingSubTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {gradingSubTab === "SCALES" ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                {g("legendsTitle")}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{g("legendsHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingLegend(null);
                setNewLegendName("");
                setNewLegendCategory("CLASS");
                setNewScales(DEFAULT_SCALES);
                setIsLegendModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm self-start"
            >
              <Plus className="w-4 h-4" />
              {g("addLegend")}
            </button>
          </div>

          {legends.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white py-16 text-center px-6">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-extrabold tracking-tight text-slate-900">{g("noLegends")}</p>
              <p className="text-sm text-slate-500 mt-1">{g("noLegendsHint")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {legends.map((legend) => (
                <div
                  key={legend.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                >
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <h4 className="font-extrabold tracking-tight text-slate-900 truncate">
                        {legend.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 shrink-0">
                        {legend.category === "ASSIGNMENT"
                          ? g("categoryAssignments")
                          : legend.category === "QUIZ"
                            ? g("categoryQuizzes")
                            : g("categoryClassAvg")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(legend)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLegend(legend.id)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <DataTable>
                      <table className={dataTableClass.table}>
                        <thead className={dataTableClass.thead}>
                          <tr>
                            <th className={dataTableClass.th}>{g("tableRange")}</th>
                            <th className={dataTableClass.th}>{g("tableGrade")}</th>
                            <th className={dataTableClass.th}>{g("tableGpa")}</th>
                            <th className={dataTableClass.th}>{g("tableRemark")}</th>
                          </tr>
                        </thead>
                        <tbody className={dataTableClass.tbody}>
                          {[...legend.scales]
                            .sort((a, b) => b.minScore - a.minScore)
                            .map((scale, idx) => (
                              <tr key={idx}>
                                <td className={`${dataTableClass.td} font-medium text-slate-800 font-mono text-xs`}>
                                  {scale.minScore}% – {scale.maxScore}%
                                </td>
                                <td className={dataTableClass.td}>
                                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-xs">
                                    {scale.gradeLetter}
                                  </span>
                                </td>
                                <td className={`${dataTableClass.td} font-mono font-bold text-slate-600`}>
                                  {Number(scale.gpaPoints).toFixed(1)}
                                </td>
                                <td className={`${dataTableClass.td} text-slate-500`}>
                                  <span className="truncate block">{scale.remark}</span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </DataTable>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Layout className="w-4 h-4 text-indigo-600" />
              {g("structureTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{g("structureHint")}</p>
            <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {g("structureTemplateHint", {
                defaultValue:
                  "This is the default column layout for all assessments. Override per assessment in Academic Calendar → Step 3.",
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {g("columns")}
              </p>
              <button
                type="button"
                onClick={() => {
                  const id = `col_${Date.now()}`;
                  setGradebookColumns([
                    ...gradebookColumns,
                    {
                      id,
                      name: g("newCategoryDefault"),
                      code: "NEW",
                      weightPct: 0,
                      maxScore: 10,
                      isActive: true,
                    },
                  ]);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 px-3 py-1.5 bg-indigo-50 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {g("addColumn")}
              </button>
            </div>

            <div className="p-5">
              <DataTable>
                <table className={dataTableClass.table}>
                  <thead className={dataTableClass.thead}>
                    <tr>
                      <th className={`${dataTableClass.th} w-12 text-center`}>{g("order")}</th>
                      <th className={dataTableClass.th}>{g("name")}</th>
                      <th className={dataTableClass.th}>{g("code")}</th>
                      <th className={dataTableClass.th}>{g("maxPoints", { defaultValue: "Max pts" })}</th>
                      <th className={dataTableClass.th}>{g("weight")}</th>
                      <th className={`${dataTableClass.th} w-20 text-center`}>{g("active")}</th>
                      <th className={`${dataTableClass.th} w-12`} />
                    </tr>
                  </thead>
                  <tbody className={dataTableClass.tbody}>
                  {gradebookColumns.map((col, idx) => (
                    <tr key={col.id}>
                      <td className={`${dataTableClass.td} text-center`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const next = [...gradebookColumns];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              setGradebookColumns(next);
                            }}
                            className="p-0.5 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-20"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === gradebookColumns.length - 1}
                            onClick={() => {
                              const next = [...gradebookColumns];
                              [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                              setGradebookColumns(next);
                            }}
                            className="p-0.5 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-20"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className={dataTableClass.td}>
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => {
                            const next = [...gradebookColumns];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setGradebookColumns(next);
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                        />
                      </td>
                      <td className={`${dataTableClass.td} w-28`}>
                        <input
                          type="text"
                          maxLength={4}
                          value={col.code}
                          onChange={(e) => {
                            const next = [...gradebookColumns];
                            next[idx] = {
                              ...next[idx],
                              code: e.target.value.toUpperCase(),
                              shortCode: e.target.value.toUpperCase(),
                            };
                            setGradebookColumns(next);
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-center uppercase font-bold text-indigo-600 text-sm"
                        />
                      </td>
                      <td className={`${dataTableClass.td} w-24`}>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={col.maxScore ?? defaultMaxScoreForColumn(col)}
                          onChange={(e) => {
                            const next = [...gradebookColumns];
                            next[idx] = {
                              ...next[idx],
                              maxScore: Number(e.target.value) || 10,
                            };
                            setGradebookColumns(next);
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono font-bold text-sm"
                        />
                      </td>
                      <td className={`${dataTableClass.td} w-28`}>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={col.weightPct}
                            onChange={(e) => {
                              const next = [...gradebookColumns];
                              next[idx] = {
                                ...next[idx],
                                weightPct: Number(e.target.value),
                              };
                              setGradebookColumns(next);
                            }}
                            className="w-full pl-3 pr-7 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-right font-mono font-bold text-sm"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                            %
                          </span>
                        </div>
                      </td>
                      <td className={`${dataTableClass.td} text-center`}>
                        <input
                          type="checkbox"
                          checked={col.isActive}
                          onChange={(e) => {
                            const next = [...gradebookColumns];
                            next[idx] = { ...next[idx], isActive: e.target.checked };
                            setGradebookColumns(next);
                          }}
                          className="w-4 h-4 text-indigo-600 accent-indigo-600 rounded"
                        />
                      </td>
                      <td className={`${dataTableClass.td} text-center`}>
                        <button
                          type="button"
                          onClick={() =>
                            setGradebookColumns(
                              gradebookColumns.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </DataTable>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-slate-500 font-medium">
                      {g("activeTotal")}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg font-mono font-extrabold text-sm ${
                        weightIsValid
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {Math.round(totalWeight * 100) / 100}% / 100%
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg font-mono font-extrabold text-sm ${
                        maxPointsAreValid
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {g("activeMaxPoints", { defaultValue: "Max pts total" })}: {totalMaxPoints} / 100
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!weightIsValid) {
                        showToast(
                          g("toastWeightOff", {
                            total: Math.round(totalWeight * 100) / 100,
                          }),
                          "error"
                        );
                        return;
                      }
                      if (!maxPointsAreValid) {
                        showToast(
                          g("toastMaxPointsOff", {
                            total: totalMaxPoints,
                            max: 100,
                            defaultValue: `Max pts total ${totalMaxPoints}; it must not exceed 100.`,
                          }),
                          "error"
                        );
                        return;
                      }
                      if (!schoolId) return;
                      setSaving(true);
                      try {
                        const updatedSchool = await settingsApi.updateSchool(schoolId, {
                          gradebookConfig: JSON.stringify(gradebookColumns),
                        });
                        setSchool(updatedSchool);
                        try {
                          await settingsApi.syncGradebookStructureTemplate(schoolId);
                        } catch (syncErr) {
                          console.warn("Gradebook structure sync to assessments failed:", syncErr);
                          showToast(
                            g("toastStructureSyncFailed", {
                              defaultValue:
                                "Grading settings were saved, but existing assessments could not be updated. Retry the save or contact support.",
                            }),
                            "error"
                          );
                          return;
                        }
                        showToast(g("toastStructureSaved"));
                      } catch (e: any) {
                        console.error(e);
                        showToast(e?.message || g("toastStructureFailed"), "error");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? g("saving") : g("saveStructure")}
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  {g("maxPointsHint", {
                    defaultValue:
                      "Active Max pts are raw score caps and must total 100 or less. Active weights are percentages and must total exactly 100%.",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
