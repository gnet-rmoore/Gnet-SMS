import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Truck,
  Package,
  DollarSign
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { format } from "date-fns";
import { PageShell, PageHeader, StatTile, Button } from "../../components/ui";

export const Procurement = () => {
  const { school, accessToken, user } = useAuthStore();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", amount: "" });

  const fetchData = async () => {
    try {
      const [reqRes, invRes] = await Promise.all([
        fetch(`/api/schools/${school?.id}/requisitions`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`/api/schools/${school?.id}/inventory`, { headers: { Authorization: `Bearer ${accessToken}` } })
      ]);
      if (reqRes.ok) setRequisitions(await reqRes.json());
      if (invRes.ok) setInventory(await invRes.json());
    } catch (error) {
      console.error("Failed to fetch procurement data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/schools/${school?.id}/requisitions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowModal(false);
        setFormData({ title: "", description: "", amount: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create requisition:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/requisitions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status }),
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Failed to update requisition:", error);
    }
  };

  const canApprove = ["SCHOOL_ADMIN", "PRINCIPAL", "PROCUREMENT"].includes(user?.role || "");

  return (
    <PageShell>
      <PageHeader
        title="Procurement & Inventory"
        subtitle="Manage requisitions, suppliers, and stock levels"
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5" />
            New Requisition
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatTile
          label="Total Reqs"
          value={requisitions.length}
          icon={<ShoppingBag className="w-6 h-6" />}
        />
        <StatTile
          label="Pending"
          value={requisitions.filter(r => r.status === "PENDING").length}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatTile
          label="Inventory Items"
          value={inventory.length}
          icon={<Package className="w-6 h-6" />}
        />
        <StatTile
          label="Total Spend"
          value={`$${requisitions.filter(r => r.status === "APPROVED").reduce((acc, curr) => acc + curr.amount, 0)}`}
          icon={<DollarSign className="w-6 h-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Requisitions</h2>
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {requisitions.map((req) => (
              <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{req.title}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">{req.requester.name} • ${req.amount}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                        req.status === "REJECTED" ? "bg-rose-100 text-rose-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {req.status}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{format(new Date(req.createdAt), "MMM d")}</span>
                    </div>
                  </div>
                  {canApprove && req.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStatus(req.id, "APPROVED")} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"><CheckCircle2 className="w-5 h-5" /></button>
                      <button onClick={() => handleUpdateStatus(req.id, "REJECTED")} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all"><XCircle className="w-5 h-5" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Inventory Status</h2>
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Manage Stock</button>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {inventory.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.category}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{item.quantity} {item.unit}</p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        item.quantity <= item.minQuantity ? "bg-rose-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${Math.min((item.quantity / (item.minQuantity * 2)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
                <h2 className="text-2xl font-bold">New Requisition</h2>
                <p className="text-indigo-100 text-sm font-medium">Request supplies or services</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Title</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                  required 
                  placeholder="e.g. Science Lab Supplies" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Estimated Amount ($)</label>
                <input 
                  type="number" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                  required 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none h-24 font-medium" 
                  placeholder="Details about the request..." 
                />
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
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </PageShell>
  );
};
