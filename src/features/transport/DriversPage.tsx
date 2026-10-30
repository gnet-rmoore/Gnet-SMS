import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { RefreshCw, Truck, UserCheck, Users } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button, DataTable, dataTableClass } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { transportApi } from "./api";
import type { Vehicle } from "./types";
import { useDirectory } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

export function DriversPage() {
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const { staff } = useDirectory(school?.id);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignModal, setAssignModal] = useState<Vehicle | null>(null);
  const [driverId, setDriverId] = useState("");

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const v = await transportApi.fetchVehicles(school.id);
      setVehicles(Array.isArray(v) ? v : []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load fleet", "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);

  const stats = useMemo(() => {
    const assigned = vehicles.filter((v) => v.driverId).length;
    return {
      fleet: vehicles.length,
      assigned,
      unassigned: vehicles.length - assigned,
      drivers: new Set(vehicles.map((v) => v.driverId).filter(Boolean)).size,
    };
  }, [vehicles]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal) return;
    setSubmitting(true);
    try {
      await transportApi.updateVehicle(assignModal.id, {
        driverId: driverId || null,
      });
      showToast(driverId ? "Driver assigned" : "Driver cleared", "success");
      setAssignModal(null);
      setDriverId("");
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update assignment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell width="wide" className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Drivers"
        subtitle="Assign staff drivers to fleet vehicles."
        actions={
          <>
            <ExportCsvButton
              filename={`drivers_${new Date().toISOString().slice(0, 10)}`}
              headers={["Plate", "Model", "Status", "Driver"]}
              rows={vehicles.map((v) => [
                v.plateNumber,
                v.model,
                v.status,
                v.driverId ? staffMap.get(v.driverId) || v.driverId : "",
              ])}
              disabled={loading}
            />
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Fleet" value={stats.fleet} icon={<Truck className="w-5 h-5" />} />
        <StatTile label="Assigned" value={stats.assigned} icon={<UserCheck className="w-5 h-5" />} />
        <StatTile label="Unassigned" value={stats.unassigned} />
        <StatTile label="Unique drivers" value={stats.drivers} icon={<Users className="w-5 h-5" />} />
      </div>

      <Surface>
        {loading ? (
          <p className="text-slate-500 font-medium py-8 text-center">Loading fleet…</p>
        ) : vehicles.length === 0 ? (
          <p className="text-slate-500 font-medium py-8 text-center">
            No vehicles in the fleet yet. Add vehicles from Vehicle maintenance.
          </p>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>Plate</th>
                  <th className={dataTableClass.th}>Model</th>
                  <th className={dataTableClass.th}>Status</th>
                  <th className={dataTableClass.th}>Driver</th>
                  <th className={dataTableClass.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className={`${dataTableClass.td} font-mono font-bold text-slate-900`}>{v.plateNumber}</td>
                    <td className={`${dataTableClass.td} font-medium text-slate-700`}>
                      <span className="truncate block">{v.model}</span>
                    </td>
                    <td className={`${dataTableClass.td} font-medium text-slate-600`}>{v.status}</td>
                    <td className={`${dataTableClass.td} font-medium text-slate-700`}>
                      <span className="truncate block">{v.driverId ? staffMap.get(v.driverId) || v.driverId : "—"}</span>
                    </td>
                    <td className={dataTableClass.td}>
                      <Button
                        size="compact"
                        variant="secondary"
                        onClick={() => {
                          setAssignModal(v);
                          setDriverId(v.driverId || "");
                        }}
                      >
                        Assign
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </Surface>

      <AnimatePresence>
        {assignModal && (
          <FeatureModalShell
            title="Assign driver"
            subtitle={`${assignModal.plateNumber} · ${assignModal.model}`}
            onClose={() => setAssignModal(null)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setAssignModal(null)}>
                  Cancel
                </Button>
                <Button loading={submitting} onClick={handleAssign}>
                  Save
                </Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8" onSubmit={handleAssign}>
              <label className={fieldLabel}>Staff driver</label>
              <select
                className={fieldInput}
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              >
                <option value="">No driver</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
