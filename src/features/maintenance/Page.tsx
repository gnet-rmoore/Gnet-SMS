import React, { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Activity, Package, Wrench } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { confirmAction } from "../../lib/swal";
import { useMaintenanceQuery } from "./hooks/useMaintenanceQuery";
import { maintenanceApi } from "./api";
import { WorkOrderModal } from "./components/WorkOrderModal";
import { InventoryModal } from "./components/InventoryModal";
import { DashboardTab } from "./components/DashboardTab";
import { WorkOrdersTab } from "./components/WorkOrdersTab";
import { InventoryTab } from "./components/InventoryTab";
import { MaintenanceChrome } from "./components/MaintenanceChrome";
import { HubWorkOrderDrawer } from "./components/HubWorkOrderDrawer";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useTranslation } from "react-i18next";

type HubTab = "DASHBOARD" | "WORK_ORDERS" | "INVENTORY";

const TAB_QUERY: Record<string, HubTab> = {
  overview: "DASHBOARD",
  "work-orders": "WORK_ORDERS",
  inventory: "INVENTORY",
};

const TAB_TO_QUERY: Record<HubTab, string> = {
  DASHBOARD: "overview",
  WORK_ORDERS: "work-orders",
  INVENTORY: "inventory",
};

const emptyWoForm = () => ({
  title: "",
  description: "",
  priority: "MEDIUM",
  location: "",
});

const emptyInvForm = () => ({
  name: "",
  category: "HVAC",
  quantity: "",
  unit: "pcs",
  minQuantity: "",
});

export const Maintenance = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    workOrders,
    inventory,
    staff,
    loading,
    invalidate: refetch,
  } = useMaintenanceQuery();

  const tabFromUrl = TAB_QUERY[searchParams.get("tab") || ""] || "DASHBOARD";
  const [activeTab, setActiveTabState] = useState<HubTab>(tabFromUrl);

  const setActiveTab = (tab: HubTab) => {
    setActiveTabState(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "DASHBOARD") next.delete("tab");
    else next.set("tab", TAB_TO_QUERY[tab]);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setActiveTabState(tabFromUrl);
  }, [tabFromUrl]);

  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [workOrderForm, setWorkOrderForm] = useState(emptyWoForm);
  const [inventoryForm, setInventoryForm] = useState(emptyInvForm);

  const [woSearch, setWoSearch] = useState("");
  const [woStatusFilter, setWoStatusFilter] = useState("ALL");
  const [woPriorityFilter, setWoPriorityFilter] = useState("ALL");
  const [invCategoryFilter, setInvCategoryFilter] = useState("ALL");
  const [invSearch, setInvSearch] = useState("");

  useEffect(() => {
    if (!selectedOrder) return;
    const fresh = workOrders.find((o) => o.id === selectedOrder.id);
    if (fresh) setSelectedOrder(fresh);
    else setSelectedOrder(null);
  }, [workOrders]); // eslint-disable-line react-hooks/exhaustive-deps

  const canManage = [
    "SCHOOL_ADMIN",
    "PRINCIPAL",
    "VPA",
    "MAINTENANCE",
    "SUPER_ADMIN",
  ].includes(user?.role || "");

  const technicians = staff.filter(
    (s) =>
      s.isActive !== false &&
      ["MAINTENANCE", "SCHOOL_ADMIN", "PRINCIPAL", "VPA"].includes(s.role)
  );

  const maintenanceStaff = staff.filter(
    (s) => s.isActive !== false && s.role === "MAINTENANCE"
  );

  const staffJobCounts: Record<string, number> = {};
  for (const o of workOrders) {
    if (
      o.assignedTo &&
      (o.status === "OPEN" || o.status === "IN_PROGRESS")
    ) {
      staffJobCounts[o.assignedTo] = (staffJobCounts[o.assignedTo] || 0) + 1;
    }
  }

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    setSubmitting(true);
    try {
      await maintenanceApi.createWorkOrder(school.id, {
        title: workOrderForm.title.trim(),
        description: workOrderForm.description.trim(),
        priority: workOrderForm.priority,
        location: workOrderForm.location.trim(),
      });
      setShowWorkOrderModal(false);
      setWorkOrderForm(emptyWoForm());
      showToast(t("facilities.toast.workOrderCreated"), "success");
      refetch();
      setActiveTab("WORK_ORDERS");
    } catch (err: any) {
      showToast(err?.message || t("facilities.toast.workOrderCreateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (status === "COMPLETED" || status === "CANCELLED") {
      const ok = await confirmAction({
        title:
          status === "COMPLETED"
            ? t("facilities.confirm.completeTitle")
            : t("facilities.confirm.cancelTitle"),
        text:
          status === "COMPLETED"
            ? t("facilities.confirm.completeText")
            : t("facilities.confirm.cancelText"),
        confirmText:
          status === "COMPLETED"
            ? t("facilities.confirm.completeConfirm")
            : t("facilities.confirm.cancelConfirm"),
        danger: status === "CANCELLED",
      });
      if (!ok) return;
    }

    setUpdatingId(id);
    try {
      await maintenanceApi.updateWorkOrder(id, { status });
      showToast(
        t("facilities.toast.statusSet", {
          status: status.replace("_", " ").toLowerCase(),
        }),
        "success"
      );
      refetch();
    } catch (err: any) {
      showToast(err?.message || t("facilities.toast.updateStatusFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignTechnician = async (
    orderId: string,
    technicianId: string
  ) => {
    setUpdatingId(orderId);
    try {
      const payload: { assignedTo: string | null; status?: string } = {
        assignedTo: technicianId || null,
      };
      const current = workOrders.find((o) => o.id === orderId);
      if (technicianId && current?.status === "OPEN") {
        payload.status = "IN_PROGRESS";
      }
      await maintenanceApi.updateWorkOrder(orderId, payload);
      showToast(technicianId ? t("facilities.toast.staffAssigned") : t("facilities.toast.assigneeCleared"), "success");
      refetch();
    } catch (err: any) {
      showToast(err?.message || t("facilities.toast.assignFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    setSubmitting(true);
    try {
      await maintenanceApi.createInventory(school.id, {
        name: inventoryForm.name.trim(),
        category: inventoryForm.category,
        quantity: inventoryForm.quantity,
        unit: inventoryForm.unit || "pcs",
        minQuantity: inventoryForm.minQuantity || "0",
      });
      setShowInventoryModal(false);
      setInventoryForm(emptyInvForm());
      showToast(t("facilities.toast.inventoryAdded"), "success");
      refetch();
      setActiveTab("INVENTORY");
    } catch (err: any) {
      showToast(err?.message || t("facilities.toast.inventoryAddFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestockInventory = async (item: any, amount: number) => {
    const newQty = Math.max(0, Number(item.quantity) + amount);
    try {
      await maintenanceApi.updateInventory(item.id, { quantity: newQty });
      showToast(t("facilities.toast.inventoryUpdated", { name: item.name }), "success");
      refetch();
    } catch (err: any) {
      showToast(err?.message || t("facilities.toast.inventoryUpdateFailed"), "error");
    }
  };

  const filteredWorkOrders = workOrders.filter((order) => {
    const q = woSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      order.title.toLowerCase().includes(q) ||
      order.description.toLowerCase().includes(q) ||
      (order.location || "").toLowerCase().includes(q);
    const matchStatus =
      woStatusFilter === "ALL" || order.status === woStatusFilter;
    const matchPriority =
      woPriorityFilter === "ALL" || order.priority === woPriorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const filteredInventory = inventory.filter((item) => {
    const q = invSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    const matchCategory =
      invCategoryFilter === "ALL" || item.category === invCategoryFilter;
    return matchSearch && matchCategory;
  });

  const openWOs = workOrders.filter((o) => o.status === "OPEN").length;
  const inProgressWOs = workOrders.filter(
    (o) => o.status === "IN_PROGRESS"
  ).length;
  const completedWOs = workOrders.filter((o) => o.status === "COMPLETED").length;
  const lowStockItems = inventory.filter(
    (i) => Number(i.quantity) <= Number(i.minQuantity)
  ).length;

  const recentOrders = [...workOrders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const tabs = [
    { id: "DASHBOARD" as const, label: t("facilities.tabs.overview"), icon: Activity },
    { id: "WORK_ORDERS" as const, label: t("facilities.tabs.workOrders"), icon: Wrench },
    { id: "INVENTORY" as const, label: t("facilities.tabs.inventory"), icon: Package },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <MaintenanceChrome
        canManage={canManage}
        loading={loading}
        onAddInventory={() => {
          setInventoryForm(emptyInvForm());
          setShowInventoryModal(true);
        }}
        onNewWorkOrder={() => {
          setWorkOrderForm(emptyWoForm());
          setShowWorkOrderModal(true);
        }}
        onRefresh={() => refetch()}
        staffCount={maintenanceStaff.length}
        totalInventory={inventory.length}
        totalWorkOrders={workOrders.length}
        title={t("facilities.title")}
        subtitle={t("facilities.subtitle")}
      />

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "DASHBOARD" && (
        <DashboardTab
          completedWOs={completedWOs}
          inProgressWOs={inProgressWOs}
          lowStockItems={lowStockItems}
          maintenanceStaff={maintenanceStaff}
          openWOs={openWOs}
          recentOrders={recentOrders}
          setActiveTab={(t) => setActiveTab(t as HubTab)}
          setSelectedOrder={setSelectedOrder}
          setWoStatusFilter={setWoStatusFilter}
          staffJobCounts={staffJobCounts}
        />
      )}

      {activeTab === "WORK_ORDERS" && (
        <WorkOrdersTab
          canManage={canManage}
          filteredWorkOrders={filteredWorkOrders}
          handleAssignTechnician={handleAssignTechnician}
          handleUpdateStatus={handleUpdateStatus}
          loading={loading}
          setSelectedOrder={setSelectedOrder}
          setWoPriorityFilter={setWoPriorityFilter}
          setWoSearch={setWoSearch}
          setWoStatusFilter={setWoStatusFilter}
          technicians={technicians}
          updatingId={updatingId}
          woPriorityFilter={woPriorityFilter}
          woSearch={woSearch}
          woStatusFilter={woStatusFilter}
        />
      )}

      {activeTab === "INVENTORY" && (
        <InventoryTab
          canManage={canManage}
          filteredInventory={filteredInventory}
          handleRestockInventory={handleRestockInventory}
          invCategoryFilter={invCategoryFilter}
          invSearch={invSearch}
          loading={loading}
          setInvCategoryFilter={setInvCategoryFilter}
          setInvSearch={setInvSearch}
          setShowInventoryModal={(open) => {
            if (open) setInventoryForm(emptyInvForm());
            setShowInventoryModal(open);
          }}
        />
      )}

      <AnimatePresence>
        {showWorkOrderModal && (
          <WorkOrderModal
            handleCreateWorkOrder={handleCreateWorkOrder}
            setShowWorkOrderModal={setShowWorkOrderModal}
            setWorkOrderForm={setWorkOrderForm}
            submitting={submitting}
            workOrderForm={workOrderForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInventoryModal && (
          <InventoryModal
            handleCreateInventoryItem={handleCreateInventoryItem}
            inventoryForm={inventoryForm}
            setInventoryForm={setInventoryForm}
            setShowInventoryModal={setShowInventoryModal}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOrder && (
          <HubWorkOrderDrawer
            canManage={canManage}
            handleAssignTechnician={handleAssignTechnician}
            handleUpdateStatus={handleUpdateStatus}
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            technicians={technicians}
            updatingId={updatingId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
