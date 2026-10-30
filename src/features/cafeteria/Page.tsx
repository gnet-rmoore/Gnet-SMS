import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { CalendarDays, Plus, RefreshCw, UtensilsCrossed } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button, DataTable, dataTableClass } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { cafeteriaApi } from "./api";
import { formatDate, todayIso } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

type CafeteriaMenu = {
  id: string;
  date: string;
  mealType: string;
  items: string;
};

type CafeteriaMealCount = {
  id: string;
  date: string;
  mealType: string;
  planned: number;
  served: number;
  notes?: string | null;
};

type Tab = "menu" | "counts";

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "SNACK"] as const;

function weekRange() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 6);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export function Cafeteria() {
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();

  const [tab, setTab] = useState<Tab>("menu");
  const [menus, setMenus] = useState<CafeteriaMenu[]>([]);
  const [counts, setCounts] = useState<CafeteriaMealCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [menuForm, setMenuForm] = useState({ date: todayIso(), mealType: "LUNCH", items: "" });
  const [countForm, setCountForm] = useState({
    date: todayIso(),
    mealType: "LUNCH",
    planned: "0",
    served: "0",
    notes: "",
  });

  const range = useMemo(() => weekRange(), []);

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        cafeteriaApi.fetchMenus(school.id, range.from, range.to),
        cafeteriaApi.fetchMealCounts(school.id, range.from, range.to),
      ]);
      setMenus(Array.isArray(m) ? m : []);
      setCounts(Array.isArray(c) ? c : []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load cafeteria data", "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, range.from, range.to, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const today = todayIso();
    const todayCounts = counts.filter((c) => c.date.startsWith(today));
    return {
      menuDays: menus.length,
      mealTypes: new Set(menus.map((m) => m.mealType)).size,
      plannedToday: todayCounts.reduce((n, c) => n + c.planned, 0),
      servedToday: todayCounts.reduce((n, c) => n + c.served, 0),
    };
  }, [menus, counts]);

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !menuForm.items.trim()) {
      showToast("Menu items are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await cafeteriaApi.upsertMenu(school.id, {
        date: menuForm.date,
        mealType: menuForm.mealType,
        items: menuForm.items.trim(),
      });
      showToast("Menu saved", "success");
      setShowMenuModal(false);
      setMenuForm({ date: todayIso(), mealType: "LUNCH", items: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save menu", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    setSubmitting(true);
    try {
      await cafeteriaApi.upsertMealCount(school.id, {
        date: countForm.date,
        mealType: countForm.mealType,
        planned: parseInt(countForm.planned, 10) || 0,
        served: parseInt(countForm.served, 10) || 0,
        notes: countForm.notes.trim() || undefined,
      });
      showToast("Meal count saved", "success");
      setShowCountModal(false);
      setCountForm({ date: todayIso(), mealType: "LUNCH", planned: "0", served: "0", notes: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save count", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell width="wide" className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Cafeteria"
        subtitle="Weekly menus and daily meal counts."
        actions={
          <>
            <ExportCsvButton
              filename={`cafeteria_${tab}_${new Date().toISOString().slice(0, 10)}`}
              headers={
                tab === "menu"
                  ? ["Date", "Meal", "Items"]
                  : ["Date", "Meal", "Planned", "Served", "Notes"]
              }
              rows={
                tab === "menu"
                  ? menus.map((m) => [formatDate(m.date), m.mealType, m.items])
                  : counts.map((c) => [
                      formatDate(c.date),
                      c.mealType,
                      String(c.planned),
                      String(c.served),
                      c.notes || "",
                    ])
              }
              disabled={loading}
            />
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => (tab === "menu" ? setShowMenuModal(true) : setShowCountModal(true))}>
              <Plus className="w-4 h-4" />
              {tab === "menu" ? "Plan menu" : "Log counts"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Menu entries" value={stats.menuDays} icon={<UtensilsCrossed className="w-5 h-5" />} />
        <StatTile label="Meal types" value={stats.mealTypes} icon={<CalendarDays className="w-5 h-5" />} />
        <StatTile label="Planned today" value={stats.plannedToday} />
        <StatTile label="Served today" value={stats.servedToday} />
      </div>

      <div className="flex gap-2">
        {(["menu", "counts"] as Tab[]).map((t) => (
          <Button key={t} variant={tab === t ? "primary" : "secondary"} size="compact" onClick={() => setTab(t)}>
            {t === "menu" ? "Menu planner" : "Meal counts"}
          </Button>
        ))}
      </div>

      <Surface>
        {loading ? (
          <p className="text-slate-500 font-medium py-8 text-center">Loading…</p>
        ) : tab === "menu" ? (
          menus.length === 0 ? (
            <p className="text-slate-500 font-medium py-8 text-center">No menus planned this week.</p>
          ) : (
            <div className="space-y-3">
              {menus.map((menu) => (
                <div key={menu.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">
                    {formatDate(menu.date)} · {menu.mealType}
                  </p>
                  <p className="text-sm text-slate-600 font-medium mt-2 whitespace-pre-wrap">{menu.items}</p>
                </div>
              ))}
            </div>
          )
        ) : counts.length === 0 ? (
          <p className="text-slate-500 font-medium py-8 text-center">No meal counts logged this week.</p>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>Date</th>
                  <th className={dataTableClass.th}>Meal</th>
                  <th className={dataTableClass.th}>Planned</th>
                  <th className={dataTableClass.th}>Served</th>
                  <th className={dataTableClass.th}>Notes</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {counts.map((row) => (
                  <tr key={row.id}>
                    <td className={`${dataTableClass.td} font-medium text-slate-700`}>{formatDate(row.date)}</td>
                    <td className={`${dataTableClass.td} font-medium text-slate-700`}>{row.mealType}</td>
                    <td className={`${dataTableClass.td} font-mono font-bold text-slate-900`}>{row.planned}</td>
                    <td className={`${dataTableClass.td} font-mono font-bold text-slate-900`}>{row.served}</td>
                    <td className={`${dataTableClass.td} text-slate-600`}>
                      <span className="truncate block">{row.notes || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </Surface>

      <AnimatePresence>
        {showMenuModal && (
          <FeatureModalShell title="Plan menu" onClose={() => setShowMenuModal(false)} footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowMenuModal(false)}>Cancel</Button>
              <Button loading={submitting} onClick={handleSaveMenu}>Save menu</Button>
            </div>
          }>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleSaveMenu}>
              <div><label className={fieldLabel}>Date</label><input type="date" className={fieldInput} value={menuForm.date} onChange={(e) => setMenuForm((f) => ({ ...f, date: e.target.value }))} required /></div>
              <div>
                <label className={fieldLabel}>Meal type</label>
                <select className={fieldInput} value={menuForm.mealType} onChange={(e) => setMenuForm((f) => ({ ...f, mealType: e.target.value }))}>
                  {MEAL_TYPES.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div><label className={fieldLabel}>Items (one per line)</label><textarea className={fieldInput} rows={5} value={menuForm.items} onChange={(e) => setMenuForm((f) => ({ ...f, items: e.target.value }))} required /></div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCountModal && (
          <FeatureModalShell title="Log meal count" onClose={() => setShowCountModal(false)} footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCountModal(false)}>Cancel</Button>
              <Button loading={submitting} onClick={handleSaveCount}>Save</Button>
            </div>
          }>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleSaveCount}>
              <div><label className={fieldLabel}>Date</label><input type="date" className={fieldInput} value={countForm.date} onChange={(e) => setCountForm((f) => ({ ...f, date: e.target.value }))} required /></div>
              <div>
                <label className={fieldLabel}>Meal type</label>
                <select className={fieldInput} value={countForm.mealType} onChange={(e) => setCountForm((f) => ({ ...f, mealType: e.target.value }))}>
                  {MEAL_TYPES.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div><label className={fieldLabel}>Planned</label><input type="number" min={0} className={fieldInput} value={countForm.planned} onChange={(e) => setCountForm((f) => ({ ...f, planned: e.target.value }))} /></div>
              <div><label className={fieldLabel}>Served</label><input type="number" min={0} className={fieldInput} value={countForm.served} onChange={(e) => setCountForm((f) => ({ ...f, served: e.target.value }))} /></div>
              <div><label className={fieldLabel}>Notes</label><input className={fieldInput} value={countForm.notes} onChange={(e) => setCountForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
