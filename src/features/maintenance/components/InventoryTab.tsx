import React from "react";
import { ClipboardList, Package, Plus, Search, Wrench } from "lucide-react";
import { motion } from "motion/react";
import {
  cardShell,
  childCard,
} from "../../academics-shared/FeatureModalShell";
import { DataTable, dataTableClass } from "../../../components/ui";
import type { InventoryRecord } from "./InventoryActionModal";

const CATEGORIES = ["ALL", "HVAC", "ELECTRICAL", "PLUMBING", "SAFETY", "GENERAL"];

export type InventoryTabProps = {
  canCreate: boolean;
  filteredInventory: InventoryRecord[];
  invCategoryFilter: string;
  invSearch: string;
  invTypeFilter: string;
  loading: boolean;
  onManageItem: (item: InventoryRecord) => void;
  setInvCategoryFilter: (v: string) => void;
  setInvSearch: (v: string) => void;
  setInvTypeFilter: (v: string) => void;
  setShowInventoryModal: (open: boolean) => void;
};

function isLowStock(item: InventoryRecord) {
  return item.itemType !== "ASSET" && Number(item.quantity) <= Number(item.minQuantity);
}

export function InventoryTab({
  canCreate,
  filteredInventory,
  invCategoryFilter,
  invSearch,
  invTypeFilter,
  loading,
  onManageItem,
  setInvCategoryFilter,
  setInvSearch,
  setInvTypeFilter,
  setShowInventoryModal,
}: InventoryTabProps) {
  const lowCount = filteredInventory.filter(isLowStock).length;
  const assetCount = filteredInventory.filter((item) => item.itemType === "ASSET").length;
  const consumableCount = filteredInventory.length - assetCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className={`${cardShell} p-5 sm:p-6 space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              placeholder="Search name, SKU, asset tag, serial, location…"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowInventoryModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add item / asset
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              ["ALL", "All types"],
              ["CONSUMABLE", "Consumables"],
              ["ASSET", "Equipment assets"],
            ].map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => setInvTypeFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  invTypeFilter === type
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setInvCategoryFilter(category)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                  invCategoryFilter === category
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {category === "ALL" ? "All categories" : category}
              </button>
            ))}
          </div>
          <div className="flex gap-4 text-xs font-bold text-slate-600">
            <span>{consumableCount} stock item{consumableCount === 1 ? "" : "s"}</span>
            <span>{assetCount} asset{assetCount === 1 ? "" : "s"}</span>
            {lowCount > 0 && (
              <span className="text-rose-600">
                {lowCount} low-stock
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Inventory and equipment register
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {filteredInventory.length} matching record{filteredInventory.length === 1 ? "" : "s"} · stock movements and asset custody are audited
          </p>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-14 ${childCard} animate-pulse`} />
            ))}
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 m-6 py-14 text-center px-6">
            <Package className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="font-extrabold tracking-tight text-slate-900">
              No inventory records match these filters
            </p>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Register spare stock or serialized equipment to start the audit trail.
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowInventoryModal(true)}
                className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                Add an item or asset
              </button>
            )}
          </div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>Item / identification</th>
                  <th className={dataTableClass.th}>Category / location</th>
                  <th className={dataTableClass.th}>Balance / condition</th>
                  <th className={dataTableClass.th}>Status / custody</th>
                  <th className={dataTableClass.thEnd}>Audit</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {filteredInventory.map((item) => {
                  const low = isLowStock(item);
                  const isAsset = item.itemType === "ASSET";
                  const status = isAsset ? item.assetStatus || "AVAILABLE" : low ? "LOW_STOCK" : "IN_STOCK";
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 ${low ? "bg-rose-50/30" : ""}`}
                    >
                      <td className={`${dataTableClass.td} min-w-48`}>
                        <span className="font-bold text-slate-900 text-sm block">{item.name}</span>
                        <span className="text-xs text-slate-500 block mt-1">
                          {isAsset
                            ? `Tag ${item.assetTag || "—"}${item.serialNumber ? ` · SN ${item.serialNumber}` : ""}`
                            : `SKU ${item.sku || "—"}`}
                        </span>
                      </td>
                      <td className={dataTableClass.td}>
                        <span className="inline-flex px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-500 block mt-1">{item.location || "Location not set"}</span>
                      </td>
                      <td className={`${dataTableClass.td} font-mono text-sm font-extrabold text-slate-900`}>
                        {isAsset ? item.condition || "—" : `${item.quantity} ${item.unit}`}
                        {!isAsset && (
                          <span className="text-slate-400 font-medium text-xs block mt-1">
                            Reorder at {item.minQuantity}
                          </span>
                        )}
                      </td>
                      <td className={dataTableClass.td}>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            low
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : status === "AVAILABLE" || status === "IN_STOCK"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                        >
                          {status.replace(/_/g, " ")}
                        </span>
                        {isAsset && item.assignedTo && (
                          <span className="text-xs text-slate-500 block mt-1 truncate max-w-36">
                            Assigned · {item.assignedToName || "Staff member"}
                          </span>
                        )}
                      </td>
                      <td className={`${dataTableClass.td} text-end`}>
                        <button
                          type="button"
                          onClick={() => onManageItem(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          {isAsset ? <Wrench className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
                          {isAsset ? "Manage asset" : "Stock / history"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>
    </motion.div>
  );
}
