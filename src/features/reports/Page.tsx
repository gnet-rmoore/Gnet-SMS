import React from "react";
import { useReportsQuery } from "./hooks/useReportsQuery";
import { ReportsChrome } from "./components/ReportsChrome";
import { ReportsBody } from "./components/ReportsBody";
import { GuideCompletionWidget } from "./components/GuideCompletionWidget";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useTranslation } from "react-i18next";

export const Reports = () => {
  const { t } = useTranslation("pages");
  const { toast, showToast } = usePageToast();
  const { data, loading, invalidate } = useReportsQuery();

  const handleExport = () => {
    if (!data) {
      showToast(t("reports.toast.nothingToExport"), "info");
      return;
    }

    const rows: string[][] = [
      ["Metric", "Value"],
      ["Students", String(data.stats?.totalStudents ?? "")],
      ["Teachers", String(data.stats?.totalTeachers ?? "")],
    ];

    if (data.canAttendance && data.attendance) {
      rows.push([
        "Attendance overall %",
        Number(data.attendance.overall?.rate ?? 0).toFixed(2),
      ]);
      rows.push([
        "Attendance today %",
        Number(data.attendance.today?.rate ?? 0).toFixed(2),
      ]);
      rows.push([
        "Present (overall)",
        String(data.attendance.overall?.present ?? ""),
      ]);
      rows.push([
        "Absent (overall)",
        String(data.attendance.overall?.absent ?? ""),
      ]);
    }

    if (data.canFinance && data.finance?.totals) {
      const t = data.finance.totals;
      rows.push(["Fees collected", String(t.totalRevenue ?? "")]);
      rows.push(["Fees pending", String(t.pendingRevenue ?? "")]);
      rows.push(["Approved expenses", String(t.totalExpenses ?? "")]);
      rows.push(["Paid payroll", String(t.totalPayroll ?? "")]);
      rows.push(["Net cash flow", String(t.netCashFlow ?? "")]);
    }

    if (data.canOps) {
      rows.push(["Work orders total", String(data.workOrderCounts.total)]);
      rows.push(["Work orders open", String(data.workOrderCounts.open)]);
      rows.push([
        "Work orders in progress",
        String(data.workOrderCounts.inProgress),
      ]);
    }

    if (data.canLeave) {
      rows.push(["Leave pending", String(data.leavePending)]);
    }

    const csv =
      "data:text/csv;charset=utf-8," +
      rows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `school_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t("reports.toast.csvDownloaded"), "success");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <ReportsChrome
        canExport={!loading && Boolean(data)}
        loading={loading}
        onExport={handleExport}
        onRefresh={() => invalidate()}
        subtitle={t("reports.subtitle")}
        title={t("reports.title")}
      />

      <GuideCompletionWidget />

      <ReportsBody
        attendance={data?.attendance}
        canAttendance={Boolean(data?.canAttendance)}
        canFinance={Boolean(data?.canFinance)}
        canLeave={Boolean(data?.canLeave)}
        canOps={Boolean(data?.canOps)}
        finance={data?.finance}
        leavePending={data?.leavePending ?? 0}
        loading={loading}
        stats={data?.stats}
        workOrderCounts={
          data?.workOrderCounts ?? { total: 0, open: 0, inProgress: 0 }
        }
      />
    </div>
  );
};
