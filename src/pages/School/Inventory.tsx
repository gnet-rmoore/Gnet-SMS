import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  History,
  Tag,
  Layers,
  CheckCircle2
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { format } from "date-fns";
import { PageShell, PageHeader, StatTile, Button, DataTable, dataTableClass } from "../../components/ui";
import { ExportCsvButton } from "../../features/campus-shared/ExportCsvButton";

function inventoryScopeForRole(role?: string | null) {
  switch (role) {
    case "NURSE":
      return {
        category: "MEDICAL",
        title: "Medical supplies",
        subtitle: "Track clinic stock levels and low-stock alerts.",
      };
    case "CAFETERIA_MANAGER":
      return {
        category: "FOOD",
        title: "Food inventory",
        subtitle: "Track cafeteria ingredients and low-stock alerts.",
      };
    case "LIBRARIAN":
      return {
        category: "LIBRARY",
        title: "Library supplies",
        subtitle: "Track library materials and low-stock alerts.",
      };
    default:
      return {
        category: undefined as string | undefined,
        title: "Inventory Management",
        subtitle: "Track stock levels, categories, and low-stock alerts.",
      };
  }
}

export const Inventory = () => {
  const { school, accessToken, user } = useAuthStore();
  const scope = inventoryScopeForRole(user?.role);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    minQuantity: "",
  });

  const fetchData = async () => {
    try {
      const qs = scope.category ? `?category=${encodeURIComponent(scope.category)}` : "";
      const response = await fetch(`/api/schools/${school?.id}/inventory${qs}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.ok) setInventory(await response.json());
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id, scope.category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/schools/${school?.id}/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          ...formData,
          category: formData.category.trim() || scope.category || "GENERAL",
          quantity: parseInt(formData.quantity),
          minQuantity: parseInt(formData.minQuantity)
        }),
      });
      if (response.ok) {
        setShowModal(false);
        setFormData({ name: "", category: scope.category || "", quantity: "", unit: "", minQuantity: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create inventory item:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell width="wide">
      <PageHeader
        title={scope.title}
        subtitle={scope.subtitle}
        actions={
          <>
            <ExportCsvButton
              filename={`inventory_${scope.category?.toLowerCase() || "all"}_${new Date().toISOString().slice(0, 10)}`}
              headers={["Name", "Category", "Quantity", "Unit", "Min quantity", "Status"]}
              rows={inventory.map((item) => [
                item.name,
                item.category,
                String(item.quantity),
                item.unit,
                String(item.minQuantity),
                item.quantity <= item.minQuantity ? "Low stock" : "In stock",
              ])}
              disabled={loading}
            />
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-5 h-5" />
              Add New Item
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatTile
          label="Total Items"
          value={inventory.length}
          icon={<Package className="w-6 h-6" />}
        />
        <StatTile
          label="Low Stock"
          value={inventory.filter(i => i.quantity <= i.minQuantity).length}
          icon={<AlertTriangle className="w-6 h-6" />}
        />
        <StatTile
          label="Categories"
          value={new Set(inventory.map(i => i.category)).size}
          icon={<Layers className="w-6 h-6" />}
        />
      </div>

      <div className="bg-white rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Stock Directory</h2>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"><Filter className="w-5 h-5 text-slate-400" /></button>
            <button className="p-2 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"><Search className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>
        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[30%]`}>Item Name</th>
                <th className={`${dataTableClass.th} w-[16%]`}>Category</th>
                <th className={`${dataTableClass.th} w-[22%]`}>Stock Level</th>
                <th className={`${dataTableClass.th} w-[18%]`}>Status</th>
                <th className={`${dataTableClass.thEnd} w-[14%]`}>Actions</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loading ? (
                <tr><td colSpan={5} className={dataTableClass.tdEmpty}>Loading inventory...</td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan={5} className={dataTableClass.tdEmpty}>No items found.</td></tr>
              ) : inventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className={dataTableClass.td}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                        <Package className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-900 truncate min-w-0">{item.name}</p>
                    </div>
                  </td>
                  <td className={dataTableClass.td}>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold tracking-wider uppercase truncate inline-block max-w-full">
                      {item.category}
                    </span>
                  </td>
                  <td className={dataTableClass.td}>
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.quantity} {item.unit}</p>
                      <span className="text-xs text-slate-500 font-medium shrink-0">(Min: {item.minQuantity})</span>
                    </div>
                  </td>
                  <td className={dataTableClass.td}>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 w-fit ${
                      item.quantity <= item.minQuantity ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {item.quantity <= item.minQuantity ? (
                        <><AlertTriangle className="w-3 h-3" /> Low Stock</>
                      ) : (
                        <><CheckCircle2 className="w-3 h-3" /> In Stock</>
                      )}
                    </span>
                  </td>
                  <td className={dataTableClass.td}>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="compact" type="button">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div>
                <h2 className="text-2xl font-bold">Add New Item</h2>
                <p className="text-indigo-100 text-sm font-medium">Add to school inventory</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Item Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                  placeholder="e.g. A4 Paper Reams" 
                  required 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Category</label>
                  <input 
                    type="text" 
                    value={formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                    placeholder="e.g. Stationery" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Unit</label>
                  <input 
                    type="text" 
                    value={formData.unit} 
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                    placeholder="e.g. Boxes" 
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Initial Quantity</label>
                  <input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                    placeholder="0" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Min Quantity (Alert)</label>
                  <input 
                    type="number" 
                    value={formData.minQuantity} 
                    onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                    placeholder="0" 
                    required 
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </PageShell>
  );
};
