import React, { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useExpensesQuery } from "./hooks/useExpensesQuery";
import { ExpenseFormModal } from "./components/ExpenseFormModal";
import { BudgetFormModal } from "./components/BudgetFormModal";
import { TransactionDetailsModal } from "./components/TransactionDetailsModal";
import { OperationalLedgerPanel } from "./components/OperationalLedgerPanel";
import { OverviewTab } from "./components/OverviewTab";
import { BudgetsTab } from "./components/BudgetsTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { TransactionsTab } from "./components/TransactionsTab";
import type { BudgetAllocation } from "./types";
import { ExpensesChrome } from "./components/ExpensesChrome";
import { usePageActions } from "./hooks/usePageActions";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { cardShell } from "../academics-shared/FeatureModalShell";
import { EXPENSE_CATEGORIES } from "./categoryStyles";
import { useListFilters, type FilterFieldDef } from "../list-filters";

export const Expenses = () => {
  const { t } = useTranslation("pages");
  const { school, accessToken, user } = useAuthStore();

  const ledgerFilterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "category",
        label: t("expenses.ledger.allCategories"),
        type: "enum",
        primary: true,
        allLabel: t("expenses.ledger.allCategories"),
        options: EXPENSE_CATEGORIES.map((c) => ({
          value: c,
          label: t(`expenses.categories.${c}`),
        })),
      },
      {
        key: "status",
        label: t("expenses.ledger.allStatuses"),
        type: "enum",
        primary: true,
        allLabel: t("expenses.ledger.allStatuses"),
        options: [
          { value: "APPROVED", label: t("expenses.status.APPROVED") },
          { value: "PENDING", label: t("expenses.status.PENDING") },
          { value: "REJECTED", label: t("expenses.status.REJECTED") },
        ],
      },
    ],
    [t]
  );
  const ledgerFilters = useListFilters({ fields: ledgerFilterFields, syncUrl: true });

  const {
    expenses,
    total: expenseTotal,
    page: expensePage,
    pageSize: expensePageSize,
    fees,
    payrolls,
    summary,
    loading,
    isError,
    error,
    invalidate,
    refetchAll,
  } = useExpensesQuery({
    q: ledgerFilters.committedQ,
    category: ledgerFilters.values.category || undefined,
    status: ledgerFilters.values.status || undefined,
    page: ledgerFilters.page,
    pageSize: ledgerFilters.pageSize,
  });

  const refetchExpenses = async () => {
    await invalidate();
    await refetchAll();
  };

  const [activeTab, setActiveTab] = useState<
    "overview" | "ledger" | "budgets" | "analytics" | "transactions"
  >("ledger");

  const [budgets, setBudgets] = useState<BudgetAllocation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [forecastModel, setForecastModel] = useState<
    "conservative" | "neutral" | "optimistic"
  >("neutral");

  const txnFilterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "type",
        label: t("expenses.transactions.allTypes"),
        type: "enum",
        primary: true,
        allLabel: t("expenses.transactions.allTypes"),
        options: [
          { value: "INFLOW", label: t("expenses.txnType.INFLOW") },
          { value: "OUTFLOW", label: t("expenses.txnType.OUTFLOW") },
        ],
      },
      {
        key: "category",
        label: t("expenses.transactions.allCategories"),
        type: "enum",
        primary: true,
        allLabel: t("expenses.transactions.allCategories"),
        options: [
          { value: "TUITION FEE", label: t("expenses.transactions.tuitionFee") },
          ...EXPENSE_CATEGORIES.map((c) => ({
            value: c,
            label: t(`expenses.categories.${c}`),
          })),
        ],
      },
      {
        key: "status",
        label: t("expenses.transactions.allStatus"),
        type: "enum",
        primary: true,
        allLabel: t("expenses.transactions.allStatus"),
        options: [
          { value: "SETTLED", label: t("expenses.txnStatus.SETTLED") },
          { value: "PENDING", label: t("expenses.txnStatus.PENDING") },
          { value: "VOID", label: t("expenses.txnStatus.VOID") },
        ],
      },
      { key: "from", label: t("common:from", { defaultValue: "From" }), type: "date" },
      { key: "to", label: t("common:to", { defaultValue: "To" }), type: "date" },
    ],
    [t]
  );
  const txnFilters = useListFilters({ fields: txnFilterFields, syncUrl: false });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "ACADEMIC",
    date: new Date().toISOString().split("T")[0],
    status: "PENDING",
    notes: "",
    receiptUrl: "",
  });

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetAllocation | null>(
    null
  );
  const [budgetForm, setBudgetForm] = useState({
    department: "",
    category: "ACADEMIC",
    allocated: "",
    academicYear: "2026/2027",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [selectedTxnDetails, setSelectedTxnDetails] = useState<any | null>(
    null
  );

  const { toast, showToast } = usePageToast();
  const isAccountantOrAdmin = ["SCHOOL_ADMIN", "ACCOUNTANT"].includes(
    user?.role || ""
  );

  const {
    handleRefresh,
    handleSubmitExpense,
    handleUpdateStatus,
    handleDownloadOfficialReceipt,
    handleDeleteExpense,
    openEditModal,
    handleSubmitBudget,
    handleDeleteBudget,
    openEditBudgetModal,
    unifiedTxns,
    metrics,
    forecastData,
    handleExportTransactionsPDF,
    handleDownloadPLReport,
  } = usePageActions({
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
    txnSearch: txnFilters.committedQ,
    txnType: txnFilters.values.type || "ALL",
    txnCategory: txnFilters.values.category || "ALL",
    txnStatus: txnFilters.values.status || "ALL",
    txnFrom: txnFilters.values.from || "",
    txnTo: txnFilters.values.to || "",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      {!school?.id && (
        <div className="rounded-[32px] border border-rose-100 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700">
          {t("expenses.page.sessionMissingBanner")}
        </div>
      )}

      {isError && (
        <div className="rounded-[32px] border border-rose-100 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700">
          {(error as Error)?.message || t("expenses.page.loadFailed")}{" "}
          {t("expenses.page.loadFailedHint")}
        </div>
      )}

      <ExpensesChrome
        activeTab={activeTab}
        handleExportTransactionsPDF={handleExportTransactionsPDF}
        handleRefresh={handleRefresh}
        isAccountantOrAdmin={isAccountantOrAdmin}
        refreshing={refreshing}
        setActiveTab={setActiveTab}
        setEditingExpense={setEditingExpense}
        setFormData={setFormData}
        setIsModalOpen={setIsModalOpen}
        title={t("expenses.title")}
        subtitle={t("expenses.subtitle")}
      />

      {loading ? (
        <div className={`${cardShell} h-64 animate-pulse bg-slate-50`} />
      ) : (
        <>
          {activeTab === "ledger" && (
            <OperationalLedgerPanel
              filteredExpenses={expenses}
              handleDeleteExpense={handleDeleteExpense}
              handleUpdateStatus={handleUpdateStatus}
              handleDownloadOfficialReceipt={handleDownloadOfficialReceipt}
              isAccountantOrAdmin={isAccountantOrAdmin}
              openEditModal={openEditModal}
              filterFields={ledgerFilterFields}
              filters={ledgerFilters}
              savedViewsScope={school?.id ? `${school.id}:expenses-ledger` : undefined}
              total={expenseTotal}
              page={expensePage}
              pageSize={expensePageSize}
            />
          )}

          {activeTab === "overview" && (
            <OverviewTab
              handleDownloadPLReport={handleDownloadPLReport}
              metrics={metrics}
              summary={summary}
            />
          )}

          {activeTab === "budgets" && (
            <BudgetsTab
              budgets={budgets}
              expenses={expenses}
              handleDeleteBudget={handleDeleteBudget}
              isAccountantOrAdmin={isAccountantOrAdmin}
              openEditBudgetModal={openEditBudgetModal}
              setBudgetForm={setBudgetForm}
              setEditingBudget={setEditingBudget}
              setIsBudgetModalOpen={setIsBudgetModalOpen}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsTab
              forecastData={forecastData}
              forecastModel={forecastModel}
              metrics={metrics}
              setForecastModel={setForecastModel}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionsTab
              setSelectedTxnDetails={setSelectedTxnDetails}
              filterFields={txnFilterFields}
              filters={txnFilters}
              unifiedTxns={unifiedTxns}
              savedViewsScope={school?.id ? `${school.id}:expenses-transactions` : undefined}
            />
          )}
        </>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <ExpenseFormModal
            editingExpense={editingExpense}
            formData={formData}
            handleSubmitExpense={handleSubmitExpense}
            setFormData={setFormData}
            setIsModalOpen={setIsModalOpen}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBudgetModalOpen && (
          <BudgetFormModal
            budgetForm={budgetForm}
            editingBudget={editingBudget}
            handleSubmitBudget={handleSubmitBudget}
            setBudgetForm={setBudgetForm}
            setIsBudgetModalOpen={setIsBudgetModalOpen}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTxnDetails && (
          <TransactionDetailsModal
            selectedTxnDetails={selectedTxnDetails}
            setSelectedTxnDetails={setSelectedTxnDetails}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
