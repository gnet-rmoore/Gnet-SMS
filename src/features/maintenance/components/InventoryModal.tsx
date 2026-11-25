import React from "react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";

export type InventoryForm = {
  itemType: "CONSUMABLE" | "ASSET";
  name: string;
  sku: string;
  description: string;
  category: string;
  quantity: string;
  unit: string;
  minQuantity: string;
  location: string;
  supplier: string;
  unitCost: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  assetTag: string;
  condition: string;
  purchaseDate: string;
  warrantyExpiresAt: string;
  notes: string;
};

export type InventoryModalProps = {
  handleCreateInventoryItem: (e: React.FormEvent) => void;
  inventoryForm: InventoryForm;
  setInventoryForm: React.Dispatch<React.SetStateAction<InventoryForm>>;
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
  const isAsset = inventoryForm.itemType === "ASSET";

  return (
    <FeatureModalShell
      eyebrow="Facilities"
      title={isAsset ? "Register equipment asset" : "Add stock item"}
      subtitle="Capture identification, location, supplier, and stock or asset details."
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
            {submitting ? "Saving…" : isAsset ? "Register asset" : "Add stock"}
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
          <label className={fieldLabel} htmlFor="inventory-type">Record type</label>
          <select
            id="inventory-type"
            value={inventoryForm.itemType}
            onChange={(e) =>
              setInventoryForm((form) => ({
                ...form,
                itemType: e.target.value as InventoryForm["itemType"],
              }))
            }
            className={fieldInput}
          >
            <option value="CONSUMABLE">Consumable / spare part</option>
            <option value="ASSET">Serialized equipment asset</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="inventory-name">Name</label>
            <input
              id="inventory-name"
              type="text"
              required
              maxLength={160}
              value={inventoryForm.name}
              onChange={(e) =>
                setInventoryForm((form) => ({ ...form, name: e.target.value }))
              }
              placeholder={isAsset ? "e.g. Portable generator" : "e.g. Air filter"}
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="inventory-sku">SKU / internal code</label>
            <input
              id="inventory-sku"
              type="text"
              maxLength={100}
              value={inventoryForm.sku}
              onChange={(e) =>
                setInventoryForm((form) => ({ ...form, sku: e.target.value }))
              }
              className={fieldInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="inventory-category">Category</label>
            <select
              id="inventory-category"
              value={inventoryForm.category}
              onChange={(e) =>
                setInventoryForm((form) => ({ ...form, category: e.target.value }))
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
          {!isAsset && (
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="inventory-unit">Unit of measure</label>
              <input
                id="inventory-unit"
                type="text"
                required
                maxLength={40}
                value={inventoryForm.unit}
                onChange={(e) =>
                  setInventoryForm((form) => ({ ...form, unit: e.target.value }))
                }
                placeholder="pcs"
                className={fieldInput}
              />
            </div>
          )}
        </div>

        {!isAsset ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="inventory-quantity">Opening quantity</label>
              <input
                id="inventory-quantity"
                type="number"
                min="0"
                step="1"
                required
                value={inventoryForm.quantity}
                onChange={(e) =>
                  setInventoryForm((form) => ({ ...form, quantity: e.target.value }))
                }
                className={`${fieldInput} font-mono`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="inventory-min">Reorder threshold</label>
              <input
                id="inventory-min"
                type="number"
                min="0"
                step="1"
                required
                value={inventoryForm.minQuantity}
                onChange={(e) =>
                  setInventoryForm((form) => ({ ...form, minQuantity: e.target.value }))
                }
                className={`${fieldInput} font-mono`}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="inventory-asset-tag">Asset tag</label>
                <input
                  id="inventory-asset-tag"
                  type="text"
                  required
                  maxLength={100}
                  value={inventoryForm.assetTag}
                  onChange={(e) =>
                    setInventoryForm((form) => ({ ...form, assetTag: e.target.value }))
                  }
                  className={fieldInput}
                />
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="inventory-serial">Serial number</label>
                <input
                  id="inventory-serial"
                  type="text"
                  maxLength={120}
                  value={inventoryForm.serialNumber}
                  onChange={(e) =>
                    setInventoryForm((form) => ({ ...form, serialNumber: e.target.value }))
                  }
                  className={fieldInput}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="inventory-manufacturer">Manufacturer</label>
                <input
                  id="inventory-manufacturer"
                  type="text"
                  maxLength={120}
                  value={inventoryForm.manufacturer}
                  onChange={(e) =>
                    setInventoryForm((form) => ({ ...form, manufacturer: e.target.value }))
                  }
                  className={fieldInput}
                />
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="inventory-model">Model</label>
                <input
                  id="inventory-model"
                  type="text"
                  maxLength={120}
                  value={inventoryForm.model}
                  onChange={(e) =>
                    setInventoryForm((form) => ({ ...form, model: e.target.value }))
                  }
                  className={fieldInput}
                />
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="inventory-condition">Condition</label>
                <select
                  id="inventory-condition"
                  value={inventoryForm.condition}
                  onChange={(e) =>
                    setInventoryForm((form) => ({ ...form, condition: e.target.value }))
                  }
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
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="inventory-location">Storage location</label>
            <input
              id="inventory-location"
              type="text"
              maxLength={240}
              value={inventoryForm.location}
              onChange={(e) =>
                setInventoryForm((form) => ({ ...form, location: e.target.value }))
              }
              placeholder="e.g. Maintenance store"
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="inventory-supplier">Supplier</label>
            <input
              id="inventory-supplier"
              type="text"
              maxLength={160}
              value={inventoryForm.supplier}
              onChange={(e) =>
                setInventoryForm((form) => ({ ...form, supplier: e.target.value }))
              }
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="inventory-cost">Unit / purchase cost</label>
            <input
              id="inventory-cost"
              type="number"
              min="0"
              step="0.01"
              value={inventoryForm.unitCost}
              onChange={(e) =>
                setInventoryForm((form) => ({ ...form, unitCost: e.target.value }))
              }
              className={`${fieldInput} font-mono`}
            />
          </div>
        </div>

        {isAsset && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="inventory-purchase-date">Purchase date</label>
              <input
                id="inventory-purchase-date"
                type="date"
                value={inventoryForm.purchaseDate}
                onChange={(e) =>
                  setInventoryForm((form) => ({ ...form, purchaseDate: e.target.value }))
                }
                className={fieldInput}
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="inventory-warranty">Warranty expires</label>
              <input
                id="inventory-warranty"
                type="date"
                value={inventoryForm.warrantyExpiresAt}
                onChange={(e) =>
                  setInventoryForm((form) => ({ ...form, warrantyExpiresAt: e.target.value }))
                }
                className={fieldInput}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className={fieldLabel} htmlFor="inventory-notes">Notes</label>
          <textarea
            id="inventory-notes"
            maxLength={2000}
            value={inventoryForm.notes}
            onChange={(e) =>
              setInventoryForm((form) => ({ ...form, notes: e.target.value }))
            }
            rows={2}
            className={`${fieldInput} h-auto resize-y`}
          />
        </div>
      </form>
    </FeatureModalShell>
  );
}
