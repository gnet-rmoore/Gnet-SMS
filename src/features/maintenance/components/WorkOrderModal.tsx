import React from "react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";

export type WorkOrderModalProps = {
  handleCreateWorkOrder: (e: React.FormEvent) => void;
  setShowWorkOrderModal: (open: boolean) => void;
  setWorkOrderForm: (v: any) => void;
  submitting: boolean;
  workOrderForm: {
    title: string;
    description: string;
    priority: string;
    location: string;
  };
};

export function WorkOrderModal({
  handleCreateWorkOrder,
  setShowWorkOrderModal,
  setWorkOrderForm,
  submitting,
  workOrderForm,
}: WorkOrderModalProps) {
  return (
    <FeatureModalShell
      eyebrow="Facilities"
      title="New work order"
      subtitle="Log a facility issue for assignment and tracking."
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
            {submitting ? "Saving…" : "Create"}
          </button>
        </div>
      }
    >
      <form
        id="hub-work-order-form"
        onSubmit={handleCreateWorkOrder}
        className="p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>Title</label>
          <input
            type="text"
            required
            value={workOrderForm.title}
            onChange={(e) =>
              setWorkOrderForm({ ...workOrderForm, title: e.target.value })
            }
            placeholder="e.g. Leak in science lab"
            className={fieldInput}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>Location</label>
            <input
              type="text"
              required
              value={workOrderForm.location}
              onChange={(e) =>
                setWorkOrderForm({ ...workOrderForm, location: e.target.value })
              }
              placeholder="e.g. Room 302"
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>Priority</label>
            <select
              value={workOrderForm.priority}
              onChange={(e) =>
                setWorkOrderForm({ ...workOrderForm, priority: e.target.value })
              }
              className={fieldInput}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>Description</label>
          <textarea
            required
            value={workOrderForm.description}
            onChange={(e) =>
              setWorkOrderForm({
                ...workOrderForm,
                description: e.target.value,
              })
            }
            rows={4}
            placeholder="What needs attention?"
            className={`${fieldInput} h-auto resize-none`}
          />
        </div>
      </form>
    </FeatureModalShell>
  );
}
