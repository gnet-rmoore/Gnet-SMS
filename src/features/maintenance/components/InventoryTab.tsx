import React from "react";
import { Package, Plus, Search, Minus } from "lucide-react";
import { motion } from "motion/react";
import {
  cardShell,
  childCard,
} from "../../academics-shared/FeatureModalShell";
import { DataTable, dataTableClass } from "../../../components/ui";

const CATEGORIES = ["ALL", "HVAC", "ELECTRICAL", "PLUMBING", "SAFETY", "GENERAL"];

export type InventoryTabProps = {
  canManage: boolean;
  filteredInventory: any[];
  handleRestockInventory: (item: any, amount: number) => void;
  invCategoryFilter: string;
  invSearch: string;
  loading: boolean;
  setInvCategoryFilter: (v: string) => void;
  setInvSearch: (v: string) => void;
  setShowInventoryModal: (open: boolean) => void;
};

export function InventoryTab({
  canManage,
  filteredInventory,
  handleRestockInventory,
  invCategoryFilter,
  invSearch,
  loading,
  setInvCategoryFilter,
  setInvSearch,
  setShowInventoryModal,
}: InventoryTabProps) {
  const lowCount = filteredInventory.filter(
    (i) => Number(i.quantity) <= Number(i.minQuantity)
  ).length;

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
              placeholder="Search parts by name or category…"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowInventoryModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add part
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setInvCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                  invCategoryFilter === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat === "ALL" ? "All" : cat}
              </button>
            ))}
          </div>
          {lowCount > 0 && (
            <p className="text-xs font-bold text-rose-600">
              {lowCount} low-stock item{lowCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Parts inventory
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {filteredInventory.length} item
            {filteredInventory.length === 1 ? "" : "s"} for facilities use
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
              No inventory items yet
            </p>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Add HVAC, electrical, plumbing, or safety stock.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowInventoryModal(true)}
                className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                Add the first part
              </button>
            )}
          </div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>Item</th>
                  <th className={dataTableClass.th}>Category</th>
                  <th className={dataTableClass.th}>Qty</th>
                  <th className={dataTableClass.th}>Min</th>
                  <th className={dataTableClass.th}>Status</th>
                  {canManage && (
                    <th className={dataTableClass.thEnd}>Adjust</th>
                  )}
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {filteredInventory.map((item) => {
                  const isLow =
                    Number(item.quantity) <= Number(item.minQuantity);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 ${
                        isLow ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <td className={`${dataTableClass.td} font-bold text-slate-900 text-sm`}>
                        <span className="truncate block">{item.name}</span>
                      </td>
                      <td className={dataTableClass.td}>
                        <span className="inline-flex px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className={`${dataTableClass.td} font-mono text-sm font-extrabold text-slate-900`}>
                        {item.quantity}{" "}
                        <span className="text-slate-400 font-medium text-xs">
                          {item.unit}
                        </span>
                      </td>
                      <td className={`${dataTableClass.td} font-mono text-sm text-slate-500`}>
                        {item.minQuantity}
                      </td>
                      <td className={dataTableClass.td}>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            isLow
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}
                        >
                          {isLow ? "Low stock" : "OK"}
                        </span>
                      </td>
                      {canManage && (
                        <td className={dataTableClass.td}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleRestockInventory(item, -5)}
                              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                              title="Remove 5"
                            >
                              −5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestockInventory(item, -1)}
                              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                              title="Remove 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestockInventory(item, 1)}
                              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                              title="Add 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestockInventory(item, 5)}
                              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                              title="Add 5"
                            >
                              +5
                            </button>
                          </div>
                        </td>
                      )}
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
