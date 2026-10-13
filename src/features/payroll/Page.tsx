import React, { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { usePayrollQuery } from "./hooks/usePayrollQuery";
import { payrollApi } from "./api";
import { CreatePayrollModal } from "./components/CreatePayrollModal";
import { EditPayrollModal } from "./components/EditPayrollModal";
import { RecordsTab } from "./components/RecordsTab";
import { PayslipDrawer } from "./components/PayslipDrawer";
import { PayrollChrome } from "./components/PayrollChrome";
import type { PayrollFormData, PayrollRecord } from "./types";
import { confirmAction } from "../../lib/swal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import {
  buildNotesPayload,
  computeNet,
  emptyPayrollForm,
  getMonthName,
  parsePayrollNotes,
} from "./utils";
import { useListFilters, type FilterFieldDef } from "../list-filters";

export const Payroll = () => {
  const { t } = useTranslation("pages");
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "status",
        label: t("payroll.records.allStatuses"),
        type: "enum",
        primary: true,
        allLabel: t("payroll.records.allStatuses"),
        options: [
          { value: "PAID", label: t("common:paid") },
          { value: "PENDING", label: t("common:pending") },
        ],
      },
    ],
    [t]
  );
  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const {
    payrolls,
    staff,
    total,
    page,
    pageSize,
    loading,
    refreshing,
    invalidate,
    refetchAll,
  } = usePayrollQuery(selectedMonth, selectedYear, {
    status: filters.values.status || undefined,
    q: filters.committedQ || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const refetchPayroll = async () => {
    await invalidate();
    await refetchAll();
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<PayrollFormData>(() =>
    emptyPayrollForm()
  );

  const isFinanceAdmin = ["SCHOOL_ADMIN", "ACCOUNTANT", "SUPER_ADMIN"].includes(
    user?.role || ""
  );

  const resetForm = (month = selectedMonth, year = selectedYear) => {
    setFormData(emptyPayrollForm(month, year));
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) {
      showToast(t("payroll.toast.sessionMissing"), "error");
      return;
    }
    if (!formData.userId) {
      showToast(t("payroll.toast.selectStaff"), "error");
      return;
    }
    if (formData.basicSalary === "" || formData.basicSalary == null) {
      showToast(t("payroll.toast.enterBasicSalary"), "error");
      return;
    }
    setSubmitting(true);

    const basicSalary = Number(formData.basicSalary);
    const allowances = Number(formData.allowances || 0);
    const deductions = Number(formData.deductions || 0);
    if (Number.isNaN(basicSalary) || basicSalary < 0) {
      showToast(t("payroll.toast.invalidBasicSalary"), "error");
      setSubmitting(false);
      return;
    }
    const netSalary = computeNet(basicSalary, allowances, deductions);

    try {
      await payrollApi.createPayroll(school.id, {
        userId: formData.userId,
        month: Number(formData.month),
        year: Number(formData.year),
        basicSalary,
        allowances,
        deductions,
        netSalary,
        status: formData.status,
        notes: buildNotesPayload(formData),
      });
      const createdMonth = Number(formData.month);
      const createdYear = Number(formData.year);
      setIsCreateModalOpen(false);
      resetForm();
      if (createdMonth !== selectedMonth || createdYear !== selectedYear) {
        setSelectedMonth(createdMonth);
        setSelectedYear(createdYear);
      } else {
        await refetchPayroll();
      }
      showToast(t("payroll.toast.created"), "success");
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/unique|already exists|P2002/i.test(msg)) {
        showToast(t("payroll.toast.duplicateRecord"), "error");
      } else {
        showToast(msg || t("payroll.toast.createFailed"), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmitting(true);

    const basicSalary = Number(formData.basicSalary);
    const allowances = Number(formData.allowances || 0);
    const deductions = Number(formData.deductions || 0);
    const netSalary = computeNet(basicSalary, allowances, deductions);

    try {
      await payrollApi.updatePayroll(selectedRecord.id, {
        basicSalary,
        allowances,
        deductions,
        netSalary,
        status: formData.status,
        notes: buildNotesPayload(formData),
      });
      setIsEditModalOpen(false);
      setSelectedRecord(null);
      refetchPayroll();
      showToast(t("payroll.toast.updated"), "success");
    } catch (err: any) {
      showToast(err?.message || t("payroll.toast.updateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayroll = async (id: string) => {
    const ok = await confirmAction({
      title: t("payroll.confirm.removeTitle"),
      text: t("payroll.confirm.removeText"),
      confirmText: t("payroll.confirm.removeConfirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await payrollApi.deletePayroll(id);
      refetchPayroll();
      showToast(t("payroll.toast.removed"), "info");
    } catch (err: any) {
      showToast(err?.message || t("payroll.toast.deleteFailed"), "error");
    }
  };

  const handleMarkPaid = async (record: PayrollRecord) => {
    const ok = await confirmAction({
      title: t("payroll.confirm.markPaidTitle"),
      text: t("payroll.confirm.markPaidText", {
        name: record.user?.name || t("payroll.records.staffMember"),
      }),
      confirmText: t("payroll.confirm.markPaidConfirm"),
    });
    if (!ok) return;
    try {
      await payrollApi.updatePayroll(record.id, { status: "PAID" });
      refetchPayroll();
      showToast(t("payroll.toast.markedPaid"), "success");
    } catch (err: any) {
      showToast(err?.message || t("payroll.toast.statusUpdateFailed"), "error");
    }
  };

  const handleMarkUnpaid = async (record: PayrollRecord) => {
    const ok = await confirmAction({
      title: t("payroll.confirm.markUnpaidTitle"),
      text: t("payroll.confirm.markUnpaidText", {
        name: record.user?.name || t("payroll.records.staffMember"),
      }),
      confirmText: t("payroll.confirm.markUnpaidConfirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await payrollApi.updatePayroll(record.id, { status: "PENDING" });
      refetchPayroll();
      showToast(t("payroll.toast.markedUnpaid"), "success");
    } catch (err: any) {
      showToast(err?.message || t("payroll.toast.statusUpdateFailed"), "error");
    }
  };

  const openEdit = (record: PayrollRecord) => {
    setSelectedRecord(record);
    const parsed = parsePayrollNotes(record.notes);
    setFormData({
      userId: record.userId,
      month: record.month,
      year: record.year,
      basicSalary: record.basicSalary,
      allowances: record.allowances,
      deductions: record.deductions,
      status: record.status || "PENDING",
      currency: parsed.currency,
      taxId: parsed.taxId,
      iban: parsed.iban,
      swift: parsed.swift,
      employmentType: parsed.employmentType,
      customNotes: parsed.customNotes,
    });
    setIsEditModalOpen(true);
  };

  const openDetail = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const filteredPayrolls = payrolls;

  const handleExportCsv = () => {
    if (filteredPayrolls.length === 0) {
      showToast(t("payroll.toast.nothingToExport"), "info");
      return;
    }
    const headers = [
      t("payroll.csv.employeeName"),
      t("payroll.csv.role"),
      t("payroll.csv.basicPay"),
      t("payroll.csv.allowances"),
      t("payroll.csv.deductions"),
      t("payroll.csv.netPay"),
      t("payroll.csv.status"),
      t("payroll.csv.currency"),
      t("payroll.csv.taxId"),
      t("payroll.csv.iban"),
      t("payroll.csv.swift"),
      t("payroll.csv.month"),
      t("payroll.csv.year"),
    ];
    const rows = filteredPayrolls.map((p) => {
      const d = parsePayrollNotes(p.notes);
      return [
        p.user?.name || t("payroll.csv.na"),
        p.user?.role || t("payroll.csv.na"),
        String(p.basicSalary),
        String(p.allowances),
        String(p.deductions),
        String(p.netSalary),
        p.status || "",
        d.currency,
        d.taxId || "",
        d.iban || "",
        d.swift || "",
        getMonthName(p.month),
        String(p.year),
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `payroll_${getMonthName(selectedMonth)}_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t("payroll.toast.csvDownloaded"), "success");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      {!school?.id && (
        <div className="rounded-[32px] border border-rose-100 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700">
          {t("payroll.page.sessionMissingBanner")}
        </div>
      )}

      <PayrollChrome
        isFinanceAdmin={isFinanceAdmin}
        loading={loading || refreshing}
        onAdd={() => {
          resetForm();
          setIsCreateModalOpen(true);
        }}
        onExportCsv={handleExportCsv}
        onRefresh={async () => {
          try {
            await refetchPayroll();
            showToast(t("payroll.toast.refreshed"), "info");
          } catch (err: any) {
            showToast(err?.message || t("payroll.toast.refreshFailed"), "error");
          }
        }}
        recordCount={total}
        title={t("payroll.title")}
        subtitle={t("payroll.subtitle")}
      />

      <RecordsTab
        filteredPayrolls={filteredPayrolls}
        handleDeletePayroll={handleDeletePayroll}
        handleMarkPaid={handleMarkPaid}
        handleMarkUnpaid={handleMarkUnpaid}
        isFinanceAdmin={isFinanceAdmin}
        loading={loading}
        openDetail={openDetail}
        openEdit={openEdit}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
        staffList={staff}
        filterFields={filterFields}
        filters={filters}
        savedViewsScope={school?.id ? `${school.id}:payroll` : undefined}
        total={total}
        page={page}
        pageSize={pageSize}
      />

      <AnimatePresence>
        {isCreateModalOpen && (
          <CreatePayrollModal
            formData={formData}
            handleCreatePayroll={handleCreatePayroll}
            setFormData={setFormData}
            setIsCreateModalOpen={setIsCreateModalOpen}
            staffList={staff}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && (
          <EditPayrollModal
            formData={formData}
            handleUpdatePayroll={handleUpdatePayroll}
            selectedRecord={selectedRecord}
            setFormData={setFormData}
            setIsEditModalOpen={setIsEditModalOpen}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <PayslipDrawer
        isDetailModalOpen={isDetailModalOpen}
        school={school}
        selectedRecord={selectedRecord}
        setIsDetailModalOpen={setIsDetailModalOpen}
        showToast={showToast}
      />
    </div>
  );
};
