import React, { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useAuthStore } from "../../store/authStore";
import { useWorkOrdersQuery } from "./hooks/useWorkOrdersQuery";
import { workOrdersApi } from "./api";
import { WorkOrderDetailPanel } from "./components/WorkOrderDetailPanel";
import { CreateWorkOrderModal } from "./components/CreateWorkOrderModal";
import { WorkOrdersChrome } from "./components/WorkOrdersChrome";
import { WorkOrdersList } from "./components/WorkOrdersList";
import {
  emptyWorkOrderForm,
  type WorkOrder,
  type WorkOrderForm,
} from "./types";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  canManageWorkOrders,
  isAssignableRole,
  priorityLabel,
  priorityWeight,
  statusLabel,
} from "./utils";
import { confirmAction } from "../../lib/swal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useTranslation } from "react-i18next";
import { useListFilters, type FilterFieldDef } from "../list-filters";

export const WorkOrders = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const {
    workOrders,
    staff,
    loading,
    invalidate: refetchWorkOrders,
  } = useWorkOrdersQuery();

  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const [sortBy, setSortBy] = useState<"NEWEST" | "PRIORITY">("NEWEST");
  const [form, setForm] = useState<WorkOrderForm>(emptyWorkOrderForm);

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "status",
        label: t("common:status"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: STATUS_OPTIONS.map((s) => ({ value: s.key, label: statusLabel(s.key, t) })),
      },
      {
        key: "priority",
        label: t("workOrders.filters.priority"),
        type: "enum",
        primary: true,
        allLabel: t("workOrders.list.allPriorities"),
        options: [
          { value: "HIGH_OR_URGENT", label: t("workOrders.list.highUrgentFilter") },
          ...PRIORITY_OPTIONS.map((p) => ({ value: p.key, label: priorityLabel(p.key, t) })),
        ],
      },
      {
        key: "unassigned",
        label: t("workOrders.list.unassigned"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [{ value: "true", label: t("workOrders.list.unassigned") }],
      },
    ],
    [t]
  );
  const filters = useListFilters({ fields: filterFields, syncUrl: true });
  const statusFilter = filters.values.status || "ALL";
  const priorityFilter = filters.values.priority || "ALL";
  const unassignedOnly = filters.values.unassigned === "true";

  const canManage = canManageWorkOrders(user?.role);
  const slug = school?.slug || "";

  const assignablePersonnel = staff.filter(
    (s) => s.isActive !== false && isAssignableRole(s.role)
  );

  const clearFilters = () => {
    filters.clear();
  };

  const hasActiveFilters = filters.hasActiveFilters;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      showToast(t("workOrders.toast.fillRequired"), "error");
      return;
    }
    setSubmitting(true);
    try {
      await workOrdersApi.createWorkOrder(school.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        location: form.location.trim(),
        ...(form.assignedTo ? { assignedTo: form.assignedTo } : {}),
      });
      showToast(
        form.assignedTo
          ? t("workOrders.toast.createdAssigned")
          : t("workOrders.toast.created"),
        "success"
      );
      setForm(emptyWorkOrderForm());
      setShowCreateModal(false);
      refetchWorkOrders();
    } catch (err: any) {
      showToast(err?.message || t("workOrders.toast.createFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    if (status === "COMPLETED") {
      const ok = await confirmAction({
        title: t("workOrders.confirm.completeTitle"),
        text: t("workOrders.confirm.completeText"),
        confirmText: t("workOrders.confirm.completeConfirm"),
      });
      if (!ok) return;
    }

    setUpdatingId(orderId);
    try {
      const updated = await workOrdersApi.updateWorkOrder(orderId, { status });
      showToast(t("workOrders.toast.statusSet", { status: statusLabel(status, t).toLowerCase() }), "success");
      await refetchWorkOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
                requester: prev.requester,
                assignee: prev.assignee,
                status,
              }
            : prev
        );
      }
    } catch (err: any) {
      showToast(err?.message || t("workOrders.toast.updateStatusFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdatePriority = async (orderId: string, priority: string) => {
    setUpdatingId(orderId);
    try {
      const updated = await workOrdersApi.updateWorkOrder(orderId, { priority });
      showToast(t("workOrders.toast.priorityUpdated"), "success");
      await refetchWorkOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
                requester: prev.requester,
                assignee: prev.assignee,
                priority,
              }
            : prev
        );
      }
    } catch (err: any) {
      showToast(err?.message || t("workOrders.toast.updatePriorityFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignTechnician = async (
    orderId: string,
    assigneeId: string
  ) => {
    setUpdatingId(orderId);
    try {
      const payload: { assignedTo: string | null; status?: string } = {
        assignedTo: assigneeId || null,
      };
      const current = workOrders.find((o) => o.id === orderId);
      if (assigneeId && current?.status === "OPEN") {
        payload.status = "IN_PROGRESS";
      }
      const updated = await workOrdersApi.updateWorkOrder(orderId, payload);
      showToast(
        assigneeId ? t("workOrders.toast.staffAssigned") : t("workOrders.toast.assigneeCleared"),
        "success"
      );
      await refetchWorkOrders();
      if (selectedOrder?.id === orderId) {
        const person = assignablePersonnel.find((s) => s.id === assigneeId);
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
                assignedTo: assigneeId || null,
                status: payload.status || prev.status,
                requester: prev.requester,
                assignee: person
                  ? { id: person.id, name: person.name, role: person.role }
                  : null,
              }
            : prev
        );
      }
    } catch (err: any) {
      showToast(err?.message || t("workOrders.toast.assignFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = workOrders
    .filter((order) => {
      const q = filters.committedQ.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.title.toLowerCase().includes(q) ||
        order.description.toLowerCase().includes(q) ||
        (order.location || "").toLowerCase().includes(q) ||
        (order.requester?.name || "").toLowerCase().includes(q) ||
        (order.assignee?.name || "").toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;
      const matchesPriority =
        priorityFilter === "ALL" ||
        (priorityFilter === "HIGH_OR_URGENT"
          ? order.priority === "HIGH" || order.priority === "URGENT"
          : order.priority === priorityFilter);
      const matchesUnassigned =
        !unassignedOnly || !order.assignedTo;
      return matchesSearch && matchesStatus && matchesPriority && matchesUnassigned;
    })
    .sort((a, b) => {
      if (sortBy === "PRIORITY") {
        return priorityWeight(b.priority) - priorityWeight(a.priority);
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

  const stats = {
    total: workOrders.length,
    open: workOrders.filter((o) => o.status === "OPEN").length,
    inProgress: workOrders.filter((o) => o.status === "IN_PROGRESS").length,
    completed: workOrders.filter((o) => o.status === "COMPLETED").length,
    highSeverity: workOrders.filter(
      (o) => o.priority === "URGENT" || o.priority === "HIGH"
    ).length,
    unassigned: workOrders.filter(
      (o) => !o.assignedTo && o.status !== "COMPLETED"
    ).length,
  };

  const onStatFilter = (
    kind: "ALL" | "OPEN" | "IN_PROGRESS" | "HIGH" | "COMPLETED" | "UNASSIGNED"
  ) => {
    filters.clear();
    if (kind === "ALL") return;
    if (kind === "HIGH") {
      filters.setValue("priority", "HIGH_OR_URGENT");
      return;
    }
    if (kind === "UNASSIGNED") {
      filters.setValue("unassigned", "true");
      return;
    }
    filters.setValue("status", kind);
  };

  const openSelected = (order: WorkOrder) => {
    const fresh = workOrders.find((o) => o.id === order.id) || order;
    setSelectedOrder(fresh);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <WorkOrdersChrome
        canCreate={canManage}
        loading={loading}
        onCreate={() => {
          setForm(emptyWorkOrderForm());
          setShowCreateModal(true);
        }}
        onRefresh={() => refetchWorkOrders()}
        openCount={stats.open}
        slug={slug}
        title={t("workOrders.title")}
        subtitle={t("workOrders.subtitle")}
      />

      <WorkOrdersList
        filteredOrders={filteredOrders}
        hasActiveFilters={hasActiveFilters}
        loading={loading}
        onClearFilters={clearFilters}
        onSelect={openSelected}
        onStatFilter={onStatFilter}
        priorityFilter={priorityFilter}
        selectedId={selectedOrder?.id || null}
        setSortBy={setSortBy}
        sortBy={sortBy}
        stats={stats}
        statusFilter={statusFilter}
        totalOrders={workOrders.length}
        unassignedOnly={unassignedOnly}
        filterFields={filterFields}
        filters={filters}
        savedViewsScope={school?.id ? `${school.id}:work-orders` : undefined}
      />

      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkOrderModal
            assignablePersonnel={assignablePersonnel}
            form={form}
            handleSubmit={handleSubmit}
            setForm={setForm}
            setShowCreateModal={setShowCreateModal}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOrder && (
          <WorkOrderDetailPanel
            assignablePersonnel={assignablePersonnel}
            canManage={canManage}
            handleAssignTechnician={handleAssignTechnician}
            handleUpdatePriority={handleUpdatePriority}
            handleUpdateStatus={handleUpdateStatus}
            selectedOrder={
              workOrders.find((o) => o.id === selectedOrder.id) || selectedOrder
            }
            setSelectedOrder={setSelectedOrder}
            updatingId={updatingId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
