import React from "react";
import {
  Users,
  GraduationCap,
  UserCheck,
  Wallet,
  ClipboardList,
  CalendarCheck,
  ArrowRight,
  FileText,
} from "lucide-react";
import { motion } from "motion/react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  cardShell,
  childCard,
} from "../../academics-shared/FeatureModalShell";

export type ReportsBodyProps = {
  attendance: any;
  canAttendance: boolean;
  canFinance: boolean;
  canLeave: boolean;
  canOps: boolean;
  finance: any;
  leavePending: number;
  loading: boolean;
  stats: any;
  workOrderCounts: { total: number; open: number; inProgress: number };
};

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
        {value}
      </p>
      {hint && <p className="text-xs text-slate-500 font-medium">{hint}</p>}
    </div>
  );
}

export function ReportsBody({
  attendance,
  canAttendance,
  canFinance,
  canLeave,
  canOps,
  finance,
  leavePending,
  loading,
  stats,
  workOrderCounts,
}: ReportsBodyProps) {
  const { slug } = useParams();
  const base = slug ? `/${slug}` : "";

  const students = stats?.totalStudents;
  const teachers = stats?.totalTeachers;
  const attendanceRate =
    typeof attendance?.overall?.rate === "number"
      ? attendance.overall.rate
      : null;
  const todayRate =
    typeof attendance?.today?.rate === "number" ? attendance.today.rate : null;
  const feesCollected = finance?.totals?.totalRevenue;
  const netCash = finance?.totals?.netCashFlow;
  const chartData = Array.isArray(finance?.chartData) ? finance.chartData : [];
  const recentLogs = Array.isArray(stats?.recentLogs) ? stats.recentLogs : [];

  const links = [
    { to: `${base}/attendance`, label: "Attendance", desc: "Daily roll call", show: true },
    { to: `${base}/fees`, label: "Fees", desc: "Invoices & collection", show: canFinance },
    { to: `${base}/expenses`, label: "Expenses", desc: "Spend & cash flow", show: canFinance },
    { to: `${base}/leave-approval`, label: "Leave approvals", desc: "Pending time off", show: canLeave },
    { to: `${base}/work-orders`, label: "Work orders", desc: "Facility tickets", show: canOps },
    { to: `${base}/students`, label: "Students", desc: "Roster directory", show: true },
  ].filter((l) => l.show);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-28 ${childCard} animate-pulse`} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={<Users className="w-5 h-5" />}
          label="Students"
          value={
            typeof students === "number" ? students.toLocaleString() : "—"
          }
          hint="Active student accounts"
        />
        <StatTile
          icon={<GraduationCap className="w-5 h-5" />}
          label="Teachers"
          value={
            typeof teachers === "number" ? teachers.toLocaleString() : "—"
          }
          hint="Teacher role accounts"
        />
        <StatTile
          icon={<UserCheck className="w-5 h-5" />}
          label="Attendance"
          value={
            canAttendance && attendanceRate != null
              ? `${attendanceRate.toFixed(1)}%`
              : "—"
          }
          hint={
            canAttendance
              ? todayRate != null
                ? `Today ${todayRate.toFixed(1)}%`
                : "Overall present rate"
              : "Not available for your role"
          }
        />
        <StatTile
          icon={<Wallet className="w-5 h-5" />}
          label="Fees collected"
          value={
            canFinance && typeof feesCollected === "number"
              ? `$${Number(feesCollected).toLocaleString()}`
              : "—"
          }
          hint={
            canFinance && typeof netCash === "number"
              ? `Net cash $${Number(netCash).toLocaleString()}`
              : canFinance
                ? "Paid fee invoices"
                : "Finance summary not available for your role"
          }
        />
      </div>

      {(canOps || canLeave) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {canOps && (
            <div className={`${cardShell} p-6 flex items-center gap-4`}>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Open work orders
                </p>
                <p className="text-xl font-extrabold tracking-tight text-slate-900 font-mono mt-0.5">
                  {workOrderCounts.open}
                  <span className="text-sm text-slate-400 font-bold">
                    {" "}
                    / {workOrderCounts.total}
                  </span>
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {workOrderCounts.inProgress} in progress
                </p>
              </div>
            </div>
          )}
          {canLeave && (
            <div className={`${cardShell} p-6 flex items-center gap-4`}>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pending leave
                </p>
                <p className="text-xl font-extrabold tracking-tight text-slate-900 font-mono mt-0.5">
                  {leavePending}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Awaiting approval
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`lg:col-span-3 ${cardShell} p-6 sm:p-8`}>
          <div className="flex items-center justify-between mb-6 gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Cash flow
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Fees in vs expenses and payroll out
              </p>
            </div>
          </div>

          {!canFinance ? (
            <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500 text-sm font-medium">
                Finance charts are limited to admin, principal, VPA, and accountant roles.
              </p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500 text-sm font-medium">
                No paid fees or approved spend recorded yet for the chart window.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "12px",
                      border: "none",
                      color: "#F8FAFC",
                      fontSize: 12,
                    }}
                    formatter={(value: any) => [
                      `$${Number(value).toLocaleString()}`,
                      "",
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="income"
                    name="Fees in"
                    fill="#4F46E5"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Outflow"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={`lg:col-span-2 ${cardShell} overflow-hidden`}>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Jump to detail
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Open the live operational screens
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50/70 transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-900 text-sm">{link.label}</p>
                  <p className="text-xs text-slate-500 font-medium">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Recent system activity
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Latest school logs from Identity
          </p>
        </div>
        {recentLogs.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <FileText className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              No recent system logs for this school.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentLogs.map((log: any) => (
              <div
                key={log.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {log.action || log.message || "Activity"}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {log.user?.name || "System"}
                    {log.details ? ` · ${String(log.details).slice(0, 80)}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-500 font-medium shrink-0">
                  {log.createdAt
                    ? format(new Date(log.createdAt), "MMM d, yyyy · p")
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
