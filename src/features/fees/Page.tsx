import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useFeesQuery } from "./hooks/useFeesQuery";
import { useFeesLedgerQuery } from "./hooks/useFeesLedgerQuery";
import { InvoiceModal } from "./components/InvoiceModal";
import { TemplateModal } from "./components/TemplateModal";
import { FeeDetailDrawer } from "./components/FeeDetailDrawer";
import { BatchBillingPanel } from "./components/BatchBillingPanel";
import { OverviewTab } from "./components/OverviewTab";
import { LedgerTab } from "./components/LedgerTab";
import { TemplatesTab } from "./components/TemplatesTab";
import { HistoryTab } from "./components/HistoryTab";
import { ReceiptsTab } from "./components/ReceiptsTab";
import type { FeePayment, FeeTemplate } from "./types";
import { FeesChrome } from "./components/FeesChrome";
import { usePageActions } from "./hooks/usePageActions";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { cardShell } from "../academics-shared/FeatureModalShell";

export const Fees = () => {
  const { t } = useTranslation("pages");
  const { school, user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    fees,
    students,
    loading,
    isError,
    error,
    invalidate,
    refetchAll,
  } = useFeesQuery();

  const refetchFees = async () => {
    await invalidate();
    await refetchAll();
  };

  const [activeTab, setActiveTab] = useState<
    "overview" | "ledger" | "history" | "templates" | "batch" | "receipts"
  >(() => {
    const tab = searchParams.get("tab");
    if (tab === "history" || tab === "transactions") return "history";
    if (tab === "receipts") return "receipts";
    if (tab === "ledger" || tab === "invoices") return "ledger";
    if (tab === "templates") return "templates";
    if (tab === "batch") return "batch";
    if (searchParams.get("schoolYearKey") || searchParams.get("promoted")) return "batch";
    return "overview";
  });

  const handoffYearKey = searchParams.get("schoolYearKey");
  const handoffPromoted = searchParams.get("promoted");

  const feeRecords = fees as FeePayment[];
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "PAID" | "PENDING" | "PARTIAL" | "OVERDUE" | "VOIDED" | "WRITTEN_OFF"
  >("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"dueDate" | "amount" | "student">(
    "dueDate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedStudentClass, setSelectedStudentClass] = useState("ALL");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(50);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeePayment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    studentId: "",
    templateId: "",
    amount: "",
    type: "TUITION",
    dueDate: "",
    discountPercent: "0",
    notes: "",
  });

  const [templateForm, setTemplateForm] = useState({
    id: "" as string,
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

  const [batchForm, setBatchForm] = useState({
    mode: "TEMPLATE",
    targetClassroom: "ALL",
    templateId: "",
    type: "TUITION",
    amount: "",
    dueDate: "",
    discountPercent: "0",
    schoolYearKey: searchParams.get("schoolYearKey") || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    active: false,
  });

  const { toast, showToast } = usePageToast();

  const isPortalViewer = user?.role === "STUDENT" || user?.role === "PARENT";
  const isStudent = isPortalViewer;
  const isAdminOrAccountant = ["SCHOOL_ADMIN", "ACCOUNTANT"].includes(
    user?.role || ""
  );

  useEffect(() => {
    setLedgerPage(1);
  }, [searchQuery, filterStatus, filterType, sortBy, sortOrder]);

  const ledgerQuery = useFeesLedgerQuery({
    q: searchQuery,
    status: filterStatus,
    type: filterType,
    page: ledgerPage,
    pageSize: ledgerPageSize,
    sort: sortBy === "student" ? "dueDate" : sortBy,
    order: sortOrder,
    enabled: !isStudent && activeTab === "ledger",
  });

  const ledgerFilteredRecords = useMemo(() => {
    let rows = ledgerQuery.fees;
    if (selectedStudentClass !== "ALL") {
      rows = rows.filter((r) =>
        r.student?.classroomMembers?.some(
          (m) => m.classroom?.id === selectedStudentClass
        )
      );
    }
    if (sortBy === "student") {
      rows = [...rows].sort((a, b) => {
        const nameA = a.student?.name || "";
        const nameB = b.student?.name || "";
        return sortOrder === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    }
    return rows;
  }, [
    ledgerQuery.fees,
    selectedStudentClass,
    sortBy,
    sortOrder,
  ]);

  const {
    handleRefresh,
    classrooms,
    analytics,
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
  } = usePageActions({
    school,
    user,
    fees: feeRecords,
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
    isStudent,
    isAdminOrAccountant,
    showToast,
  });

  useEffect(() => {
    const paid = searchParams.get("paid");
    const canceled = searchParams.get("canceled");
    if (paid || canceled) {
      if (paid) {
        showToast(t("fees.toast.paymentRecordedRefreshing"), "success");
        void refetchFees();
      } else {
        showToast(t("fees.toast.checkoutCanceled"), "info");
      }
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && feeRecords.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
        <div className={`${cardShell} h-36 animate-pulse bg-slate-50`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`${cardShell} h-32 animate-pulse bg-slate-50`}
            />
          ))}
        </div>
        <div className={`${cardShell} h-64 animate-pulse bg-slate-50`} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      {!school?.id && !isPortalViewer && (
        <div className="rounded-[32px] border border-rose-100 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700">
          {t("fees.page.sessionMissingBanner")}
        </div>
      )}

      {isError && (
        <div className="rounded-[32px] border border-rose-100 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700">
          {(error as Error)?.message || t("fees.page.loadFailed")}{" "}
          {t("fees.page.loadFailedHint")}
        </div>
      )}

      <FeesChrome
        activeTab={activeTab}
        handleExportLedgerPDF={handleExportLedgerPDF}
        handleRefresh={handleRefresh}
        isAdminOrAccountant={isAdminOrAccountant}
        isPortalViewer={isPortalViewer}
        refreshing={refreshing}
        setActiveTab={setActiveTab}
        setShowInvoiceModal={setShowInvoiceModal}
        title={t("fees.title")}
        subtitle={t("fees.subtitle")}
      />

      {handoffYearKey && isAdminOrAccountant && (
        <div className="rounded-[32px] border border-indigo-100 bg-indigo-50/80 px-6 py-4 text-sm text-indigo-950">
          <p className="font-semibold tracking-tight">Year Transition handoff</p>
          <p className="mt-1 text-indigo-900/80">
            School year key <span className="font-mono font-bold">{handoffYearKey}</span>
            {handoffPromoted ? (
              <>
                {" "}
                · <span className="font-mono font-bold">{handoffPromoted}</span> students marked
                promoted. Use Batch billing with this year key.
              </>
            ) : (
              <> · Use Batch billing with this year key for returning / promoted cohorts.</>
            )}
          </p>
        </div>
      )}

      {!isStudent && activeTab === "overview" && (
        <OverviewTab
          analytics={analytics}
          feeRecords={feeRecords}
          onViewHistory={() => setActiveTab("history")}
        />
      )}

      {((isStudent && activeTab === "overview") ||
        (!isStudent && activeTab === "ledger")) && (
        <LedgerTab
          classrooms={classrooms}
          feeRecords={isStudent ? feeRecords : ledgerQuery.fees}
          filterStatus={filterStatus}
          filterType={filterType}
          filteredRecords={isStudent ? filteredRecords : ledgerFilteredRecords}
          ledgerTotal={isStudent ? undefined : ledgerQuery.total}
          ledgerPage={isStudent ? undefined : ledgerPage}
          ledgerPageSize={isStudent ? undefined : ledgerPageSize}
          onLedgerPageChange={isStudent ? undefined : setLedgerPage}
          onLedgerPageSizeChange={
            isStudent
              ? undefined
              : (size) => {
                  setLedgerPageSize(size);
                  setLedgerPage(1);
                }
          }
          handleBulkCollect={handleBulkCollect}
          handleBulkRemind={handleBulkRemind}
          handleCollectPayment={(id) => handleCollectPayment(id)}
          handleVoidFee={handleVoidFee}
          handleDownloadReceipt={handleDownloadReceipt}
          handleSendReminder={handleSendReminder}
          handleToggleSelectAll={handleToggleSelectAll}
          handleToggleSelectOne={handleToggleSelectOne}
          isAdminOrAccountant={isAdminOrAccountant}
          isStudent={isStudent}
          school={school}
          searchQuery={searchQuery}
          selectedInvoices={selectedInvoices}
          selectedStudentClass={selectedStudentClass}
          setFilterStatus={setFilterStatus}
          setFilterType={setFilterType}
          setIsDrawerOpen={setIsDrawerOpen}
          setSearchQuery={setSearchQuery}
          setSelectedFee={setSelectedFee}
          setSelectedInvoices={setSelectedInvoices}
          setSelectedStudentClass={setSelectedStudentClass}
          setSortBy={setSortBy}
          setSortOrder={setSortOrder}
          submitting={submitting}
        />
      )}

      {!isStudent && activeTab === "history" && school?.id && (
        <HistoryTab
          schoolId={school.id}
          feeRecords={feeRecords}
          setSelectedFee={setSelectedFee}
          setIsDrawerOpen={setIsDrawerOpen}
          showToast={showToast}
        />
      )}

      {!isStudent && activeTab === "receipts" && school?.id && (
        <ReceiptsTab schoolId={school.id} showToast={showToast} />
      )}

      {!isStudent && activeTab === "templates" && (
        <TemplatesTab
          handleDeleteTemplate={handleDeleteTemplate}
          openEditTemplate={openEditTemplate}
          setActiveTab={setActiveTab}
          setBatchForm={setBatchForm}
          setShowTemplateModal={(open) => {
            if (open) {
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
            }
            setShowTemplateModal(open);
          }}
          templates={templates}
          templatesLoading={templatesLoading}
        />
      )}

      {!isStudent && activeTab === "batch" && (
        <BatchBillingPanel
          batchForm={batchForm}
          batchProgress={batchProgress}
          classrooms={classrooms}
          handleApplyTemplateToBatch={handleApplyTemplateToBatch}
          handleRunBatchBilling={handleRunBatchBilling}
          setBatchForm={setBatchForm}
          students={students}
          submitting={submitting}
          templates={templates}
          batchResultSummary={batchResultSummary}
        />
      )}

      {showInvoiceModal && (
        <InvoiceModal
          handleApplyTemplateToSingle={handleApplyTemplateToSingle}
          handleSingleInvoiceSubmit={handleSingleInvoiceSubmit}
          invoiceForm={invoiceForm}
          setInvoiceForm={setInvoiceForm}
          setShowInvoiceModal={setShowInvoiceModal}
          students={students}
          submitting={submitting}
          templates={templates}
          gradeLevels={gradeLevels}
          requireTemplate={user?.role === "ACCOUNTANT"}
        />
      )}

      {showTemplateModal && (
        <TemplateModal
          handleCreateTemplate={handleCreateTemplate}
          setShowTemplateModal={setShowTemplateModal}
          setTemplateForm={setTemplateForm}
          templateForm={templateForm}
          submitting={submitting}
          gradeLevels={gradeLevels}
          divisions={divisions}
          isEditing={Boolean(templateForm.id)}
        />
      )}

      <AnimatePresence>
        {isDrawerOpen && selectedFee && (
          <FeeDetailDrawer
            handleCollectPayment={handleCollectPayment}
            handleVoidFee={handleVoidFee}
            handleWriteOffFee={handleWriteOffFee}
            handleDownloadReceipt={handleDownloadReceipt}
            handleStudentSelfPay={handleStudentSelfPay}
            isAdminOrAccountant={isAdminOrAccountant}
            isStudent={user?.role === "STUDENT"}
            isParent={user?.role === "PARENT"}
            payingFeeId={payingFeeId}
            selectedFee={selectedFee}
            setIsDrawerOpen={setIsDrawerOpen}
            schoolName={school?.name}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
