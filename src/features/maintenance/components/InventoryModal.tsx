import React from "react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";

export type InventoryModalProps = {
  handleCreateInventoryItem: (e: React.FormEvent) => void;
  inventoryForm: {
    name: string;
    category: string;
    quantity: string;
    unit: string;
    minQuantity: string;
  };
  setInventoryForm: (v: any) => void;
  setShowInventoryModal: (open: boolean) => void;
  submitting: boolean;
};

export function InventoryModal({
  handleCreateInventoryItem,
  inventoryForm,
  setInventoryForm,
  setShowInventoryModal,
  submitting,
}: InventoryModalProps) {
  return (
    <FeatureModalShell
      eyebrow="Facilities"
      title="Add inventory part"
      subtitle="Register a stock item for facilities use."
      onClose={() => setShowInventoryModal(false)}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowInventoryModal(false)}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="hub-inventory-form"
            disabled={submitting}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Add part"}
          </button>
        </div>
      }
    >
      <form
        id="hub-inventory-form"
        onSubmit={handleCreateInventoryItem}
        className="p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>Name</label>
          <input
            type="text"
            required
            value={inventoryForm.name}
            onChange={(e) =>
              setInventoryForm({ ...inventoryForm, name: e.target.value })
            }
            placeholder="e.g. Air filter"
            className={fieldInput}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>Category</label>
            <select
              value={inventoryForm.category}
              onChange={(e) =>
                setInventoryForm({ ...inventoryForm, category: e.target.value })
              }
              className={fieldInput}
            >
              <option value="HVAC">HVAC</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="SAFETY">Safety</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>Unit</label>
            <input
              type="text"
              value={inventoryForm.unit}
              onChange={(e) =>
                setInventoryForm({ ...inventoryForm, unit: e.target.value })
              }
              placeholder="pcs"
              className={fieldInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>Quantity</label>
            <input
              type="number"
              min="0"
              required
              value={inventoryForm.quantity}
              onChange={(e) =>
                setInventoryForm({ ...inventoryForm, quantity: e.target.value })
              }
              placeholder="0"
              className={`${fieldInput} font-mono`}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>Min quantity</label>
            <input
              type="number"
              min="0"
              required
              value={inventoryForm.minQuantity}
              onChange={(e) =>
                setInventoryForm({
                  ...inventoryForm,
                  minQuantity: e.target.value,
                })
              }
              placeholder="5"
              className={`${fieldInput} font-mono`}
            />
          </div>
        </div>
      </form>
    </FeatureModalShell>
  );
}
