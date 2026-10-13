import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { feesApi } from "../api";
import { receiptsApi } from "../../../services/receiptsApi";
import type { FeePayment, FeeTemplate } from "../types";
import { feeAmountPaid, feeBalance, isFeeOpen, isFeeOverdue } from "../types";
import { confirmAction } from "../../../lib/swal";
import { formatMoney } from "../../../i18n/format";

export type PageActionsDeps = {
  school: any;
  user: any;
  fees: FeePayment[];
  students: any[];
  refetchFees: () => Promise<unknown> | void;
  feeRecords: FeePayment[];
  templates: FeeTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<FeeTemplate[]>>;
  setRefreshing: (v: boolean) => void;
  searchQuery: string;
  filterStatus: "ALL" | "PAID" | "PENDING" | "PARTIAL" | "OVERDUE" | "VOIDED" | "WRITTEN_OFF";
  filterType: string;
  sortBy: "dueDate" | "amount" | "student";
  sortOrder: "asc" | "desc";
  selectedStudentClass: string;
  selectedInvoices: string[];
  setSelectedInvoices: React.Dispatch<React.SetStateAction<string[]>>;
  invoiceForm: any;
  setInvoiceForm: any;
  templateForm: any;
  setTemplateForm: any;
  batchForm: any;
  setBatchForm: any;
  setSubmitting: (v: boolean) => void;
  setBatchProgress: any;
  setShowInvoiceModal: (v: boolean) => void;
  setShowTemplateModal: (v: boolean) => void;
  setIsDrawerOpen: (v: boolean) => void;
  setSelectedFee: React.Dispatch<React.SetStateAction<FeePayment | null>>;
  selectedFee: FeePayment | null;
  isStudent: boolean;
  isAdminOrAccountant: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
};

export function usePageActions(deps: PageActionsDeps) {
  const {
    school,
    user,
    fees,
    students,
    refetchFees,
    feeRecords,
    templates,
    setTemplates,
    setRefreshing,
    searchQuery,
    filterStatus,
    filterType,
    sortBy,
    sortOrder,
    selectedStudentClass,
    selectedInvoices,
    setSelectedInvoices,
    invoiceForm,
    setInvoiceForm,
    templateForm,
    setTemplateForm,
    batchForm,
    setBatchForm,
    setSubmitting,
    setBatchProgress,
    setShowInvoiceModal,
    setShowTemplateModal,
    setIsDrawerOpen,
    setSelectedFee,
    selectedFee,
    isAdminOrAccountant,
    showToast,
  } = deps;

  const { t } = useTranslation(["pages", "common"]);

  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [gradeLevels, setGradeLevels] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [batchResultSummary, setBatchResultSummary] = useState<string | null>(null);

  const loadTemplates = async () => {
    if (!school?.id || !isAdminOrAccountant) {
      setTemplates([]);
      return;
    }
    setTemplatesLoading(true);
    try {
      const rows = await feesApi.fetchTemplates(school.id);
      setTemplates(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      console.error(err);
      setTemplates([]);
      showToast(err?.message || t("fees.toast.templatesLoadFailed"), "error");
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadScopeLookups = async () => {
    if (!school?.id || !isAdminOrAccountant) return;
    try {
      const [grades, divs] = await Promise.all([
        feesApi.fetchGradeLevels(school.id),
        feesApi.fetchDivisions(school.id).catch(() => []),
      ]);
      setGradeLevels(Array.isArray(grades) ? grades : []);
      setDivisions(Array.isArray(divs) ? divs : []);
    } catch {
      setGradeLevels([]);
      setDivisions([]);
    }
  };

  useEffect(() => {
    if (school?.id && isAdminOrAccountant) {
      void loadTemplates();
      void loadScopeLookups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.id, isAdminOrAccountant]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (!school?.id && isAdminOrAccountant) {
        showToast(t("fees.toast.sessionMissing"), "error");
        return;
      }
      await Promise.all([refetchFees(), loadTemplates()]);
      showToast(t("fees.toast.refreshed"), "info");
    } catch (err: any) {
      showToast(err?.message || t("fees.toast.refreshFailed"), "error");
    } finally {
      setRefreshing(false);
    }
  };

  const classrooms = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    students.forEach((s) => {
      s.classroomMembers?.forEach((m: any) => {
        if (m.classroom && !seen.has(m.classroom.id)) {
          seen.add(m.classroom.id);
          list.push({ id: m.classroom.id, name: m.classroom.name });
        }
      });
    });
    return list;
  }, [students]);

  const analytics = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOverdue = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    const now = new Date();

    feeRecords.forEach((r) => {
      if (r.status === "VOIDED") return;
      totalExpected += r.amount;
      totalCollected += feeAmountPaid(r);
      if (isFeeOpen(r)) {
        if (isFeeOverdue(r, now)) {
          totalOverdue += feeBalance(r);
          overdueCount++;
        } else {
          pendingCount++;
        }
      }
    });

    const efficiency =
      totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    const monthlyMap: Record<string, { collected: number; expected: number }> = {};
    feeRecords.forEach((r) => {
      if (r.status === "VOIDED") return;
      const date = r.paidAt ? new Date(r.paidAt) : new Date(r.dueDate);
      const label = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      if (!monthlyMap[label]) monthlyMap[label] = { collected: 0, expected: 0 };
      monthlyMap[label].expected += r.amount;
      monthlyMap[label].collected += feeAmountPaid(r);
    });

    const trends = Object.entries(monthlyMap)
      .map(([month, val]) => ({
        month,
        Collected: val.collected,
        Pending: Math.max(0, val.expected - val.collected),
        Expected: val.expected,
      }))
      .sort((a, b) => {
        const parseMonth = (str: string) => {
          const [m, y] = str.split(" ");
          return new Date(`01 ${m} 20${y}`).getTime();
        };
        return parseMonth(a.month) - parseMonth(b.month);
      });

    const categoryMap: Record<string, { collected: number; pending: number }> = {};
    feeRecords.forEach((r) => {
      if (r.status === "VOIDED") return;
      const type = r.type;
      if (!categoryMap[type]) categoryMap[type] = { collected: 0, pending: 0 };
      categoryMap[type].collected += feeAmountPaid(r);
      categoryMap[type].pending += feeBalance(r);
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([name, val]) => ({
      name: name.replace(/_/g, " "),
      Collected: val.collected,
      Pending: val.pending,
      Total: val.collected + val.pending,
    }));

    return {
      totalExpected,
      totalCollected,
      totalOverdue,
      pendingCount,
      overdueCount,
      efficiency,
      trends,
      categoryBreakdown,
    };
  }, [feeRecords]);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    return feeRecords
      .filter((r) => {
        const matchesSearch =
          (r.student?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.student?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.id.toLowerCase().includes(searchQuery.toLowerCase());

        const overdue = isFeeOverdue(r, now);
        const matchesStatus =
          filterStatus === "ALL" ||
          (filterStatus === "PAID" && r.status === "PAID") ||
          (filterStatus === "VOIDED" && r.status === "VOIDED") ||
          (filterStatus === "WRITTEN_OFF" && r.status === "WRITTEN_OFF") ||
          (filterStatus === "PARTIAL" && r.status === "PARTIAL" && !overdue) ||
          (filterStatus === "PENDING" && r.status === "PENDING" && !overdue) ||
          (filterStatus === "OVERDUE" && overdue);

        const matchesType = filterType === "ALL" || r.type === filterType;
        const matchesClass =
          selectedStudentClass === "ALL" ||
          r.student?.classroomMembers?.some(
            (m) => m.classroom?.id === selectedStudentClass
          );

        return matchesSearch && matchesStatus && matchesType && matchesClass;
      })
      .sort((a, b) => {
        if (sortBy === "amount") {
          return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
        }
        if (sortBy === "student") {
          const nameA = a.student?.name || "";
          const nameB = b.student?.name || "";
          return sortOrder === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
        return sortOrder === "asc"
          ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
  }, [
    feeRecords,
    searchQuery,
    filterStatus,
    filterType,
    sortBy,
    sortOrder,
    selectedStudentClass,
  ]);

  const handleToggleSelectAll = () => {
    const selectable = filteredRecords.filter((r) => isFeeOpen(r));
    if (
      selectedInvoices.length === selectable.length &&
      selectable.length > 0
    ) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(selectable.map((r) => r.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSingleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrAccountant) return showToast(t("fees.toast.permissionDenied"), "error");
    if (!school?.id) return showToast(t("fees.toast.sessionMissing"), "error");
    if (!invoiceForm.studentId) return showToast(t("fees.toast.selectStudent"), "error");
    if (user?.role === "ACCOUNTANT" && !invoiceForm.templateId) {
      return showToast(t("fees.toast.selectFeeTemplate"), "error");
    }
    const originalAmount = parseFloat(invoiceForm.amount);
    const discount = parseFloat(invoiceForm.discountPercent || "0") / 100;
    const finalAmount = originalAmount * (1 - discount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return showToast(t("fees.toast.invalidInvoiceAmount"), "error");
    }
    setSubmitting(true);
    try {
      await feesApi.createFee(school.id, {
        studentId: invoiceForm.studentId,
        amount: finalAmount,
        type: invoiceForm.type,
        dueDate: new Date(invoiceForm.dueDate).toISOString(),
        status: "PENDING",
        notes: invoiceForm.notes || undefined,
        templateId: invoiceForm.templateId || undefined,
      });
      setShowInvoiceModal(false);
      setInvoiceForm({
        studentId: "",
        templateId: "",
        amount: "",
        type: "TUITION",
        dueDate: "",
        discountPercent: "0",
        notes: "",
      });
      await refetchFees();
      showToast(t("fees.toast.invoiceCreated"), "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("fees.toast.invoiceCreateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCollectPayment = async (
    feeId: string,
    opts: {
      confirmStale?: boolean;
      amount?: number;
      method?: string;
      notes?: string;
    } = {}
  ) => {
    if (!school?.id) return showToast(t("fees.toast.sessionMissing"), "error");
    const confirmStale = Boolean(opts.confirmStale);
    if (!confirmStale && opts.amount === undefined) {
      const ok = await confirmAction({
        title: t("fees.confirm.collectBalanceTitle"),
        text: t("fees.confirm.collectBalanceText"),
        confirmText: t("fees.confirm.collectBalanceConfirm"),
      });
      if (!ok) return;
    }
    try {
      const fee: any = await feesApi.collectFee(school.id, feeId, {
        confirmStale,
        amount: opts.amount,
        method: opts.method || "CASH",
        notes: opts.notes,
      });
      if (selectedFee?.id === feeId && fee) {
        setSelectedFee(fee);
      }
      await refetchFees();
      const bal = fee?.balance != null ? Number(fee.balance) : 0;
      showToast(
        bal > 0
          ? t("fees.toast.paymentRecordedBalance", {
              amount: formatMoney(bal),
            })
          : t("fees.toast.invoicePaidInFull"),
        "success"
      );
    } catch (err: any) {
      console.error(err);
      if (
        err?.code === "FEE_SCOPE_STALE" &&
        user?.role === "SCHOOL_ADMIN" &&
        !confirmStale
      ) {
        const ok = await confirmAction({
          title: t("fees.confirm.scopeStaleTitle"),
          text: err.message || t("fees.confirm.scopeStaleConfirm"),
          confirmText: t("fees.confirm.scopeStaleConfirm"),
          danger: true,
        });
        if (ok) return handleCollectPayment(feeId, { ...opts, confirmStale: true });
        return;
      }
      showToast(err?.message || t("fees.toast.paymentRecordFailed"), "error");
    }
  };

  const handleVoidFee = async (feeId: string) => {
    if (!school?.id) return showToast(t("fees.toast.sessionMissing"), "error");
    const ok = await confirmAction({
      title: t("fees.confirm.voidTitle"),
      text: t("fees.confirm.voidText"),
      confirmText: t("fees.confirm.voidConfirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await feesApi.voidFee(school.id, feeId);
      if (selectedFee?.id === feeId) {
        setSelectedFee((prev) => (prev ? { ...prev, status: "VOIDED", balance: 0 } : null));
      }
      setSelectedInvoices((prev) => prev.filter((id) => id !== feeId));
      await refetchFees();
      showToast(t("fees.toast.invoiceVoided"), "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("fees.toast.voidFailed"), "error");
    }
  };

  const handleWriteOffFee = async (feeId: string) => {
    if (!school?.id) return showToast(t("fees.toast.sessionMissing"), "error");
    const ok = await confirmAction({
      title: t("fees.confirm.writeOffTitle"),
      text: t("fees.confirm.writeOffText"),
      confirmText: t("fees.confirm.writeOffConfirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      const result: any = await feesApi.writeOffFee(school.id, feeId, {});
      if (selectedFee?.id === feeId && result?.fee) {
        setSelectedFee(result.fee);
      }
      await refetchFees();
      showToast(t("fees.toast.balanceWrittenOff"), "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("fees.toast.writeOffFailed"), "error");
    }
  };

  const handleSendReminder = async (feeId: string) => {
    try {
      const result: any = await feesApi.remindFee(feeId, {});
      showToast(
        result?.message || t("fees.toast.reminderLogged"),
        result?.delivered ? "success" : "info"
      );
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("fees.toast.reminderFailed"), "error");
    }
  };

  const handleBulkCollect = async () => {
    if (selectedInvoices.length === 0) return;
    if (!school?.id) return showToast(t("fees.toast.sessionMissing"), "error");
    const ok = await confirmAction({
      title: t("fees.confirm.bulkCollectTitle"),
      text: t(
        selectedInvoices.length === 1
          ? "fees.confirm.bulkCollectText"
          : "fees.confirm.bulkCollectText_plural",
        { count: selectedInvoices.length }
      ),
      confirmText: t("fees.confirm.bulkCollectConfirm"),
    });
    if (!ok) return;

    setSubmitting(true);
    let successCount = 0;
    for (const id of selectedInvoices) {
      try {
        await feesApi.collectFee(school.id, id, {});
        successCount++;
      } catch (err) {
        console.error("Bulk collect failed for ID: " + id, err);
      }
    }
    setSelectedInvoices([]);
    setSubmitting(false);
    await refetchFees();
    showToast(
      t(
        successCount === 1
          ? "fees.toast.bulkPaymentsRecorded"
          : "fees.toast.bulkPaymentsRecorded_plural",
        { count: successCount }
      ),
      successCount === 0 ? "error" : "success"
    );
  };

  const handleBulkRemind = async () => {
    if (selectedInvoices.length === 0) return;
    setSubmitting(true);
    let count = 0;
    for (const id of selectedInvoices) {
      try {
        await feesApi.remindFee(id, {});
        count++;
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedInvoices([]);
    setSubmitting(false);
    showToast(
      t(
        count === 1
          ? "fees.toast.bulkRemindersLogged"
          : "fees.toast.bulkRemindersLogged_plural",
        { count }
      ),
      "info"
    );
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return showToast(t("fees.toast.sessionMissing"), "error");
    const parsedAmount = parseFloat(templateForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return showToast(t("fees.toast.invalidAmount"), "error");
    }
    const scopeMode = templateForm.scopeMode || "SCHOOL";
    if (scopeMode === "GRADE" && !templateForm.gradeLevelId) {
      return showToast(t("fees.toast.selectGradeLevel"), "error");
    }
    if (scopeMode === "DIVISION" && !templateForm.divisionId) {
      return showToast(t("fees.toast.selectDivisionRequired"), "error");
    }
    setSubmitting(true);
    const payload = {
      name: templateForm.name,
      type: templateForm.type,
      amount: parsedAmount,
      description: templateForm.description || "",
      scopeMode,
      gradeLevelId: scopeMode === "GRADE" ? templateForm.gradeLevelId : null,
      divisionId: scopeMode === "DIVISION" ? templateForm.divisionId : null,
      cohort: templateForm.cohort || "ALL",
      schoolYearKey: templateForm.schoolYearKey || null,
    };
    try {
      if (templateForm.id) {
        await feesApi.updateTemplate(school.id, templateForm.id, payload);
        showToast(t("fees.toast.templateUpdated"), "success");
      } else {
        await feesApi.createTemplate(school.id, payload);
        showToast(t("fees.toast.templateSaved"), "success");
      }
      setShowTemplateModal(false);
      setTemplateForm({
        id: "",
        name: "",
        type: "TUITION",
        amount: "",
        description: "",
        scopeMode: "SCHOOL",
        gradeLevelId: "",
        divisionId: "",
        cohort: "ALL",
        schoolYearKey: "",
      });
      await loadTemplates();
    } catch (err: any) {
      showToast(err?.message || t("fees.toast.templateSaveFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditTemplate = (templ: FeeTemplate) => {
    setTemplateForm({
      id: templ.id,
      name: templ.name || "",
      type: templ.type || "TUITION",
      amount: String(templ.amount ?? ""),
      description: templ.description || "",
      scopeMode: templ.scopeMode || "SCHOOL",
      gradeLevelId: templ.gradeLevelId || "",
      divisionId: templ.divisionId || "",
      cohort: templ.cohort || "ALL",
      schoolYearKey: templ.schoolYearKey || "",
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!school?.id) return showToast(t("fees.toast.sessionMissing"), "error");
    const ok = await confirmAction({
      title: t("fees.confirm.deleteTemplateTitle"),
      text: t("fees.confirm.deleteTemplateText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await feesApi.deleteTemplate(school.id, id);
      await loadTemplates();
      showToast(t("fees.toast.templateDeleted"), "success");
    } catch (err: any) {
      showToast(err?.message || t("fees.toast.templateDeleteFailed"), "error");
    }
  };

  const handleRunBatchBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return showToast(t("fees.toast.sessionMissing"), "error");
    setBatchResultSummary(null);

    if ((batchForm.mode || "CLASSROOM") === "TEMPLATE") {
      if (!batchForm.templateId) return showToast(t("fees.toast.selectTemplate"), "error");
      if (!batchForm.dueDate) return showToast(t("fees.toast.selectDueDate"), "error");
      const ok = await confirmAction({
        title: t("fees.confirm.applyTemplateTitle"),
        text: t("fees.confirm.applyTemplateText"),
        confirmText: t("fees.confirm.applyTemplateConfirm"),
      });
      if (!ok) return;
      setSubmitting(true);
      setBatchProgress({ current: 0, total: 1, active: true });
      try {
        const result: any = await feesApi.batchApply(school.id, {
          templateId: batchForm.templateId,
          dueDate: new Date(batchForm.dueDate).toISOString(),
          schoolYearKey: batchForm.schoolYearKey || undefined,
        });
        setBatchResultSummary(
          t("fees.batchResultSummary", {
            created: result.created || 0,
            skipped: result.skipped || 0,
            failed: result.failed || 0,
            total: result.total || 0,
          })
        );
        showToast(
          t("fees.toast.batchApplyFinished", { created: result.created || 0 }),
          result.failed ? "info" : "success"
        );
        await refetchFees();
      } catch (err: any) {
        showToast(err?.message || t("fees.toast.batchApplyFailed"), "error");
      } finally {
        setBatchProgress({ current: 0, total: 0, active: false });
        setSubmitting(false);
      }
      return;
    }

    let targetGroup = students;
    if (batchForm.targetClassroom !== "ALL") {
      targetGroup = students.filter((s) =>
        s.classroomMembers?.some(
          (m: any) => m.classroom?.id === batchForm.targetClassroom
        )
      );
    }

    if (targetGroup.length === 0) {
      return showToast(t("fees.toast.noStudentsInClass"), "error");
    }

    const baseVal = parseFloat(batchForm.amount);
    const discount = parseFloat(batchForm.discountPercent || "0") / 100;
    const finalVal = baseVal * (1 - discount);

    if (isNaN(finalVal) || finalVal <= 0) {
      return showToast(t("fees.toast.invalidAmount"), "error");
    }

    const ok = await confirmAction({
      title: t("fees.confirm.batchInvoicesTitle"),
      text: t(
        targetGroup.length === 1
          ? "fees.confirm.batchInvoicesText"
          : "fees.confirm.batchInvoicesText_plural",
        {
          count: targetGroup.length,
          amount: formatMoney(finalVal),
        }
      ),
      confirmText: t("fees.confirm.batchInvoicesConfirm"),
    });
    if (!ok) return;

    setBatchProgress({ current: 0, total: targetGroup.length, active: true });
    let success = 0;
    let failed = 0;

    for (let i = 0; i < targetGroup.length; i++) {
      const stud = targetGroup[i];
      setBatchProgress((prev: any) => ({ ...prev, current: i + 1 }));
      try {
        await feesApi.createFee(school.id, {
          studentId: stud.id,
          amount: finalVal,
          type: batchForm.type,
          dueDate: new Date(batchForm.dueDate).toISOString(),
          status: "PENDING",
          templateId: batchForm.templateId || undefined,
        });
        success++;
      } catch (err: any) {
        failed++;
        console.error("Batch error for student: " + stud.name, err);
      }
    }

    setBatchProgress({ current: 0, total: 0, active: false });
    setBatchForm({
      mode: "CLASSROOM",
      targetClassroom: "ALL",
      templateId: "",
      type: "TUITION",
      amount: "",
      dueDate: "",
      discountPercent: "0",
      schoolYearKey: "",
    });
    await refetchFees();
    const batchToast =
      t(
        targetGroup.length === 1
          ? "fees.toast.batchInvoicesCreated"
          : "fees.toast.batchInvoicesCreated_plural",
        {
          success,
          total: targetGroup.length,
        }
      ) +
      (failed ? t("fees.toast.batchInvoicesRejected", { failed }) : "");
    showToast(
      batchToast,
      success === targetGroup.length ? "success" : "info"
    );
  };

  const handleApplyTemplateToBatch = (tid: string) => {
    const templ = templates.find((t) => t.id === tid);
    if (templ) {
      setBatchForm((prev: any) => ({
        ...prev,
        templateId: tid,
        type: templ.type,
        amount: String(templ.amount),
        schoolYearKey: templ.schoolYearKey || prev.schoolYearKey || "",
      }));
    } else {
      setBatchForm((prev: any) => ({ ...prev, templateId: tid }));
    }
  };

  const handleApplyTemplateToSingle = (tid: string) => {
    const templ = templates.find((t) => t.id === tid);
    if (templ) {
      setInvoiceForm((prev: any) => ({
        ...prev,
        templateId: tid,
        type: templ.type,
        amount: String(templ.amount),
      }));
    } else {
      setInvoiceForm((prev: any) => ({ ...prev, templateId: "" }));
    }
  };

  const handleStudentSelfPay = async (feeId: string, amount?: number) => {
    setPayingFeeId(feeId);
    try {
      const returnPath = window.location.pathname;
      const session: any = await feesApi.createCheckout(feeId, {
        successUrl: `${window.location.origin}${returnPath}?paid=1&fee_id=${feeId}`,
        cancelUrl: `${window.location.origin}${returnPath}?canceled=1&fee_id=${feeId}`,
        email: user?.email,
        amount,
      });
      if (session?.url) {
        window.location.href = session.url;
        return;
      }
      await feesApi.payFee(feeId, { amount });
      setIsDrawerOpen(false);
      setSelectedFee(null);
      await refetchFees();
      showToast(t("fees.toast.paymentRecorded"), "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("fees.toast.paymentFailed"), "error");
    } finally {
      setPayingFeeId(null);
    }
  };

  const handleDownloadReceipt = async (record: FeePayment, receiptId?: string | null) => {
    if (!school?.id) {
      showToast(t("fees.toast.sessionMissing"), "error");
      return;
    }
    try {
      if (receiptId) {
        await receiptsApi.download(receiptId);
      } else if (record.status === "PAID" || record.status === "PARTIAL") {
        const txns: any = await feesApi.fetchFeePayments(record.id);
        const list = Array.isArray(txns) ? txns : [];
        const withReceipt = list.find((t: any) => t.receiptId);
        if (withReceipt?.receiptId) {
          await receiptsApi.download(withReceipt.receiptId);
        } else if (record.status === "PAID") {
          await receiptsApi.downloadForSource(school.id, "FEE_PAYMENT", record.id);
        } else {
          throw new Error(t("fees.toast.noReceiptForInvoice"));
        }
      } else {
        throw new Error(t("fees.toast.receiptAfterPaymentOnly"));
      }
      showToast(t("fees.toast.receiptDownloaded"), "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("fees.toast.receiptDownloadFailed"), "error");
    }
  };

  const handleExportLedgerPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 297, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(school?.name || t("fees.ledger.school"), 15, 22);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(t("fees.export.ledgerTitle"), 15, 28);
      doc.text(
        t("fees.export.generated", {
          date: new Date().toLocaleDateString(),
          user: user?.name || "",
        }),
        15,
        33
      );

      doc.setFont("helvetica", "bold");
      doc.text(t("fees.export.summary"), 180, 22);
      doc.setFont("helvetica", "normal");
      doc.text(
        t("fees.export.collected", {
          amount: formatMoney(analytics.totalCollected),
        }),
        180,
        27
      );
      doc.text(
        t("fees.export.overdue", {
          amount: formatMoney(analytics.totalOverdue),
        }),
        180,
        32
      );

      const tableRows = filteredRecords.map((r) => [
        r.id.slice(0, 8).toUpperCase(),
        r.student?.name || "—",
        r.student?.email || "—",
        r.type,
        new Date(r.dueDate).toLocaleDateString(),
        r.status,
        formatMoney(r.amount),
      ]);

      autoTable(doc, {
        startY: 38,
        head: [
          [
            t("fees.export.colInvoice"),
            t("fees.export.colStudent"),
            t("fees.export.colEmail"),
            t("fees.export.colType"),
            t("fees.export.colDue"),
            t("fees.export.colStatus"),
            t("fees.export.colAmount"),
          ],
        ],
        body: tableRows,
        headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
      });

      doc.save(
        t("fees.export.filename", {
          date: new Date().toISOString().split("T")[0],
        })
      );
    } catch (err) {
      console.error(err);
      showToast(t("fees.toast.exportLedgerFailed"), "error");
    }
  };

  return {
    loadTemplates,
    handleRefresh,
    classrooms,
    analytics,
    categoryBreakdown: analytics.categoryBreakdown,
    efficiency: analytics.efficiency,
    trends: analytics.trends,
    filteredRecords,
    handleToggleSelectAll,
    handleToggleSelectOne,
    handleSingleInvoiceSubmit,
    handleCollectPayment,
    handleVoidFee,
    handleWriteOffFee,
    handleSendReminder,
    handleBulkCollect,
    handleBulkRemind,
    handleCreateTemplate,
    handleDeleteTemplate,
    openEditTemplate,
    handleRunBatchBilling,
    handleApplyTemplateToBatch,
    handleApplyTemplateToSingle,
    handleStudentSelfPay,
    handleDownloadReceipt,
    handleExportLedgerPDF,
    payingFeeId,
    templatesLoading,
    gradeLevels,
    divisions,
    batchResultSummary,
  };
}
