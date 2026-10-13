import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { PageShell, PageHeader, Surface, Button, TextField, DataTable, dataTableClass } from "../../components/ui";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { yearTransitionApi, type PromotionStatement, type StatementCell } from "../year-transition/api";

function defaultYearKey() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  if (m >= 6) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

function CellNums({ cell }: { cell: StatementCell }) {
  return (
    <>
      <td className={`${dataTableClass.td} text-center font-mono`}>{cell.opening}</td>
      <td className={`${dataTableClass.td} text-center font-mono`}>{cell.male}</td>
      <td className={`${dataTableClass.td} text-center font-mono`}>{cell.female}</td>
      <td className={`${dataTableClass.td} text-center font-mono`}>{cell.other + cell.unknown}</td>
      <td className={`${dataTableClass.td} text-center font-mono text-emerald-700`}>{cell.promoted}</td>
      <td className={`${dataTableClass.td} text-center font-mono text-rose-700`}>{cell.repeat}</td>
      <td className={`${dataTableClass.td} text-center font-mono`}>{cell.graduated}</td>
      <td className={`${dataTableClass.td} text-center font-mono`}>{cell.doNotReturn}</td>
    </>
  );
}

export function PromotionStatementPage() {
  const { t } = useTranslation("pages");
  const { school } = useAuthStore();
  const schoolId = school?.id || "";
  const slug = school?.slug || "";
  const [params, setParams] = useSearchParams();
  const { toast, showToast } = usePageToast();

  const [yearKey, setYearKey] = React.useState(params.get("schoolYearKey") || defaultYearKey());
  const [runId, setRunId] = React.useState(params.get("runId") || "");
  const [loading, setLoading] = React.useState(false);
  const [statement, setStatement] = React.useState<PromotionStatement | null>(null);

  const load = React.useCallback(async () => {
    if (!schoolId || !yearKey) return;
    setLoading(true);
    try {
      const res = await yearTransitionApi.getStatement(schoolId, yearKey, runId || undefined);
      setStatement(res.data);
      const next = new URLSearchParams();
      next.set("schoolYearKey", yearKey);
      if (runId) next.set("runId", runId);
      setParams(next, { replace: true });
    } catch (err: any) {
      setStatement(null);
      showToast(err?.response?.data?.error || t("promotionStatement.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, yearKey, runId, setParams, showToast, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    if (!statement) return;
    const header = [
      "Division",
      "Grade",
      "Class",
      "Opening",
      "Male",
      "Female",
      "OtherUnknown",
      "Promoted",
      "Repeat",
      "Graduated",
      "DoNotReturn",
    ];
    const lines = [header.join(",")];
    for (const div of statement.divisions) {
      for (const row of div.classes) {
        lines.push(
          [
            JSON.stringify(div.divisionName),
            JSON.stringify(row.gradeName),
            JSON.stringify(row.classroomName),
            row.opening,
            row.male,
            row.female,
            row.other + row.unknown,
            row.promoted,
            row.repeat,
            row.graduated,
            row.doNotReturn,
          ].join(",")
        );
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promotion-statement-${statement.schoolYearKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell width="wide">
      <PageToast toast={toast} />
      <PageHeader
        title={t("promotionStatement.title")}
        subtitle={t("promotionStatement.subtitle")}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link
              to={`/${slug}/year-transition`}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {t("promotionStatement.backToTransition")}
            </Link>
            <Button type="button" variant="secondary" size="compact" disabled={!statement} onClick={exportCsv}>
              CSV
            </Button>
            <Button type="button" size="compact" disabled={!statement} onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t("promotionStatement.print")}
            </Button>
          </div>
        }
      />

      <Surface className="space-y-4 p-6 print:hidden sm:p-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[12rem] flex-1">
            <TextField
              id="ps-year"
              label={t("yearTransition.schoolYearKey")}
              value={yearKey}
              onChange={(e) => setYearKey(e.target.value)}
            />
          </div>
          <div className="min-w-[12rem] flex-1">
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
      </Surface>

      {statement && (
        <div className="relative rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:p-8 print:shadow-none print:border-black">
          {statement.draft && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 print:opacity-20">
              <span className="rotate-[-24deg] text-6xl font-black tracking-widest text-slate-900">
                DRAFT
              </span>
            </div>
          )}
          <header className="relative border-b border-slate-200 pb-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {school?.name || "School"}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              {t("promotionStatement.docTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("promotionStatement.academicYear")}:{" "}
              <span className="font-mono font-semibold text-slate-800">{statement.schoolYearKey}</span>
              {statement.run ? ` · ${statement.run.status}` : ""}
            </p>
          </header>

          <section className="relative mt-6">
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
              {t("promotionStatement.schoolSummary")}
            </h3>
            <DataTable className="mt-3">
              <table className={dataTableClass.table}>
                <thead className={dataTableClass.thead}>
                  <tr>
                    <th className={dataTableClass.th}>{t("promotionStatement.colScope")}</th>
                    <th className={dataTableClass.thEnd}>Open</th>
                    <th className={dataTableClass.thEnd}>M</th>
                    <th className={dataTableClass.thEnd}>F</th>
                    <th className={dataTableClass.thEnd}>O/U</th>
                    <th className={dataTableClass.thEnd}>Pass</th>
                    <th className={dataTableClass.thEnd}>Fail</th>
                    <th className={dataTableClass.thEnd}>Grad</th>
                    <th className={dataTableClass.thEnd}>Exit</th>
                  </tr>
                </thead>
                <tbody className={dataTableClass.tbody}>
                  <tr className="bg-slate-50 font-semibold">
                    <td className={dataTableClass.td}>{t("promotionStatement.wholeSchool")}</td>
                    <CellNums cell={statement.school} />
                  </tr>
                </tbody>
              </table>
            </DataTable>
          </section>

          {statement.divisions.map((div) => (
            <section key={div.divisionId || "none"} className="relative mt-8">
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{div.divisionName}</h3>
              <DataTable className="mt-3">
                <table className={dataTableClass.table}>
                  <thead className={dataTableClass.thead}>
                    <tr>
                      <th className={dataTableClass.th}>Grade / Class</th>
                      <th className={dataTableClass.thEnd}>Open</th>
                      <th className={dataTableClass.thEnd}>M</th>
                      <th className={dataTableClass.thEnd}>F</th>
                      <th className={dataTableClass.thEnd}>O/U</th>
                      <th className={dataTableClass.thEnd}>Pass</th>
                      <th className={dataTableClass.thEnd}>Fail</th>
                      <th className={dataTableClass.thEnd}>Grad</th>
                      <th className={dataTableClass.thEnd}>Exit</th>
                    </tr>
                  </thead>
                  <tbody className={dataTableClass.tbody}>
                    {div.classes.map((row) => (
                      <tr key={row.key}>
                        <td className={dataTableClass.td}>
                          <span className="font-semibold text-slate-900">{row.gradeName}</span>
                          <span className="text-slate-400"> · </span>
                          <span className="text-slate-600 truncate">{row.classroomName}</span>
                        </td>
                        <CellNums cell={row} />
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className={dataTableClass.td}>{t("promotionStatement.divisionTotal")}</td>
                      <CellNums cell={div.totals} />
                    </tr>
                  </tbody>
                </table>
              </DataTable>
            </section>
          ))}

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
    </PageShell>
  );
}

export default PromotionStatementPage;
