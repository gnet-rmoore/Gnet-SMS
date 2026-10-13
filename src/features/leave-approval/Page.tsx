import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useAuthStore } from "../../store/authStore";
import { useLeaveApprovalQuery } from "./hooks/useLeaveApprovalQuery";
import { leaveApprovalApi } from "./api";
import { LeaveApprovalChrome } from "./components/LeaveApprovalChrome";
import { LeaveRequestsList } from "./components/LeaveRequestsList";
import { LeaveDetailDrawer } from "./components/LeaveDetailDrawer";
import type { LeaveRequest } from "./types";
import { canApproveLeave, formatLeaveType } from "./utils";
import { confirmAction } from "../../lib/swal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useTranslation } from "react-i18next";
import { useListFilters, type FilterFieldDef } from "../list-filters";

export const LeaveApproval = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { user, school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const {
    requests,
    loading,
    invalidate: refetch,
  } = useLeaveApprovalQuery();

  const leaveTypeOptions = useMemo(
    () =>
      Array.from(new Set(requests.map((r) => r.type).filter(Boolean))).map((type) => ({
        value: type,
        label: formatLeaveType(type),
      })),
    [requests]
  );

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "status",
        label: t("common:status"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [
          { value: "PENDING", label: t("leaveApproval.pending") },
          { value: "APPROVED", label: t("leaveApproval.approved") },
          { value: "REJECTED", label: t("leaveApproval.rejected") },
        ],
      },
      {
        key: "type",
        label: t("leaveApproval.type", { defaultValue: "Type" }),
        type: "enum",
        allLabel: t("common:all"),
        options: leaveTypeOptions,
      },
    ],
    [t, leaveTypeOptions]
  );
  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  // Default to showing pending requests on first load (unless the URL already set a status).
  useEffect(() => {
    if (!filters.values.status) filters.setValue("status", "PENDING");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  const canApprove = canApproveLeave(user?.role);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    approved: requests.filter((r) => r.status === "APPROVED").length,
    rejected: requests.filter((r) => r.status === "REJECTED").length,
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = !filters.values.status || req.status === filters.values.status;
    const matchesType = !filters.values.type || req.type === filters.values.type;
    const q = filters.committedQ.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (req.user?.name || "").toLowerCase().includes(q) ||
      (req.type || "").toLowerCase().includes(q) ||
      (req.user?.role || "").toLowerCase().includes(q);
    return matchesStatus && matchesType && matchesSearch;
  });

  const handleDecide = async (
    id: string,
    status: "APPROVED" | "REJECTED",
    comment: string
  ) => {
    if (!canApprove) {
      showToast(t("leaveApproval.toast.noPermission"), "error");
      return;
    }

    if (status === "REJECTED") {
      const ok = await confirmAction({
        title: t("leaveApproval.confirm.rejectTitle"),
        text: t("leaveApproval.confirm.rejectText"),
        confirmText: t("leaveApproval.confirm.rejectConfirm"),
        danger: true,
      });
      if (!ok) return;
    } else {
      const ok = await confirmAction({
        title: t("leaveApproval.confirm.approveTitle"),
        text: t("leaveApproval.confirm.approveText"),
        confirmText: t("leaveApproval.confirm.approveConfirm"),
      });
      if (!ok) return;
    }

    setProcessing(true);
    try {
      await leaveApprovalApi.updateLeaveStatus(id, {
        status,
        ...(comment ? { comment } : {}),
      });
      showToast(
        status === "APPROVED" ? t("leaveApproval.toast.approved") : t("leaveApproval.toast.rejected"),
        status === "APPROVED" ? "success" : "info"
      );
      setSelected(null);
      refetch();
    } catch (err: any) {
      showToast(err?.message || t("leaveApproval.toast.updateFailed"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const selectedFresh =
    (selected && requests.find((r) => r.id === selected.id)) || selected;

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <LeaveApprovalChrome
        loading={loading}
        onRefresh={() => refetch()}
        pendingCount={stats.pending}
        title={t("leaveApproval.title")}
        subtitle={t("leaveApproval.subtitle")}
      />

      <LeaveRequestsList
        filteredRequests={filteredRequests}
        loading={loading}
        onClearFilters={() => {
          filters.clear();
          filters.setValue("status", "PENDING");
        }}
        onSelect={setSelected}
        filterFields={filterFields}
        filters={filters}
        stats={stats}
        savedViewsScope={school?.id ? `${school.id}:leave-requests` : undefined}
      />

      <AnimatePresence>
        {selectedFresh && (
          <LeaveDetailDrawer
            canApprove={canApprove}
            onClose={() => setSelected(null)}
            onDecide={handleDecide}
            processing={processing}
            request={selectedFresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
