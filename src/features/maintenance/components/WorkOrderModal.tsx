import React from "react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import type { StaffMember } from "../hooks/useMaintenanceQuery";

export type WorkOrderForm = {
  title: string;
  description: string;
  requestType: string;
  priority: string;
  impact: string;
  location: string;
  building: string;
  room: string;
  dueAt: string;
  safetyRelated: boolean;
  safetyNotes: string;
  accessNotes: string;
  estimatedCost: string;
  inventoryItemId: string;
  assignedTo: string;
};

export type WorkOrderAssetOption = {
  id: string;
  name: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  assetStatus?: string | null;
};

export type WorkOrderModalProps = {
  assets: WorkOrderAssetOption[];
  handleCreateWorkOrder: (e: React.FormEvent) => void;
  setShowWorkOrderModal: (open: boolean) => void;
  setWorkOrderForm: React.Dispatch<React.SetStateAction<WorkOrderForm>>;
  submitting: boolean;
  technicians: StaffMember[];
  workOrderForm: WorkOrderForm;
};

export function WorkOrderModal({
  assets,
  handleCreateWorkOrder,
  setShowWorkOrderModal,
  setWorkOrderForm,
  submitting,
  technicians,
  workOrderForm,
}: WorkOrderModalProps) {
  return (
    <FeatureModalShell
      eyebrow="Facilities"
      title="New work order"
      subtitle="Capture the issue, safety impact, location, asset, and response plan."
      onClose={() => setShowWorkOrderModal(false)}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowWorkOrderModal(false)}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="hub-work-order-form"
            disabled={submitting}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Create work order"}
          </button>
        </div>
      }
    >
      <form
        id="hub-work-order-form"
        onSubmit={handleCreateWorkOrder}
        className="p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-type">Request type</label>
            <select
              id="work-order-type"
              value={workOrderForm.requestType}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, requestType: e.target.value }))
              }
              className={fieldInput}
            >
              <option value="REPAIR">Repair</option>
              <option value="INSPECTION">Inspection</option>
              <option value="PREVENTIVE">Preventive maintenance</option>
              <option value="INSTALLATION">Installation</option>
              <option value="CLEANING">Cleaning</option>
              <option value="SAFETY">Safety</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-title">Title</label>
            <input
              id="work-order-title"
              type="text"
              required
              maxLength={160}
              value={workOrderForm.title}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, title: e.target.value }))
              }
              placeholder="e.g. Leak in science lab"
              className={fieldInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-priority">Priority</label>
            <select
              id="work-order-priority"
              value={workOrderForm.priority}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, priority: e.target.value }))
              }
              className={fieldInput}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-impact">Operational impact</label>
            <select
              id="work-order-impact"
              value={workOrderForm.impact}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, impact: e.target.value }))
              }
              className={fieldInput}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-due">Target completion</label>
            <input
              id="work-order-due"
              type="datetime-local"
              value={workOrderForm.dueAt}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, dueAt: e.target.value }))
              }
              className={fieldInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-location">Location / area</label>
            <input
              id="work-order-location"
              type="text"
              required
              maxLength={240}
              value={workOrderForm.location}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, location: e.target.value }))
              }
              placeholder="e.g. North wing"
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-building">Building</label>
            <input
              id="work-order-building"
              type="text"
              maxLength={120}
              value={workOrderForm.building}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, building: e.target.value }))
              }
              placeholder="e.g. Science block"
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-room">Room</label>
            <input
              id="work-order-room"
              type="text"
              maxLength={120}
              value={workOrderForm.room}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, room: e.target.value }))
              }
              placeholder="e.g. 302"
              className={fieldInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-asset">Related equipment asset</label>
            <select
              id="work-order-asset"
              value={workOrderForm.inventoryItemId}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, inventoryItemId: e.target.value }))
              }
              className={fieldInput}
            >
              <option value="">No asset linked</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} · {asset.assetTag || asset.serialNumber || asset.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-assignee">Assign technician</label>
            <select
              id="work-order-assignee"
              value={workOrderForm.assignedTo}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, assignedTo: e.target.value }))
              }
              className={fieldInput}
            >
              <option value="">Unassigned</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name} · {technician.role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} htmlFor="work-order-description">Issue and requested work</label>
          <textarea
            id="work-order-description"
            required
            maxLength={5000}
            value={workOrderForm.description}
            onChange={(e) =>
              setWorkOrderForm((form) => ({ ...form, description: e.target.value }))
            }
            rows={4}
            placeholder="Describe the issue, symptoms, and work needed."
            className={`${fieldInput} h-auto resize-y`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={workOrderForm.safetyRelated}
              onChange={(e) =>
                setWorkOrderForm((form) => ({
                  ...form,
                  safetyRelated: e.target.checked,
                  safetyNotes: e.target.checked ? form.safetyNotes : "",
                }))
              }
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Safety-related work
          </label>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-estimate">Estimated cost (optional)</label>
            <input
              id="work-order-estimate"
              type="number"
              min="0"
              step="0.01"
              value={workOrderForm.estimatedCost}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, estimatedCost: e.target.value }))
              }
              className={`${fieldInput} font-mono`}
            />
          </div>
        </div>

        {workOrderForm.safetyRelated && (
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="work-order-safety-notes">Hazard / safety notes</label>
            <textarea
              id="work-order-safety-notes"
              required
              maxLength={2000}
              value={workOrderForm.safetyNotes}
              onChange={(e) =>
                setWorkOrderForm((form) => ({ ...form, safetyNotes: e.target.value }))
              }
              rows={2}
              className={`${fieldInput} h-auto resize-y`}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className={fieldLabel} htmlFor="work-order-access">Access instructions</label>
          <textarea
            id="work-order-access"
            maxLength={2000}
            value={workOrderForm.accessNotes}
            onChange={(e) =>
              setWorkOrderForm((form) => ({ ...form, accessNotes: e.target.value }))
            }
            rows={2}
            placeholder="Entry, scheduling, or access constraints."
            className={`${fieldInput} h-auto resize-y`}
          />
        </div>
      </form>
    </FeatureModalShell>
  );
}
