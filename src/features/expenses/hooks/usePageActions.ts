import type React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { expensesApi } from "../api";
import { receiptsApi } from "../../../services/receiptsApi";
import type { BudgetAllocation } from "../types";
import { confirmAction } from "../../../lib/swal";

export type PageActionsDeps = {
  school: any;
  accessToken: any;
  user: any;
  expenses: any;
  fees: any;
  payrolls: any;
  summary: any;
  refetchExpenses: any;
  budgets: any;
  setBudgets: any;
  setRefreshing: any;
  formData: any;
  setFormData: any;
  editingExpense: any;
  setEditingExpense: any;
  setIsModalOpen: any;
  setSubmitting: any;
  budgetForm: any;
  setBudgetForm: any;
  editingBudget: any;
  setEditingBudget: any;
  setIsBudgetModalOpen: any;
  forecastModel: any;
  isAccountantOrAdmin: any;
  txnSearch: any;
  txnType: any;
  txnCategory: any;
  txnStatus: any;
  txnFrom: any;
  txnTo: any;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
};

/** Handlers/actions extracted from Page.tsx to keep the page under 800 lines. */
export function usePageActions(deps: PageActionsDeps) {
  const { t } = useTranslation(["pages", "common"]);
  const {
    school,
    accessToken,
    user,
    expenses,
    fees,
    payrolls,
    summary,
    refetchExpenses,
    budgets,
    setBudgets,
    setRefreshing,
    formData,
    setFormData,
    editingExpense,
    setEditingExpense,
    setIsModalOpen,
    setSubmitting,
    budgetForm,
    setBudgetForm,
    editingBudget,
    setEditingBudget,
    setIsBudgetModalOpen,
    forecastModel,
    isAccountantOrAdmin,
    showToast,
    txnSearch,
    txnType,
    txnCategory,
    txnStatus,
    txnFrom,
    txnTo,
  } = deps;

  // Load Budgets from localStorage (device-local until a server budget API exists)
  const loadBudgets = () => {
    if (!school?.id) return;
    const key = `school_budgets_${school.id}`;
    const saved = localStorage.getItem(key);
    if (!saved) {
      setBudgets([]);
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setBudgets(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBudgets([]);
      showToast(t("expenses.toast.budgetsUnreadable"), "info");
    }
  };

  const saveBudgetsList = (newList: BudgetAllocation[]) => {
    if (!school?.id) {
      showToast(t("expenses.toast.sessionMissing"), "error");
      return;
    }
    setBudgets(newList);
    localStorage.setItem(`school_budgets_${school.id}`, JSON.stringify(newList));
  };

  useEffect(() => {
    if (school?.id) {
      loadBudgets();
    }
  }, [school?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (!school?.id) {
        showToast(t("expenses.toast.sessionMissing"), "error");
        return;
      }
      loadBudgets();
      await refetchExpenses();
      showToast(t("expenses.toast.refreshed"), "info");
    } catch (err: any) {
      showToast(err?.message || t("expenses.toast.refreshFailed"), "error");
    } finally {
      setRefreshing(false);
    }
  };

  const loadAllData = async () => {
    await refetchExpenses();
  };

  // Expense CRUD operations
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccountantOrAdmin) return showToast(t("expenses.toast.unauthorized"), "error");
    if (!school?.id) return showToast(t("expenses.toast.sessionMissing"), "error");
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      return showToast(t("expenses.toast.invalidAmount"), "error");
    }
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        amount,
        category: formData.category,
        date: new Date(formData.date).toISOString(),
        status: formData.status,
        notes: formData.notes,
        receiptUrl: formData.receiptUrl || null,
      };

      if (editingExpense) {
        await expensesApi.updateExpense(school.id, editingExpense.id, payload);
        showToast(t("expenses.toast.expenseUpdated"), "success");
      } else {
        await expensesApi.createExpense(school.id, payload);
        showToast(t("expenses.toast.expenseRecorded"), "success");
      }
      setIsModalOpen(false);
      setEditingExpense(null);
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("expenses.toast.saveFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "APPROVED" | "REJECTED" | "PENDING") => {
    if (!isAccountantOrAdmin) return showToast(t("expenses.toast.unauthorized"), "error");
    if (!school?.id) return showToast(t("expenses.toast.sessionMissing"), "error");
    try {
      await expensesApi.updateExpense(school.id, id, { status: newStatus });
      await loadAllData();
      const label =
        newStatus === "APPROVED"
          ? t("expenses.toast.approved")
          : newStatus === "REJECTED"
            ? t("expenses.toast.rejected")
            : t("expenses.toast.statusPending");
      showToast(label, "success");
    } catch (err: any) {
      showToast(err?.message || t("expenses.toast.statusUpdateFailed"), "error");
    }
  };

  const handleDownloadOfficialReceipt = async (exp: any) => {
    if (!school?.id) return showToast(t("expenses.toast.sessionMissing"), "error");
    if (exp.status !== "APPROVED") {
      return showToast(t("expenses.toast.receiptApprovedOnly"), "info");
    }
    try {
      await receiptsApi.downloadForSource(school.id, "EXPENSE", exp.id);
      showToast(t("expenses.toast.receiptDownloaded"), "success");
    } catch (err: any) {
      showToast(err?.message || t("expenses.toast.receiptDownloadFailed"), "error");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!school?.id) return showToast(t("expenses.toast.sessionMissing"), "error");
    const ok = await confirmAction({
      title: t("expenses.confirm.deleteExpenseTitle"),
      text: t("expenses.confirm.deleteExpenseText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await expensesApi.deleteExpense(school.id, id);
      await loadAllData();
      showToast(t("expenses.toast.expenseDeleted"), "info");
    } catch (err: any) {
      showToast(err?.message || t("expenses.toast.deleteFailed"), "error");
    }
  };

  const openEditModal = (exp: any) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title,
      amount: String(exp.amount),
      category: exp.category,
      date: exp.date ? exp.date.split("T")[0] : new Date().toISOString().split("T")[0],
      status: exp.status,
      notes: exp.notes || "",
      receiptUrl: exp.receiptUrl || ""
    });
    setIsModalOpen(true);
  };

  // Budget CRUD (saved on this device until a server budget API exists)
  const handleSubmitBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccountantOrAdmin) return showToast(t("expenses.toast.unauthorized"), "error");
    if (!school?.id) return showToast(t("expenses.toast.sessionMissing"), "error");

    const amountVal = parseFloat(budgetForm.allocated);
    if (isNaN(amountVal) || amountVal <= 0) {
      return showToast(t("expenses.toast.invalidAllocation"), "error");
    }

    if (editingBudget) {
      const updated = budgets.map((b: BudgetAllocation) =>
        b.id === editingBudget.id
          ? {
              ...b,
              department: budgetForm.department,
              category: budgetForm.category as BudgetAllocation["category"],
              allocated: amountVal,
              academicYear: budgetForm.academicYear,
              notes: budgetForm.notes,
            }
          : b
      );
      saveBudgetsList(updated);
      showToast(t("expenses.toast.budgetUpdated"), "success");
    } else {
      const brandNew: BudgetAllocation = {
        id: `b_${Date.now()}`,
        department: budgetForm.department,
        category: budgetForm.category as BudgetAllocation["category"],
        allocated: amountVal,
        academicYear: budgetForm.academicYear,
        notes: budgetForm.notes,
      };
      saveBudgetsList([...budgets, brandNew]);
      showToast(t("expenses.toast.budgetCreated"), "success");
    }

    setIsBudgetModalOpen(false);
    setEditingBudget(null);
  };

  const handleDeleteBudget = async (id: string) => {
    const ok = await confirmAction({
      title: t("expenses.confirm.deleteBudgetTitle"),
      text: t("expenses.confirm.deleteBudgetText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    saveBudgetsList(budgets.filter((b: BudgetAllocation) => b.id !== id));
    showToast(t("expenses.toast.budgetDeleted"), "info");
  };

  const openEditBudgetModal = (b: BudgetAllocation) => {
    setEditingBudget(b);
    setBudgetForm({
      department: b.department,
      category: b.category,
      allocated: String(b.allocated),
      academicYear: b.academicYear,
      notes: b.notes || ""
    });
    setIsBudgetModalOpen(true);
  };

  // Compile Unified Transaction Ledger (honest fields only)
  const getUnifiedTransactions = () => {
    const list: any[] = [];

    expenses.forEach((e: any) => {
      list.push({
        id: e.id,
        refCode: `EXP-${String(e.id).substring(0, 5).toUpperCase()}`,
        date: e.date ? new Date(e.date) : new Date(),
        particulars: e.title,
        type: "OUTFLOW",
        category: e.category,
        amount: e.amount,
        status:
          e.status === "APPROVED"
            ? "SETTLED"
            : e.status === "REJECTED"
              ? "VOID"
              : "PENDING",
        party: "—",
        notes: e.notes || "",
        receipt: e.receiptUrl || null,
      });
    });

    fees.forEach((f: any) => {
      list.push({
        id: f.id,
        refCode: `FEE-${String(f.id).substring(0, 5).toUpperCase()}`,
        date: f.paidAt
          ? new Date(f.paidAt)
          : f.dueDate
            ? new Date(f.dueDate)
            : new Date(),
        particulars: t("expenses.transactions.feeType", { type: f.type }),
        type: "INFLOW",
        category: "TUITION FEE",
        amount: f.amount,
        status: f.status === "PAID" ? "SETTLED" : "PENDING",
        party: f.student?.name || t("expenses.transactions.student"),
        notes: f.student?.email || "",
        receipt: null,
      });
    });

    payrolls.forEach((p: any) => {
      const payDate = p.paidAt
        ? new Date(p.paidAt)
        : new Date(p.year, p.month - 1, 28);
      list.push({
        id: p.id,
        refCode: `PAY-${String(p.id).substring(0, 5).toUpperCase()}`,
        date: payDate,
        particulars: t("expenses.transactions.payrollParticulars", {
          month: p.month,
          year: p.year,
        }),
        type: "OUTFLOW",
        category: "SALARY",
        amount: p.netSalary,
        status: p.status === "PAID" ? "SETTLED" : "PENDING",
        party: p.user?.name || t("expenses.transactions.staffMember"),
        notes: t("expenses.transactions.payrollNotes", {
          basic: p.basicSalary,
          allowances: p.allowances,
          deductions: p.deductions,
        }),
        receipt: null,
      });
    });

    return list
      .filter((txn) => {
        const q = (txnSearch || "").toLowerCase();
        const matchesSearch =
          !q ||
          txn.particulars.toLowerCase().includes(q) ||
          String(txn.party).toLowerCase().includes(q) ||
          txn.refCode.toLowerCase().includes(q);

        const matchesType = txnType === "ALL" || txn.type === txnType;
        const matchesCat =
          txnCategory === "ALL" || txn.category === txnCategory;
        const matchesStatus =
          txnStatus === "ALL" || txn.status === txnStatus;

        let matchesDate = true;
        if (txnFrom) {
          matchesDate = matchesDate && txn.date >= new Date(txnFrom);
        }
        if (txnTo) {
          const to = new Date(txnTo);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && txn.date <= to;
        }

        return (
          matchesSearch &&
          matchesType &&
          matchesCat &&
          matchesStatus &&
          matchesDate
        );
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const unifiedTxns = getUnifiedTransactions();

  // Advanced Analytics Metrics (no fake fallbacks)
  const calculatedMetrics = () => {
    const totalOut =
      expenses
        .filter((e: any) => e.status === "APPROVED")
        .reduce((sum: number, e: any) => sum + e.amount, 0) +
      payrolls
        .filter((p: any) => p.status === "PAID")
        .reduce((sum: number, p: any) => sum + p.netSalary, 0);

    const totalIn = fees
      .filter((f: any) => f.status === "PAID")
      .reduce((sum: number, f: any) => sum + f.amount, 0);

    const monthlyBurnRate = totalOut > 0 ? totalOut / 6 : 0;

    const collectedFees = totalIn;
    const pendingFees = fees
      .filter((f: any) => f.status === "PENDING")
      .reduce((sum: number, f: any) => sum + f.amount, 0);
    const grossFeesExpected = collectedFees + pendingFees;
    const feeCollectionEfficiency =
      grossFeesExpected > 0
        ? Math.round((collectedFees / grossFeesExpected) * 100)
        : 0;

    const operatingRatio =
      totalIn > 0 ? Math.round((totalOut / totalIn) * 100) : 0;

    return {
      monthlyBurnRate,
      feeCollectionEfficiency,
      operatingRatio,
      totalIn,
      totalOut,
      pendingFees,
      hasActivity: totalIn > 0 || totalOut > 0,
    };
  };

  const metrics = calculatedMetrics();

  // 12-month forecast from real averages only (empty when no activity)
  const getForecastingData = () => {
    if (!metrics.hasActivity) return [];

    const monthlyAvgIn = metrics.totalIn / 6;
    const monthlyAvgOut = metrics.totalOut / 6;

    let multiplierIn = 1.0;
    let multiplierOut = 1.0;
    if (forecastModel === "conservative") {
      multiplierIn = 0.85;
      multiplierOut = 1.1;
    } else if (forecastModel === "optimistic") {
      multiplierIn = 1.15;
      multiplierOut = 0.95;
    }

    const startMonth = new Date();
    let accumulatedCash =
      typeof summary?.totals?.netCashFlow === "number"
        ? summary.totals.netCashFlow
        : metrics.totalIn - metrics.totalOut;

    const data: any[] = [];
    for (let i = 1; i <= 12; i++) {
      const nextMonth = new Date(
        startMonth.getFullYear(),
        startMonth.getMonth() + i,
        1
      );
      const label = nextMonth.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const projectedIn = Number(
        (monthlyAvgIn * multiplierIn * (1 + i * 0.005)).toFixed(2)
      );
      const projectedOut = Number(
        (monthlyAvgOut * multiplierOut * (1 + i * 0.002)).toFixed(2)
      );
      accumulatedCash += projectedIn - projectedOut;

      data.push({
        month: label,
        projectedRevenue: projectedIn,
        projectedCosts: projectedOut,
        projectedCumulative: Number(accumulatedCash.toFixed(2)),
      });
    }
    return data;
  };

  const forecastData = getForecastingData();

  // Export Unified Transactions Master Ledger to PDF
  const handleExportTransactionsPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const primaryColor = [79, 70, 229]; // Indigo-600
      const darkSlate = [30, 41, 59]; // Slate-800
      const lightGray = [100, 116, 139]; // Slate-500

      // Accent top banner
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 8, "F");

      // Document Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(school?.name || t("expenses.pdf.schoolLedger"), 15, 24);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.text(t("expenses.pdf.transactionStatement"), 15, 29);
      doc.text(
        t("expenses.pdf.preparedBy", {
          name: user?.name || "—",
          role: user?.role || "",
        }),
        15,
        34
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(t("expenses.pdf.summary"), 120, 24);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(`${t("expenses.pdf.inflow")}: $${metrics.totalIn.toLocaleString()}`, 120, 29);
      doc.text(`${t("expenses.pdf.outflow")}: $${metrics.totalOut.toLocaleString()}`, 120, 33);
      doc.text(
        `${t("expenses.pdf.net")}: $${(metrics.totalIn - metrics.totalOut).toLocaleString()}`,
        120,
        37
      );

      doc.setDrawColor(226, 232, 240);
      doc.line(15, 42, 195, 42);

      // Create Table rows
      const tableRows = unifiedTxns.map(t => [
        t.refCode,
        t.date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }),
        t.particulars,
        t.type,
        t.party,
        t.status,
        `$${t.amount.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 46,
        head: [[
          t("expenses.pdf.colRef"),
          t("expenses.pdf.colDate"),
          t("expenses.pdf.colParticulars"),
          t("expenses.pdf.colType"),
          t("expenses.pdf.colParty"),
          t("expenses.pdf.colStatus"),
          t("expenses.pdf.colAmount"),
        ]],
        body: tableRows,
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 20 },
          2: { cellWidth: 45 },
          3: { cellWidth: 18 },
          4: { cellWidth: 35 },
          5: { cellWidth: 22 },
          6: { cellWidth: 22, halign: "right", fontStyle: "bold" }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      if (finalY < 260) {
        doc.setDrawColor(203, 213, 225);
        doc.line(15, finalY, 70, finalY);
        doc.line(140, finalY, 195, finalY);
        doc.setFontSize(8);
        doc.text(t("expenses.pdf.preparedBySig"), 15, finalY + 4);
        doc.text(t("expenses.pdf.approvedBy"), 140, finalY + 4);
      }

      doc.save(`Ledger_${school?.name?.replace(/\s+/g, "_") || "statement"}.pdf`);
      showToast(t("expenses.toast.pdfExported"), "success");
    } catch (err) {
      console.error(err);
      showToast(t("expenses.toast.pdfExportFailed"), "error")
    }
  };

  // Export consolidated Profit & Loss Statement (Classic P&L)
  const handleDownloadPLReport = () => {
    if (!summary) {
      showToast(t("expenses.toast.noSummaryExport"), "error");
      return;
    }
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const primaryColor = [79, 70, 229]; 
      const darkSlate = [30, 41, 59];
      const lightGray = [100, 116, 139];
      
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(school?.name || t("expenses.pdf.schoolLedger"), 20, 28);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.text(t("expenses.pdf.profitLoss"), 20, 34);
      doc.text(school?.address || "", 20, 39);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(t("expenses.pdf.profitLossHeading"), 125, 28);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(t("expenses.pdf.period", { year: new Date().getFullYear() }), 125, 34);
      doc.text(
        t("expenses.pdf.compiled", { date: new Date().toLocaleDateString() }),
        125,
        39
      );

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 46, 190, 46);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(t("expenses.pdf.revenueSection"), 20, 56);
      
      const revenueRows = [
        [t("expenses.pdf.feesCollected"), `$${summary.totals.totalRevenue.toLocaleString()}`],
        [t("expenses.pdf.feesPending"), `$${summary.totals.pendingRevenue.toLocaleString()}`],
        [
          t("expenses.pdf.grossRevenue"),
          `$${(summary.totals.totalRevenue + summary.totals.pendingRevenue).toLocaleString()}`,
        ],
      ];

      autoTable(doc, {
        startY: 60,
        margin: { left: 20, right: 20 },
        body: revenueRows,
        bodyStyles: { fontSize: 9.5, textColor: [51, 65, 85] },
        columnStyles: { 0: { halign: "left" }, 1: { halign: "right", fontStyle: "bold" } },
        theme: "plain"
      });

      const nextY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(t("expenses.pdf.expensesSection"), 20, nextY);

      const expenditureRows = [
        [t("expenses.pdf.payroll"), `$${summary.totals.totalPayroll.toLocaleString()}`],
        [t("expenses.pdf.approvedExpenses"), `$${summary.totals.totalExpenses.toLocaleString()}`],
        [t("expenses.pdf.pendingExpenses"), `$${summary.totals.pendingExpenses.toLocaleString()}`],
        [
          t("expenses.pdf.totalOutflow"),
          `$${(summary.totals.totalPayroll + summary.totals.totalExpenses + summary.totals.pendingExpenses).toLocaleString()}`,
        ],
      ];

      autoTable(doc, {
        startY: nextY + 4,
        margin: { left: 20, right: 20 },
        body: expenditureRows,
        bodyStyles: { fontSize: 9.5, textColor: [51, 65, 85] },
        columnStyles: { 0: { halign: "left" }, 1: { halign: "right", fontStyle: "bold", textColor: [239, 68, 68] } },
        theme: "plain"
      });

      const nextY2 = (doc as any).lastAutoTable.finalY + 12;

      doc.setFillColor(248, 250, 252);
      doc.rect(20, nextY2, 170, 24, "F");
      
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, nextY2, 170, 24, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(t("expenses.pdf.netSurplus"), 25, nextY2 + 9);
      
      const netSurplus = summary.totals.totalRevenue - (summary.totals.totalExpenses + summary.totals.totalPayroll);
      const grossRev = summary.totals.totalRevenue || 1;
      const marginPercent = ((netSurplus / grossRev) * 100).toFixed(1);

      doc.setFontSize(14);
      doc.setTextColor(netSurplus >= 0 ? 16 : 239, netSurplus >= 0 ? 185 : 68, netSurplus >= 0 ? 129 : 68);
      doc.text(`$${netSurplus.toLocaleString()}`, 25, nextY2 + 17);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.text(t("expenses.pdf.margin", { percent: marginPercent }), 110, nextY2 + 14);

      doc.save(`PL_${school?.name?.replace(/\s+/g, "_") || "statement"}.pdf`);
      showToast(t("expenses.toast.plExported"), "success");
    } catch (err) {
      console.error(err);
      showToast(t("expenses.toast.pdfExportFailed"), "error")
    }
  };

  return {
    loadBudgets,
    saveBudgetsList,
    handleRefresh,
    loadAllData,
    handleSubmitExpense,
    handleUpdateStatus,
    handleDownloadOfficialReceipt,
    handleDeleteExpense,
    openEditModal,
    handleSubmitBudget,
    handleDeleteBudget,
    openEditBudgetModal,
    getUnifiedTransactions,
    unifiedTxns,
    calculatedMetrics,
    metrics,
    getForecastingData,
    forecastData,
    handleExportTransactionsPDF,
    handleDownloadPLReport,
  };
}
