import React from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, FileBarChart, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { PageShell, PageHeader, Surface, Button, TextField, DataTable, dataTableClass } from "../../components/ui";
import { confirmAction } from "../../lib/swal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { yearTransitionApi, type PromotionDecision, type PromotionRun, type YearTransitionResult } from "./api";
import { api } from "../../services/api";
import { fetchAllItems } from "../../lib/apiEnvelope";

function defaultYearKey() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  // Academic years often start mid-calendar; Jul+ → y/(y+1)
  if (m >= 6) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

function nextYearKey(from: string) {
  const match = /^(\d{4})-(\d{4})$/.exec(from.trim());
  if (match) return `${Number(match[1]) + 1}-${Number(match[2]) + 1}`;
  const y = new Date().getFullYear();
  return `${y + 1}-${y + 2}`;
}

export function YearTransitionPage() {
  const { t } = useTranslation("pages");
  const { school } = useAuthStore();
  const schoolId = school?.id || "";
  const slug = school?.slug || "";
  const { toast, showToast } = usePageToast();

  const [yearKey, setYearKey] = React.useState(defaultYearKey);
  const [loading, setLoading] = React.useState(false);
  const [censusCount, setCensusCount] = React.useState<number | null>(null);
  const [censusLocked, setCensusLocked] = React.useState(false);
  const [runs, setRuns] = React.useState<PromotionRun[]>([]);
  const [activeRun, setActiveRun] = React.useState<PromotionRun | null>(null);
  const [students, setStudents] = React.useState<Record<string, { name?: string; email?: string }>>(
    {}
  );
  const [classrooms, setClassrooms] = React.useState<
    { id: string; name: string; subjectId?: string | null; gradeLevelId?: string | null }[]
  >([]);
  const [gradeLevels, setGradeLevels] = React.useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [targetYearKey, setTargetYearKey] = React.useState(() => nextYearKey(defaultYearKey()));
  const [transitioning, setTransitioning] = React.useState(false);
  const [transitionResult, setTransitionResult] = React.useState<YearTransitionResult | null>(null);

  React.useEffect(() => {
    setTargetYearKey(nextYearKey(yearKey));
  }, [yearKey]);

  const refreshMeta = React.useCallback(async () => {
    if (!schoolId || !yearKey) return;
    setLoading(true);
    try {
      const [censusRes, runsRes, studentsRes, classRes, gradeRes] = await Promise.all([
        yearTransitionApi.getCensus(schoolId, yearKey).catch(() => null),
        yearTransitionApi.listRuns(schoolId, yearKey),
        api.get(`/api/schools/${schoolId}/students`),
        api.get(`/api/schools/${schoolId}/classrooms`),
        fetchAllItems<{ id: string; name: string }>((page, pageSize) =>
          api.get(`/api/schools/${schoolId}/grade-levels?page=${page}&pageSize=${pageSize}`)
        ),
      ]);
      const census = censusRes;
      setCensusCount(census?._count?.rows ?? census?.rows?.length ?? null);
      setCensusLocked(Boolean(census?.lockedAt));
      setRuns(Array.isArray(runsRes) ? runsRes : []);
      const studMap: Record<string, { name?: string; email?: string }> = {};
      for (const s of Array.isArray(studentsRes) ? studentsRes : []) {
        studMap[s.id] = { name: s.name, email: s.email };
      }
      setStudents(studMap);
      const rooms = Array.isArray(classRes) ? classRes : [];
      setClassrooms(rooms.filter((c: any) => !c.subjectId));
      setGradeLevels(gradeRes);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("yearTransition.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, yearKey, showToast, t]);

  React.useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const captureCensus = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const res = await yearTransitionApi.captureCensus(schoolId, yearKey);
      setCensusCount(res?._count?.rows ?? null);
      showToast(t("yearTransition.toast.censusCaptured"), "success");
      await refreshMeta();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("yearTransition.toast.censusFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const createRun = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const res = await yearTransitionApi.createRun(schoolId, yearKey);
      setActiveRun(res);
      showToast(t("yearTransition.toast.runCreated"), "success");
      await refreshMeta();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("yearTransition.toast.runFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const openRun = async (runId: string) => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await yearTransitionApi.getRun(schoolId, runId);
      setActiveRun(res);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("yearTransition.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  const updateDecision = (studentUserId: string, patch: Partial<PromotionDecision>) => {
    setActiveRun((prev) => {
      if (!prev?.decisions) return prev;
      return {
        ...prev,
        decisions: prev.decisions.map((d) =>
          d.studentUserId === studentUserId ? { ...d, ...patch } : d
        ),
      };
    });
  };

  const bulkPromote = () => {
    setActiveRun((prev) => {
      if (!prev?.decisions) return prev;
      return {
        ...prev,
        decisions: prev.decisions.map((d) => ({ ...d, outcome: "PROMOTED" })),
      };
    });
  };

  const saveDecisions = async () => {
    if (!schoolId || !activeRun) return;
    setSaving(true);
    try {
      const res = await yearTransitionApi.saveDecisions(
        schoolId,
        activeRun.id,
        activeRun.decisions || []
      );
      setActiveRun(res);
      showToast(t("yearTransition.toast.saved"), "success");
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("yearTransition.toast.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const commitRun = async () => {
    if (!schoolId || !activeRun) return;
    const ok = await confirmAction({
      title: t("yearTransition.confirm.commitTitle"),
      text: t("yearTransition.confirm.commitBody"),
    });
    if (!ok) return;
    setSaving(true);
    try {
      await yearTransitionApi.saveDecisions(schoolId, activeRun.id, activeRun.decisions || []);
      const res = await yearTransitionApi.commitRun(schoolId, activeRun.id);
      setActiveRun(res);
      showToast(t("yearTransition.toast.committed"), "success");
      await refreshMeta();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("yearTransition.toast.commitFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const runTransition = async () => {
    if (!schoolId || !targetYearKey.trim()) return;
    const ok = await confirmAction({
      title: t("yearTransition.wizard.confirmTitle"),
      text: t("yearTransition.wizard.confirmBody", { target: targetYearKey }),
    });
    if (!ok) return;
    setTransitioning(true);
    try {
      const res = await yearTransitionApi.transitionYear(schoolId, targetYearKey.trim());
      setTransitionResult(res as YearTransitionResult);
      showToast(t("yearTransition.wizard.done", { target: targetYearKey }), "success");
      await refreshMeta();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("yearTransition.wizard.failed"), "error");
    } finally {
      setTransitioning(false);
    }
  };

  const promotedCount =
    activeRun?.decisions?.filter((d) => d.outcome === "PROMOTED").length ?? 0;

  return (
    <PageShell width="wide">
      <PageToast toast={toast} />
      <PageHeader
        title={t("yearTransition.title")}
        subtitle={t("yearTransition.subtitle")}
        actions={
          <Link
            to={`/${slug}/promotion-statement?schoolYearKey=${encodeURIComponent(yearKey)}${
              activeRun ? `&runId=${activeRun.id}` : ""
            }`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:bg-slate-50"
          >
            <FileBarChart className="h-4 w-4" />
            {t("yearTransition.openStatement")}
          </Link>
        }
      />

      <Surface className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[12rem] flex-1">
            <TextField
              id="school-year-key"
              label={t("yearTransition.schoolYearKey")}
              value={yearKey}
              onChange={(e) => setYearKey(e.target.value)}
              placeholder="2025-2026"
            />
          </div>
          <Button type="button" onClick={() => void refreshMeta()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("yearTransition.refresh")}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("yearTransition.census")}
            </p>
            <p className="mt-2 font-mono text-2xl font-extrabold tracking-tight text-slate-900">
              {censusCount == null ? "—" : censusCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {censusLocked ? t("yearTransition.censusLocked") : t("yearTransition.censusOpen")}
            </p>
              <Button type="button" size="compact" disabled={saving || censusLocked} onClick={() => void captureCensus()}>
              {t("yearTransition.captureCensus")}
            </Button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("yearTransition.runs")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="compact" disabled={saving || censusCount == null} onClick={() => void createRun()}>
                <ArrowRightLeft className="h-4 w-4" />
                {t("yearTransition.newRun")}
              </Button>
              {runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => void openRun(r.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    activeRun?.id === r.id
                      ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {r.status} · {r._count?.decisions ?? "?"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      <Surface className="space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("yearTransition.wizard.title")}
          </h2>
          <p className="text-sm text-slate-500">{t("yearTransition.wizard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[12rem] flex-1">
            <TextField
              id="transition-target-year"
              label={t("yearTransition.wizard.targetYear")}
              value={targetYearKey}
              onChange={(e) => setTargetYearKey(e.target.value)}
              placeholder="2026-2027"
            />
          </div>
          <Button
            type="button"
            disabled={transitioning || !censusCount || targetYearKey.trim() === yearKey.trim()}
            onClick={() => void runTransition()}
          >
            {transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            {t("yearTransition.wizard.run")}
          </Button>
        </div>
        <p className="text-xs text-slate-500">{t("yearTransition.wizard.hint")}</p>

        {transitionResult && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <p className="text-sm font-bold text-indigo-900">
              {t("yearTransition.wizard.resultTitle", {
                from: transitionResult.fromYearKey,
                to: transitionResult.toYearKey,
                status: transitionResult.run.status,
              })}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {[
                { key: "promoted", label: t("yearTransition.wizard.countPromoted") },
                { key: "repeat", label: t("yearTransition.wizard.countRepeat") },
                { key: "graduated", label: t("yearTransition.wizard.countGraduated") },
                { key: "dropped_out", label: t("yearTransition.wizard.countDroppedOut") },
              ].map((c) => (
                <div key={c.key} className="rounded-xl border border-white bg-white/80 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
                  <p className="font-mono text-xl font-extrabold text-slate-900">
                    {(transitionResult.counts as Record<string, number>)[c.key] ?? 0}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 text-sm text-indigo-900 sm:grid-cols-3">
              <p>
                {t("yearTransition.wizard.homerooms")}:{" "}
                <span className="font-semibold">{transitionResult.homerooms.total}</span> (
                {transitionResult.homerooms.created} {t("yearTransition.wizard.created")})
              </p>
              <p>
                {t("yearTransition.wizard.assigned")}:{" "}
                <span className="font-semibold">{transitionResult.assignedStudents}</span>
              </p>
              <p>
                {t("yearTransition.wizard.unassigned")}:{" "}
                <span className="font-semibold">{transitionResult.unassignedStudentIds.length}</span>
              </p>
            </div>
            <p className="mt-2 text-xs text-indigo-800/90">{transitionResult.staff.note}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                to={`/${slug}/promotion-statement?schoolYearKey=${encodeURIComponent(
                  transitionResult.fromYearKey
                )}&runId=${transitionResult.run.id}`}
                className="text-sm font-semibold text-indigo-700 hover:underline"
              >
                {t("yearTransition.openStatement")}
              </Link>
            </div>
          </div>
        )}
      </Surface>

      {activeRun?.decisions && (
        <Surface className="space-y-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                {t("yearTransition.decisionsTitle")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("yearTransition.decisionsMeta", {
                  status: activeRun.status,
                  count: activeRun.decisions.length,
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeRun.status === "DRAFT" && (
                <>
                  <Button type="button" variant="secondary" size="compact" onClick={bulkPromote}>
                    {t("yearTransition.bulkPromote")}
                  </Button>
                  <Button type="button" size="compact" disabled={saving} onClick={() => void saveDecisions()}>
                    {t("yearTransition.save")}
                  </Button>
                  <Button type="button" size="compact" disabled={saving} onClick={() => void commitRun()}>
                    {t("yearTransition.commit")}
                  </Button>
                </>
              )}
            </div>
          </div>

          <DataTable className="rounded-2xl border border-slate-200">
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("yearTransition.colStudent")}</th>
                  <th className={dataTableClass.th}>{t("yearTransition.colOutcome")}</th>
                  <th className={dataTableClass.th}>{t("yearTransition.colToGrade")}</th>
                  <th className={dataTableClass.th}>{t("yearTransition.colToClass")}</th>
                  <th className={dataTableClass.thEnd}>{t("yearTransition.colGrades", { defaultValue: "Grades" })}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {activeRun.decisions.map((d) => (
                  <tr key={d.studentUserId} className="bg-white">
                    <td className={dataTableClass.td}>
                      <p className="font-semibold text-slate-900 truncate">
                        {students[d.studentUserId]?.name || d.studentUserId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{students[d.studentUserId]?.email}</p>
                    </td>
                    <td className={dataTableClass.td}>
                      <select
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        disabled={activeRun.status !== "DRAFT"}
                        value={d.outcome}
                        onChange={(e) =>
                          updateDecision(d.studentUserId, { outcome: e.target.value })
                        }
                      >
                        <option value="PROMOTED">Promoted</option>
                        <option value="REPEAT">Repeat</option>
                        <option value="GRADUATED">Graduated</option>
                        <option value="DROPPED_OUT">Dropped out</option>
                        <option value="DO_NOT_RETURN">Do not return</option>
                      </select>
                    </td>
                    <td className={dataTableClass.td}>
                      <select
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm w-full max-w-full"
                        disabled={activeRun.status !== "DRAFT" || d.outcome !== "PROMOTED"}
                        value={d.toGradeLevelId || ""}
                        onChange={(e) =>
                          updateDecision(d.studentUserId, {
                            toGradeLevelId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">—</option>
                        {gradeLevels.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={dataTableClass.td}>
                      <select
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm w-full max-w-full"
                        disabled={
                          activeRun.status !== "DRAFT" ||
                          (d.outcome !== "PROMOTED" && d.outcome !== "REPEAT")
                        }
                        value={d.toClassroomId || ""}
                        onChange={(e) =>
                          updateDecision(d.studentUserId, {
                            toClassroomId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">—</option>
                        {classrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={dataTableClass.td}>
                      <Link
                        to={`/${slug}/grades/${d.studentUserId}`}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        {t("yearTransition.viewGrades", { defaultValue: "View grades" })}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>

          {activeRun.status === "COMMITTED" && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-900">
              <p className="font-semibold">{t("yearTransition.financeHandoffTitle")}</p>
              <p className="mt-1 text-emerald-800/90">
                {t("yearTransition.financeHandoffBody", { count: promotedCount, year: yearKey })}
              </p>
              <Link
                to={`/${slug}${
                  (activeRun as { financeHandoff?: { feesPath?: string } }).financeHandoff?.feesPath ||
                  `/fees?feeCohort=RETURNING&fromPromotionRun=${activeRun.id}`
                }`}
                className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:underline"
              >
                {t("yearTransition.openFees")}
              </Link>
            </div>
          )}
        </Surface>
      )}
    </PageShell>
  );
}

export default YearTransitionPage;
