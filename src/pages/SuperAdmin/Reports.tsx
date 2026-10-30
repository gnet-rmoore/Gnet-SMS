import React, { useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  School,
  Download,
  GraduationCap,
  DollarSign,
  Ban,
  Users,
  Briefcase,
  ClipboardList,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  PageShell,
  PageHeader,
  Surface,
  StatTile,
  Button,
  DataTable,
  dataTableClass,
  TextField,
} from "../../components/ui";
import { useTranslation } from "react-i18next";
import { toast } from "../../lib/swal";
import { cn } from "../../lib/cn";

interface GlobalStats {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  pendingRegistrations?: number;
  activeStudents: number;
  totalUsers?: number;
  totalStaff?: number;
  revenue: number | null;
  mrr?: number | null;
  billingConnected?: boolean;
  checkoutMode?: string;
  billingNote?: string;
  paidSchoolCount?: number;
}

type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  planCode?: string | null;
  billingStatus?: string | null;
  studentCount: number;
  staffCount: number;
  parentCount?: number;
  userCount?: number;
};

type BreakdownResponse = {
  schools?: SchoolRow[];
  billingConnected?: boolean;
  revenue?: number;
  mrr?: number;
  mrrCurrency?: string;
  paidSchoolCount?: number;
  checkoutMode?: string;
  note?: string;
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "TRIAL":
      return "bg-sky-50 text-sky-700 border-sky-100";
    case "SUSPENDED":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

export const Reports = () => {
  const { t } = useTranslation(["pages", "common"]);
  const r = (key: string, opts?: Record<string, unknown>) =>
    t(`pages:superAdmin.reportsUi.${key}`, opts);
  const [stats, setStats] = React.useState<GlobalStats | null>(null);
  const [breakdown, setBreakdown] = React.useState<BreakdownResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = useState("");
  const accessToken = useAuthStore((state) => state.accessToken);

  React.useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      fetch("/api/super-admin/stats", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((res) => res.json()),
      fetch("/api/super-admin/reports/breakdown", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((res) => res.json()),
    ])
      .then(([s, b]) => {
        if (s && !s.error) setStats(s);
        if (b && !b.error) setBreakdown(b);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const schools = useMemo(
    () => (Array.isArray(breakdown?.schools) ? breakdown!.schools! : []),
    [breakdown]
  );

  const filteredSchools = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? schools.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.slug.toLowerCase().includes(q) ||
            (s.planCode || "").toLowerCase().includes(q) ||
            s.status.toLowerCase().includes(q)
        )
      : [...schools];
    return list.sort((a, b) => b.studentCount - a.studentCount);
  }, [schools, search]);

  const totals = useMemo(
    () =>
      schools.reduce(
        (acc, s) => ({
          students: acc.students + (s.studentCount || 0),
          staff: acc.staff + (s.staffCount || 0),
          parents: acc.parents + (s.parentCount || 0),
          users: acc.users + (s.userCount || 0),
        }),
        { students: 0, staff: 0, parents: 0, users: 0 }
      ),
    [schools]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of schools) {
      counts[s.status] = (counts[s.status] || 0) + 1;
    }
    return counts;
  }, [schools]);

  const planCounts = useMemo(() => {
    const noPlan = t("pages:superAdmin.reportsUi.noPlan");
    const counts: Record<string, number> = {};
    for (const s of schools) {
      const plan = s.planCode || noPlan;
      counts[plan] = (counts[plan] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [schools, t]);

  const chartData = useMemo(
    () =>
      [...schools]
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 10)
        .map((s) => ({
          name: s.name.length > 18 ? `${s.name.slice(0, 16)}…` : s.name,
          students: s.studentCount,
        })),
    [schools]
  );

  const mrr = breakdown?.mrr ?? stats?.mrr ?? stats?.revenue;
  const billingNote = breakdown?.note ?? stats?.billingNote;
  const paidSchoolCount = breakdown?.paidSchoolCount ?? stats?.paidSchoolCount;

  const exportCsv = async () => {
    const res = await fetch("/api/super-admin/schools/export.csv", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      await toast.fire({ icon: "error", title: data.error || r("exportFailed") });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-schools-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell width="wide">
      <PageHeader
        title={t("pages:superAdmin.reports")}
        subtitle={r("pageSubtitle")}
        actions={
          <>
            <Link to="/super-admin/registrations">
              <Button variant="secondary" type="button">
                <ClipboardList className="h-4 w-4" />
                {r("pendingApplications")}
              </Button>
            </Link>
            <Button type="button" onClick={() => void exportCsv()}>
              <Download className="h-5 w-5" />
              {r("exportSchoolsCsv")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={r("totalSchools")}
          value={loading ? "—" : String(stats?.totalSchools ?? schools.length)}
          icon={<School className="h-5 w-5" />}
        />
        <StatTile
          label={r("activeSchools")}
          value={loading ? "—" : String(stats?.activeSchools ?? statusCounts.ACTIVE ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatTile
          label={r("activeStudents")}
          value={loading ? "—" : (stats?.activeStudents ?? totals.students).toLocaleString()}
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatTile
          label={r("totalStaff")}
          value={loading ? "—" : (stats?.totalStaff ?? totals.staff).toLocaleString()}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatTile
          label={r("platformUsers")}
          value={loading ? "—" : (stats?.totalUsers ?? totals.users).toLocaleString()}
          icon={<Users className="h-5 w-5" />}
        />
        <StatTile
          label={r("pendingApplications")}
          value={loading ? "—" : String(stats?.pendingRegistrations ?? 0)}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatTile
          label={r("platformBilling")}
          value={
            loading
              ? "—"
              : mrr != null
                ? `$${Number(mrr).toLocaleString()}`
                : r("notConnected")
          }
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatTile
          label={r("suspendedSchools")}
          value={loading ? "—" : String(stats?.suspendedSchools ?? statusCounts.SUSPENDED ?? 0)}
          icon={<Ban className="h-5 w-5" />}
        />
      </div>

      <Surface variant="banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {r("billingSummaryTitle")}
            </p>
            <p className="text-2xl font-extrabold tracking-tight font-mono">
              {mrr != null ? `$${Number(mrr).toLocaleString()} ${r("mrrLabel")}` : r("notConnected")}
            </p>
            <p className="text-sm text-slate-400">
              {billingNote || r("billingSummaryHint")}
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {r("paidSchools")}
              </dt>
              <dd className="mt-1 font-mono text-lg font-extrabold">{paidSchoolCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {r("checkoutMode")}
              </dt>
              <dd className="mt-1 font-mono text-sm capitalize">
                {breakdown?.checkoutMode ?? stats?.checkoutMode ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {r("parentAccounts")}
              </dt>
              <dd className="mt-1 font-mono text-lg font-extrabold">{totals.parents.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Surface variant="nested" className="space-y-4 lg:col-span-1">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{r("schoolsByStatus")}</h3>
          {loading ? (
            <p className="text-sm text-slate-500">{t("common:loading")}</p>
          ) : Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-slate-500">{r("noSchools")}</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <li
                    key={status}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <span
                      className={cn(
                        "inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold",
                        statusBadgeClass(status)
                      )}
                    >
                      {status}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900">{count}</span>
                  </li>
                ))}
            </ul>
          )}
        </Surface>

        <Surface variant="nested" className="space-y-4 lg:col-span-1">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{r("schoolsByPlan")}</h3>
          {loading ? (
            <p className="text-sm text-slate-500">{t("common:loading")}</p>
          ) : planCounts.length === 0 ? (
            <p className="text-sm text-slate-500">{r("noSchools")}</p>
          ) : (
            <ul className="space-y-2">
              {planCounts.map(([plan, count]) => (
                <li
                  key={plan}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span className="font-mono text-xs font-bold text-slate-700">{plan}</span>
                  <span className="font-mono text-sm font-bold text-slate-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface variant="nested" className="space-y-4 lg:col-span-1">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{r("platformTotals")}</h3>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: r("activeStudents"), value: totals.students },
              { label: r("totalStaff"), value: totals.staff },
              { label: r("parentAccounts"), value: totals.parents },
              { label: r("platformUsers"), value: totals.users },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{row.label}</dt>
                <dd className="mt-1 font-mono text-xl font-extrabold text-slate-900">
                  {loading ? "—" : row.value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </Surface>
      </div>

      <Surface variant="primary" className="space-y-6 p-6">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {r("topSchoolsChartTitle")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{r("topSchoolsChartHint")}</p>
        </div>
        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        ) : chartData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
            {r("noEnrollmentData")}
          </div>
        ) : (
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="students" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Surface>

      <Surface variant="primary" className="overflow-hidden p-0">
        <div className="space-y-4 border-b border-slate-100 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-extrabold tracking-tight text-slate-900">{r("schoolTableTitle")}</h3>
              <p className="mt-1 text-sm text-slate-500">{r("schoolTableHint")}</p>
            </div>
            <div className="w-full sm:max-w-xs">
              <TextField
                label={t("common:search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={r("searchPlaceholder")}
                density="compact"
              />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500">
            {r("showingCount", { shown: filteredSchools.length, total: schools.length })}
          </p>
        </div>
        <DataTable hint={r("tableScrollHint")}>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[28%]`}>{r("colSchool")}</th>
                <th className={`${dataTableClass.th} w-[12%]`}>{r("colStatus")}</th>
                <th className={`${dataTableClass.th} w-[12%]`}>{r("colPlan")}</th>
                <th className={`${dataTableClass.th} w-[12%]`}>{r("colBilling")}</th>
                <th className={`${dataTableClass.th} w-[9%]`}>{r("colStudents")}</th>
                <th className={`${dataTableClass.th} w-[9%]`}>{r("colStaff")}</th>
                <th className={`${dataTableClass.th} w-[9%]`}>{r("colParents")}</th>
                <th className={`${dataTableClass.thEnd} w-[9%]`}>{r("colUsers")}</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loading ? (
                <tr>
                  <td colSpan={8} className={`${dataTableClass.tdEmpty} italic`}>
                    {t("common:loading")}
                  </td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`${dataTableClass.tdEmpty} italic`}>
                    {search ? t("common:noResults") : r("noSchools")}
                  </td>
                </tr>
              ) : (
                filteredSchools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className={`${dataTableClass.td} align-middle`}>
                      <Link
                        to={`/super-admin/schools/${s.id}`}
                        className="group flex min-w-0 items-center gap-2 hover:text-indigo-600"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 group-hover:text-indigo-600">
                            {s.name}
                          </p>
                          <p className="truncate font-mono text-xs text-slate-400">/{s.slug}</p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-500" />
                      </Link>
                    </td>
                    <td className={`${dataTableClass.td} align-middle`}>
                      <span
                        className={cn(
                          "inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold",
                          statusBadgeClass(s.status)
                        )}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className={`${dataTableClass.td} align-middle font-mono text-xs`}>
                      {s.planCode || "—"}
                    </td>
                    <td className={`${dataTableClass.td} align-middle font-mono text-xs`}>
                      {s.billingStatus || "—"}
                    </td>
                    <td className={`${dataTableClass.td} align-middle font-mono`}>{s.studentCount}</td>
                    <td className={`${dataTableClass.td} align-middle font-mono`}>{s.staffCount}</td>
                    <td className={`${dataTableClass.td} align-middle font-mono`}>
                      {s.parentCount ?? 0}
                    </td>
                    <td className={`${dataTableClass.td} align-middle font-mono`}>{s.userCount ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filteredSchools.length > 0 ? (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-bold">
                  <td className={`${dataTableClass.td} text-slate-700`} colSpan={4}>
                    {r("tableTotals")}
                  </td>
                  <td className={`${dataTableClass.td} font-mono`}>{totals.students.toLocaleString()}</td>
                  <td className={`${dataTableClass.td} font-mono`}>{totals.staff.toLocaleString()}</td>
                  <td className={`${dataTableClass.td} font-mono`}>{totals.parents.toLocaleString()}</td>
                  <td className={`${dataTableClass.td} font-mono`}>{totals.users.toLocaleString()}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </DataTable>
      </Surface>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-xs text-slate-500"
      >
        {r("dataHonestyNote")}
      </motion.p>
    </PageShell>
  );
};
