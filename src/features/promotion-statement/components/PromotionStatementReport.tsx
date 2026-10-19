import React from "react";
import { Loader2, Printer, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, SelectField, StatTile, TextField } from "../../../components/ui";
import { yearTransitionApi, type PromotionStatement, type StatementCell } from "../../year-transition/api";
import { usePageToast } from "../../academics-shared/PageToast";
import {
  exportStatementCsv,
  exportStatementDocx,
  exportStatementPdf,
  exportStatementXlsx,
} from "../lib/exportStatement";

export type ReportPeriod = { id: string; label: string; shortCode: string };

export type PromotionStatementReportProps = {
  schoolId: string;
  schoolName?: string;
  initialYearKey?: string;
  initialRunId?: string;
  periods?: ReportPeriod[];
  onNavigate?: (params: { schoolYearKey: string; scope: "YEAR" | "TERM"; periodId?: string }) => void;
};

function defaultYearKey() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  if (m >= 6) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

const COLUMNS: Array<{ key: Extract<keyof StatementCell, string>; labelKey: string; tone?: string }> = [
  { key: "opening", labelKey: "colOpening" },
  { key: "male", labelKey: "colMale" },
  { key: "female", labelKey: "colFemale" },
  { key: "other", labelKey: "colOther" },
  { key: "unknown", labelKey: "colUnknown" },
  { key: "promoted", labelKey: "colPromoted", tone: "text-emerald-700" },
  { key: "repeat", labelKey: "colRepeat", tone: "text-rose-700" },
  { key: "graduated", labelKey: "colGraduated" },
  { key: "droppedOut", labelKey: "colDroppedOut", tone: "text-rose-700" },
  { key: "doNotReturn", labelKey: "colDoNotReturn" },
  { key: "suspended", labelKey: "colSuspended", tone: "text-amber-700" },
  { key: "passed", labelKey: "colPassed", tone: "text-emerald-700" },
  { key: "failed", labelKey: "colFailed", tone: "text-rose-700" },
];

function CellNums({ cell }: { cell: StatementCell }) {
  return (
    <>
      {COLUMNS.map((c) => (
        <td
          key={c.key}
          className={`whitespace-nowrap px-3 py-2 text-center font-mono text-sm ${c.tone || "text-slate-700"}`}
        >
          {cell[c.key]}
        </td>
      ))}
    </>
  );
}

export function PromotionStatementReport({
  schoolId,
  schoolName,
  initialYearKey,
  initialRunId,
  periods = [],
  onNavigate,
}: PromotionStatementReportProps) {
  const { t } = useTranslation("pages");
  const { showToast } = usePageToast();

  const [yearKey, setYearKey] = React.useState(initialYearKey || defaultYearKey());
  const [runId, setRunId] = React.useState(initialRunId || "");
  const [scope, setScope] = React.useState<"YEAR" | "TERM">("YEAR");
  const [periodId, setPeriodId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [statement, setStatement] = React.useState<PromotionStatement | null>(null);

  const load = React.useCallback(async () => {
    if (!schoolId || !yearKey) return;
    setLoading(true);
    try {
      const res = await yearTransitionApi.getStatement(schoolId, yearKey, {
        runId: runId || undefined,
        scope,
        periodId: scope === "TERM" ? periodId || undefined : undefined,
      });
      setStatement(res);
      onNavigate?.({ schoolYearKey: yearKey, scope, periodId: periodId || undefined });
    } catch (err: any) {
      setStatement(null);
      showToast(err?.response?.data?.error || t("promotionStatement.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, yearKey, runId, scope, periodId, onNavigate, showToast, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runExport = async (kind: string, fn: () => Promise<void> | void) => {
    if (!statement) return;
    setBusy(kind);
    try {
      await fn();
    } catch (err: any) {
      showToast(err?.message || t("promotionStatement.toast.exportFailed"), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem] flex-1">
            <TextField
              id="ps-year"
              label={t("yearTransition.schoolYearKey")}
              value={yearKey}
              onChange={(e) => setYearKey(e.target.value)}
            />
          </div>
          <div className="min-w-[9rem]">
            <SelectField
              id="ps-scope"
              label={t("promotionStatement.scopeLabel")}
              value={scope}
              onChange={(e) => setScope(e.target.value as "YEAR" | "TERM")}
            >
              <option value="YEAR">{t("promotionStatement.scopeYear")}</option>
              <option value="TERM">{t("promotionStatement.scopeTerm")}</option>
            </SelectField>
          </div>
          {scope === "TERM" && (
            <div className="min-w-[10rem]">
              <SelectField
                id="ps-period"
                label={t("promotionStatement.periodLabel")}
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                <option value="">{t("promotionStatement.periodAll")}</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.shortCode})
                  </option>
                ))}
              </SelectField>
            </div>
          )}
          <div className="min-w-[9rem] flex-1">
            <TextField
              id="ps-run"
              label={t("promotionStatement.runIdOptional")}
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              placeholder={t("promotionStatement.latestRun")}
            />
          </div>
          <Button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("yearTransition.refresh")}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" size="compact" disabled={!statement || busy !== null} onClick={() => void runExport("xlsx", () => statement && exportStatementXlsx(statement))}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button type="button" variant="secondary" size="compact" disabled={!statement || busy !== null} onClick={() => void runExport("docx", () => statement && exportStatementDocx(statement))}>
            <FileType2 className="h-4 w-4" />
            Word
          </Button>
          <Button type="button" variant="secondary" size="compact" disabled={!statement || busy !== null} onClick={() => void runExport("pdf", () => statement && exportStatementPdf(statement))}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button type="button" variant="ghost" size="compact" disabled={!statement} onClick={() => statement && exportStatementCsv(statement)}>
            CSV
          </Button>
          <Button type="button" variant="ghost" size="compact" disabled={!statement} onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {t("promotionStatement.print")}
          </Button>
        </div>
      </div>

      {statement && (
        <div
          id="promotion-statement-doc"
          className="relative rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:p-8 print:rounded-none print:border-0 print:shadow-none"
        >
          {statement.draft && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 print:opacity-20">
              <span className="rotate-[-24deg] text-6xl font-black tracking-widest text-slate-900">DRAFT</span>
            </div>
          )}

          <header className="relative border-b border-slate-200 pb-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {statement.schoolInfo?.name || schoolName || t("promotionStatement.schoolFallback")}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              {t("promotionStatement.docTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("promotionStatement.academicYear")}:{" "}
              <span className="font-mono font-semibold text-slate-800">{statement.schoolYearKey}</span>
              {" · "}
              <span className="font-semibold text-slate-700">
                {statement.scope === "TERM" && statement.period
                  ? `${statement.period.label} (${statement.period.shortCode})`
                  : t("promotionStatement.scopeYear")}
              </span>
              {statement.run ? ` · ${statement.run.status}` : ""}
            </p>
          </header>

          <section className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={t("promotionStatement.tileOpening")} value={statement.totals.totalStudentsBeginning} hint={`${statement.totals.maleStudents} M · ${statement.totals.femaleStudents} F`} />
            <StatTile label={t("promotionStatement.tilePromoted")} value={statement.totals.promoted} />
            <StatTile label={t("promotionStatement.tileRepeat")} value={statement.totals.repeat} />
            <StatTile label={t("promotionStatement.tileGraduated")} value={statement.totals.graduated} />
            <StatTile label={t("promotionStatement.tilePassed")} value={statement.totals.passed} hint={`${t("promotionStatement.passMark")}: ${statement.academic.passThreshold}%`} />
            <StatTile label={t("promotionStatement.tileFailed")} value={statement.totals.failed} />
            <StatTile label={t("promotionStatement.tileDroppedOut")} value={statement.totals.droppedOut} />
            <StatTile label={t("promotionStatement.tileSuspended")} value={statement.totals.suspended} hint={`${statement.discipline.totalSuspensionDays} ${t("promotionStatement.days")}`} />
            <StatTile label={t("promotionStatement.tileAverage")} value={`${statement.academic.averageScore}%`} />
            <StatTile label={t("promotionStatement.tileAttendance")} value={`${statement.attendance.averageRate}%`} hint={`${statement.attendance.records} ${t("promotionStatement.records")}`} />
          </section>

          <section className="relative mt-8">
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
              {t("promotionStatement.byClass")}
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2">{t("promotionStatement.colGradeClass")}</th>
                    {COLUMNS.map((c) => (
                      <th key={c.key} className="whitespace-nowrap px-3 py-2 text-center">
                        {t(`promotionStatement.${c.labelKey}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-indigo-50/60 font-semibold">
                    <td className="sticky left-0 z-10 bg-indigo-50/60 px-3 py-2 text-sm font-bold text-slate-900">
                      {t("promotionStatement.wholeSchool")}
                    </td>
                    <CellNums cell={statement.school} />
                  </tr>
                  {statement.divisions.map((div) => (
                    <React.Fragment key={div.divisionId || "none"}>
                      <tr className="bg-slate-100/70">
                        <td className="sticky left-0 z-10 bg-slate-100/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600" colSpan={COLUMNS.length + 1}>
                          {div.divisionName}
                        </td>
                      </tr>
                      {div.classes.map((row) => (
                        <tr key={row.key}>
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm">
                            <span className="font-semibold text-slate-900">{row.gradeName}</span>
                            <span className="text-slate-400"> · </span>
                            <span className="text-slate-600">{row.classroomName}</span>
                          </td>
                          <CellNums cell={row} />
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-semibold">
                        <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-sm">
                          {t("promotionStatement.divisionTotal")}
                        </td>
                        <CellNums cell={div.totals} />
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {(statement.bestAcademicPerformers.length > 0 || statement.bestAttendance.length > 0) && (
            <section className="relative mt-8 grid gap-8 lg:grid-cols-2">
              {statement.bestAcademicPerformers.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
                    {t("promotionStatement.bestAcademic")}
                  </h3>
                  <table className="mt-3 w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">{t("promotionStatement.colStudent")}</th>
                        <th className="px-3 py-2">{t("promotionStatement.colGrade")}</th>
                        <th className="px-3 py-2 text-center">{t("promotionStatement.colAverage")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statement.bestAcademicPerformers.map((p) => (
                        <tr key={p.studentUserId}>
                          <td className="px-3 py-2 font-mono text-slate-500">{p.position}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{p.name}</td>
                          <td className="px-3 py-2 text-slate-600">{p.gradeName}</td>
                          <td className="px-3 py-2 text-center font-mono text-emerald-700">{p.overallAverage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {statement.bestAttendance.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
                    {t("promotionStatement.bestAttendance")}
                  </h3>
                  <table className="mt-3 w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2">{t("promotionStatement.colStudent")}</th>
                        <th className="px-3 py-2">{t("promotionStatement.colGrade")}</th>
                        <th className="px-3 py-2 text-center">{t("promotionStatement.colAttendance")}</th>
                        <th className="px-3 py-2 text-center">{t("promotionStatement.colPresent")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statement.bestAttendance.map((a) => (
                        <tr key={a.studentUserId}>
                          <td className="px-3 py-2 font-semibold text-slate-800">{a.name}</td>
                          <td className="px-3 py-2 text-slate-600">{a.gradeName}</td>
                          <td className="px-3 py-2 text-center font-mono text-emerald-700">{a.attendanceRate}%</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-600">
                            {a.present}/{a.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <footer className="relative mt-10 grid gap-8 border-t border-slate-200 pt-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {t("promotionStatement.sigRegistrar")}
              </p>
              <div className="mt-10 border-b border-slate-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {t("promotionStatement.sigPrincipal")}
              </p>
              <div className="mt-10 border-b border-slate-400" />
            </div>
            <p className="text-xs text-slate-500 sm:col-span-2">
              {t("promotionStatement.footnote", {
                captured: statement.census.capturedAt
                  ? new Date(statement.census.capturedAt).toLocaleDateString()
                  : "—",
                rows: statement.census.rowCount,
              })}
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}

export default PromotionStatementReport;
