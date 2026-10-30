import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookMarked, BookOpen, Plus, RefreshCw } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button, DataTable, dataTableClass } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { libraryApi } from "./api";
import { useDirectory, formatDate } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

type LibraryItem = {
  id: string;
  title: string;
  author?: string | null;
  category: string;
  copiesTotal: number;
  copiesAvailable: number;
  location?: string | null;
};

type LibraryLoan = {
  id: string;
  studentId: string;
  studentName?: string;
  status: string;
  dueAt: string;
  loanedAt: string;
  item?: { title: string };
};

type Tab = "catalog" | "loans";

export function Library() {
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const { students } = useDirectory(school?.id);

  const [tab, setTab] = useState<Tab>("catalog");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [itemForm, setItemForm] = useState({
    title: "",
    author: "",
    category: "GENERAL",
    copiesTotal: "1",
    location: "",
  });
  const [checkoutForm, setCheckoutForm] = useState({
    itemId: "",
    studentId: "",
    dueAt: "",
  });

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [i, l] = await Promise.all([
        libraryApi.fetchItems(school.id),
        libraryApi.fetchLoans(school.id),
      ]);
      setItems(Array.isArray(i) ? i : []);
      setLoans(Array.isArray(l) ? l : []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load library", "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      titles: items.length,
      copies: items.reduce((n, i) => n + i.copiesTotal, 0),
      out: loans.filter((l) => l.status === "OUT" || l.status === "OVERDUE").length,
      overdue: loans.filter((l) => l.status === "OVERDUE").length,
    }),
    [items, loans]
  );

  const exportRows = useMemo(() => {
    if (tab === "catalog") {
      return items.map((i) => [
        i.title,
        i.author || "",
        i.category,
        String(i.copiesTotal),
        String(i.copiesAvailable),
        i.location || "",
      ]);
    }
    return loans.map((l) => [
      l.studentName || l.studentId,
      l.item?.title || "",
      l.status,
      formatDate(l.loanedAt),
      formatDate(l.dueAt),
    ]);
  }, [tab, items, loans]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !itemForm.title.trim()) {
      showToast("Title is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await libraryApi.createItem(school.id, {
        title: itemForm.title.trim(),
        author: itemForm.author.trim() || undefined,
        category: itemForm.category.trim() || "GENERAL",
        copiesTotal: parseInt(itemForm.copiesTotal, 10) || 1,
        location: itemForm.location.trim() || undefined,
      });
      showToast("Title added to catalog", "success");
      setShowItemModal(false);
      setItemForm({ title: "", author: "", category: "GENERAL", copiesTotal: "1", location: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to add item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !checkoutForm.itemId || !checkoutForm.studentId) {
      showToast("Select item and student", "error");
      return;
    }
    setSubmitting(true);
    try {
      await libraryApi.checkout(school.id, {
        itemId: checkoutForm.itemId,
        studentId: checkoutForm.studentId,
        dueAt: checkoutForm.dueAt || undefined,
      });
      showToast("Item checked out", "success");
      setShowCheckoutModal(false);
      setCheckoutForm({ itemId: "", studentId: "", dueAt: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Checkout failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (loanId: string) => {
    try {
      await libraryApi.returnLoan(loanId);
      showToast("Item returned", "success");
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Return failed", "error");
    }
  };

  return (
    <PageShell width="wide" className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Library"
        subtitle="Catalog titles and manage student loans."
        actions={
          <>
            <ExportCsvButton
              filename={`library_${tab}_${new Date().toISOString().slice(0, 10)}`}
              headers={
                tab === "catalog"
                  ? ["Title", "Author", "Category", "Copies total", "Available", "Location"]
                  : ["Student", "Title", "Status", "Loaned", "Due"]
              }
              rows={exportRows}
              disabled={loading}
            />
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {tab === "catalog" ? (
              <Button onClick={() => setShowItemModal(true)}>
                <Plus className="w-4 h-4" />
                Add title
              </Button>
            ) : (
              <Button onClick={() => setShowCheckoutModal(true)}>
                <Plus className="w-4 h-4" />
                Check out
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Titles" value={stats.titles} icon={<BookMarked className="w-5 h-5" />} />
        <StatTile label="Total copies" value={stats.copies} />
        <StatTile label="On loan" value={stats.out} icon={<BookOpen className="w-5 h-5" />} />
        <StatTile label="Overdue" value={stats.overdue} />
      </div>

      <div className="flex gap-2">
        {(["catalog", "loans"] as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "primary" : "secondary"}
            size="compact"
            onClick={() => setTab(t)}
          >
            {t === "catalog" ? "Catalog" : "Loans"}
          </Button>
        ))}
      </div>

      <Surface>
        {loading ? (
          <p className="text-slate-500 font-medium py-8 text-center">Loading…</p>
        ) : tab === "catalog" ? (
          items.length === 0 ? (
            <p className="text-slate-500 font-medium py-8 text-center">No catalog items yet.</p>
          ) : (
            <DataTable>
              <table className={dataTableClass.table}>
                <thead className={dataTableClass.thead}>
                  <tr>
                    <th className={dataTableClass.th}>Title</th>
                    <th className={dataTableClass.th}>Author</th>
                    <th className={dataTableClass.th}>Category</th>
                    <th className={dataTableClass.th}>Available</th>
                    <th className={dataTableClass.th}>Location</th>
                  </tr>
                </thead>
                <tbody className={dataTableClass.tbody}>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className={`${dataTableClass.td} font-bold text-slate-900`}>
                        <span className="truncate block">{item.title}</span>
                      </td>
                      <td className={`${dataTableClass.td} text-slate-600`}>
                        <span className="truncate block">{item.author || "—"}</span>
                      </td>
                      <td className={`${dataTableClass.td} text-slate-600`}>{item.category}</td>
                      <td className={`${dataTableClass.td} font-mono font-bold text-slate-900`}>
                        {item.copiesAvailable}/{item.copiesTotal}
                      </td>
                      <td className={`${dataTableClass.td} text-slate-600`}>
                        <span className="truncate block">{item.location || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          )
        ) : loans.length === 0 ? (
          <p className="text-slate-500 font-medium py-8 text-center">No loans on record.</p>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-bold text-slate-900">{loan.item?.title || "Item"}</p>
                  <p className="text-sm text-slate-500 font-medium">
                    {loan.studentName || loan.studentId} · Due {formatDate(loan.dueAt)} ·{" "}
                    {loan.status}
                  </p>
                </div>
                {(loan.status === "OUT" || loan.status === "OVERDUE") && (
                  <Button size="compact" onClick={() => handleReturn(loan.id)}>
                    Return
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Surface>

      <AnimatePresence>
        {showItemModal && (
          <FeatureModalShell
            title="Add catalog title"
            onClose={() => setShowItemModal(false)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowItemModal(false)}>
                  Cancel
                </Button>
                <Button loading={submitting} onClick={handleCreateItem}>
                  Add title
                </Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCreateItem}>
              <div>
                <label className={fieldLabel}>Title</label>
                <input className={fieldInput} value={itemForm.title} onChange={(e) => setItemForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className={fieldLabel}>Author</label>
                <input className={fieldInput} value={itemForm.author} onChange={(e) => setItemForm((f) => ({ ...f, author: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel}>Copies</label>
                <input type="number" min={1} className={fieldInput} value={itemForm.copiesTotal} onChange={(e) => setItemForm((f) => ({ ...f, copiesTotal: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel}>Location</label>
                <input className={fieldInput} value={itemForm.location} onChange={(e) => setItemForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckoutModal && (
          <FeatureModalShell
            title="Check out item"
            onClose={() => setShowCheckoutModal(false)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowCheckoutModal(false)}>
                  Cancel
                </Button>
                <Button loading={submitting} onClick={handleCheckout}>
                  Check out
                </Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCheckout}>
              <div>
                <label className={fieldLabel}>Item</label>
                <select className={fieldInput} value={checkoutForm.itemId} onChange={(e) => setCheckoutForm((f) => ({ ...f, itemId: e.target.value }))} required>
                  <option value="">Select item</option>
                  {items.filter((i) => i.copiesAvailable > 0).map((i) => (
                    <option key={i.id} value={i.id}>{i.title} ({i.copiesAvailable} available)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Student</label>
                <select className={fieldInput} value={checkoutForm.studentId} onChange={(e) => setCheckoutForm((f) => ({ ...f, studentId: e.target.value }))} required>
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Due date</label>
                <input type="date" className={fieldInput} value={checkoutForm.dueAt} onChange={(e) => setCheckoutForm((f) => ({ ...f, dueAt: e.target.value }))} />
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
