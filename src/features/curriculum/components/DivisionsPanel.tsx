import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import { curriculumApi } from "../api";
import { cardShell, fieldSelect } from "../../academics-shared/FeatureModalShell";

type Division = {
  id: string;
  name: string;
  code?: string | null;
  sortOrder?: number;
};

type GradeLevel = {
  id: string;
  name: string;
  divisionId?: string | null;
};

export type DivisionsPanelProps = {
  schoolId: string;
  gradeLevels: GradeLevel[];
  onGradesChanged?: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
};

export function DivisionsPanel({
  schoolId,
  gradeLevels,
  onGradesChanged,
  showToast,
}: DivisionsPanelProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await curriculumApi.fetchDivisions(schoolId);
      setDivisions(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setDivisions([]);
      showToast(err?.message || t("curriculum.toast.loadDivisionsFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result: any = await curriculumApi.seedDivisions(schoolId);
      setDivisions(Array.isArray(result?.divisions) ? result.divisions : []);
      onGradesChanged?.();
      showToast(
        result?.created
          ? t("curriculum.toast.seedDivisionsSuccess", { count: result.created })
          : t("curriculum.toast.divisionsAlreadySetup"),
        "success"
      );
      await load();
    } catch (err: any) {
      showToast(err?.message || t("curriculum.toast.seedDivisionsFailed"), "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleAssign = async (gradeId: string, divisionId: string) => {
    try {
      await curriculumApi.updateGradeLevel(gradeId, {
        divisionId: divisionId || null,
      });
      onGradesChanged?.();
      showToast(t("curriculum.toast.gradeAssignedDivision"), "success");
    } catch (err: any) {
      showToast(err?.message || t("curriculum.toast.assignDivisionFailed"), "error");
    }
  };

  return (
    <div className={`${cardShell} p-6 space-y-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
              {t("curriculum.divisions.title")}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("curriculum.divisions.subtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding || loading}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {seeding ? t("curriculum.divisions.seeding") : t("curriculum.divisions.seedDefaults")}
        </button>
      </div>

      {loading ? (
        <div className="h-16 animate-pulse bg-slate-50 rounded-2xl" />
      ) : divisions.length === 0 ? (
        <p className="text-sm text-slate-500">{t("curriculum.divisions.empty")}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {divisions.map((d) => (
              <span
                key={d.id}
                className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider"
              >
                {d.name}
                {d.code ? ` (${d.code})` : ""}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {gradeLevels.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 justify-between bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2"
              >
                <span className="text-sm font-bold text-slate-800 truncate">{g.name}</span>
                <select
                  className={`${fieldSelect} !py-1.5 !text-xs max-w-[10rem]`}
                  value={g.divisionId || ""}
                  onChange={(e) => handleAssign(g.id, e.target.value)}
                >
                  <option value="">{t("curriculum.divisions.unassigned")}</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
