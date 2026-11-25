import React from "react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import type { StaffMember } from "../hooks/useMaintenanceQuery";

export type InventoryRecord = {
  id: string;
  name: string;
  itemType: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  sku?: string | null;
  location?: string | null;
  assetTag?: string | null;
  serialNumber?: string | null;
  condition?: string | null;
  assetStatus?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
};

export type InventoryMovementRecord = {
  id: string;
  movementType: string;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  reference?: string | null;
  performedBy: string;
  createdAt: string;
  previousCondition?: string | null;
  newCondition?: string | null;
  previousAssetStatus?: string | null;
  newAssetStatus?: string | null;
  previousAssignedTo?: string | null;
  newAssignedTo?: string | null;
};

export type InventoryActionModalProps = {
  history: InventoryMovementRecord[];
  historyError: string | null;
  historyLoading: boolean;
  item: InventoryRecord;
  onClose: () => void;
  onMoveStock: (
    item: InventoryRecord,
    data: {
      movementType: string;
      quantity?: string;
      quantityDelta?: number;
      reason: string;
      reference: string;
      unitCost: string;
    }
  ) => void;
  onUpdateAsset: (
    item: InventoryRecord,
    data: {
      assignedTo: string | null;
      assetStatus: string;
      condition: string;
      reason: string;
    }
  ) => void;
  staff: StaffMember[];
  submitting: boolean;
};

export function InventoryActionModal({
  history,
  historyError,
  historyLoading,
  item,
  onClose,
  onMoveStock,
  onUpdateAsset,
  staff,
  submitting,
}: InventoryActionModalProps) {
  const isAsset = item.itemType === "ASSET";
  const [movementType, setMovementType] = React.useState("RECEIVE");
  const [quantity, setQuantity] = React.useState("1");
  const [adjustmentDirection, setAdjustmentDirection] = React.useState("DECREASE");
  const [reason, setReason] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [unitCost, setUnitCost] = React.useState("");
  const [assignedTo, setAssignedTo] = React.useState(item.assignedTo || "");
  const [assetStatus, setAssetStatus] = React.useState(item.assetStatus || "AVAILABLE");
  const [condition, setCondition] = React.useState(item.condition || "GOOD");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isAsset) {
      onUpdateAsset(item, {
        assignedTo: assignedTo || null,
        assetStatus,
        condition,
        reason,
      });
      return;
    }
    const units = Number(quantity);
    onMoveStock(item, {
      movementType,
      ...(movementType === "ADJUSTMENT"
        ? { quantityDelta: units * (adjustmentDirection === "INCREASE" ? 1 : -1) }
        : { quantity }),
      reason,
      reference,
      unitCost,
    });
  };

  return (
    <FeatureModalShell
      eyebrow="Inventory control"
      title={isAsset ? item.name : `Stock activity · ${item.name}`}
      subtitle={
        isAsset
          ? `${item.assetTag || "No asset tag"}${item.serialNumber ? ` · ${item.serialNumber}` : ""}`
          : `Current balance: ${item.quantity} ${item.unit}`
      }
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="submit"
            form="inventory-action-form"
            disabled={submitting}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          >
            {submitting ? "Saving…" : isAsset ? "Save asset update" : "Record movement"}
          </button>
        </div>
      }
    >
      <form
        id="inventory-action-form"
        onSubmit={submit}
        className="p-6 sm:p-8 space-y-5"
      >
        {isAsset ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="asset-status">Asset status</label>
                <select
                  id="asset-status"
                  value={assetStatus}
                  onChange={(e) => {
                    setAssetStatus(e.target.value);
                    if (e.target.value !== "ASSIGNED") setAssignedTo("");
                  }}
                  className={fieldInput}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="ASSIGNED">Assigned / checked out</option>
                  <option value="UNDER_REPAIR">Under repair</option>
                  <option value="RETIRED">Retired</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="asset-condition">Condition</label>
                <select
                  id="asset-condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className={fieldInput}
                >
                  <option value="NEW">New</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              </div>
            </div>
            {assetStatus === "ASSIGNED" && (
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="asset-assignee">Assigned to</label>
                <select
                  id="asset-assignee"
                  required
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={fieldInput}
                >
                  <option value="">Select staff member</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.role}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="asset-reason">Reason / custody note</label>
              <textarea
                id="asset-reason"
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className={`${fieldInput} h-auto resize-y`}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="movement-type">Movement</label>
                <select
                  id="movement-type"
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className={fieldInput}
                >
                  <option value="RECEIVE">Receive stock</option>
                  <option value="ISSUE">Issue stock</option>
                  <option value="RETURN">Return to stock</option>
                  <option value="ADJUSTMENT">Count adjustment</option>
                </select>
              </div>
              {movementType === "ADJUSTMENT" && (
                <div className="space-y-1.5">
                  <label className={fieldLabel} htmlFor="adjustment-direction">Adjustment direction</label>
                  <select
                    id="adjustment-direction"
                    value={adjustmentDirection}
                    onChange={(e) => setAdjustmentDirection(e.target.value)}
                    className={fieldInput}
                  >
                    <option value="DECREASE">Decrease</option>
                    <option value="INCREASE">Increase</option>
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="movement-quantity">Quantity</label>
                <input
                  id="movement-quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={`${fieldInput} font-mono`}
                />
              </div>
              {movementType === "RECEIVE" && (
                <div className="space-y-1.5">
                  <label className={fieldLabel} htmlFor="movement-unit-cost">Received unit cost (optional)</label>
                  <input
                    id="movement-unit-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className={`${fieldInput} font-mono`}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="movement-reason">Reason</label>
                <input
                  id="movement-reason"
                  type="text"
                  required
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={fieldInput}
                />
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="movement-reference">Reference (optional)</label>
                <input
                  id="movement-reference"
                  type="text"
                  maxLength={120}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Invoice, work order, or delivery note"
                  className={fieldInput}
                />
              </div>
            </div>
          </>
        )}

        <section className="border-t border-slate-100 pt-4">
          <h3 className="font-bold text-sm text-slate-900">Audit history</h3>
          {historyLoading ? (
            <p className="text-sm text-slate-500 mt-2">Loading item history…</p>
          ) : historyError ? (
            <p className="text-sm text-rose-600 mt-2">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">No recorded history.</p>
          ) : (
            <ol className="mt-3 space-y-3 max-h-52 overflow-y-auto pr-1">
              {history.map((event) => (
                <li key={event.id} className="border-l-2 border-indigo-200 pl-3">
                  <div className="flex justify-between gap-3">
                    <span className="text-xs font-bold text-slate-800">
                      {event.movementType.replace(/_/g, " ")}
                    </span>
                    <time className="text-[11px] text-slate-500 shrink-0">
                      {new Date(event.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{event.reason}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isAsset
                      ? `${event.previousAssetStatus || "—"} → ${event.newAssetStatus || "—"} · actor ${event.performedBy}`
                      : `${event.quantityBefore} → ${event.quantityAfter} ${item.unit} · actor ${event.performedBy}`}
                    {event.reference ? ` · ${event.reference}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </form>
    </FeatureModalShell>
  );
}
