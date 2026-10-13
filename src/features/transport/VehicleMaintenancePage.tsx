import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, RefreshCw, Truck, Wrench } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { transportApi } from "./api";
import type { Vehicle } from "./types";
import { formatDate } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

export function VehicleMaintenancePage() {
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [maintModal, setMaintModal] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: "",
    model: "",
    capacity: "30",
  });
  const [maintForm, setMaintForm] = useState({
    description: "",
    cost: "0",
    nextService: "",
  });

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

  const stats = useMemo(() => {
    const logs = vehicles.flatMap((v) => v.maintenanceLogs || []);
    const inMaint = vehicles.filter((v) => v.status === "MAINTENANCE").length;
    return {
      fleet: vehicles.length,
      inMaintenance: inMaint,
      serviceLogs: logs.length,
      active: vehicles.filter((v) => v.status === "ACTIVE").length,
    };
  }, [vehicles]);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !vehicleForm.plateNumber.trim() || !vehicleForm.model.trim()) {
      showToast("Plate number and model are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await transportApi.createVehicle(school.id, {
        plateNumber: vehicleForm.plateNumber.trim(),
        model: vehicleForm.model.trim(),
        capacity: parseInt(vehicleForm.capacity, 10) || 30,
      });
      showToast("Vehicle added", "success");
      setShowVehicleModal(false);
      setVehicleForm({ plateNumber: "", model: "", capacity: "30" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to add vehicle", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintModal || !maintForm.description.trim()) {
      showToast("Description is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await transportApi.logMaintenance(maintModal.id, {
        description: maintForm.description.trim(),
        cost: parseFloat(maintForm.cost) || 0,
        nextService: maintForm.nextService || undefined,
      });
      showToast("Maintenance logged", "success");
      setMaintModal(null);
      setMaintForm({ description: "", cost: "0", nextService: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to log maintenance", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetStatus = async (vehicle: Vehicle, status: string) => {
    try {
      await transportApi.updateVehicle(vehicle.id, { status });
      showToast(`Status set to ${status}`, "success");
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update status", "error");
    }
  };

  const maintenanceRows = useMemo(
    () =>
      vehicles.flatMap((v) =>
        (v.maintenanceLogs || []).map((log) => [
          v.plateNumber,
          v.model,
          log.description,
          String(log.cost),
          formatDate(log.date),
          log.nextService ? formatDate(log.nextService) : "",
        ])
      ),
    [vehicles]
  );

  return (
    <PageShell className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Vehicle maintenance"
        subtitle="Fleet registry and service history."
        actions={
          <>
            <ExportCsvButton
              filename={`vehicle_maintenance_${new Date().toISOString().slice(0, 10)}`}
              headers={["Plate", "Model", "Service", "Cost", "Date", "Next service"]}
              rows={maintenanceRows}
              disabled={loading}
            />
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowVehicleModal(true)}>
              <Plus className="w-4 h-4" />
              Add vehicle
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Fleet" value={stats.fleet} icon={<Truck className="w-5 h-5" />} />
        <StatTile label="Active" value={stats.active} />
        <StatTile label="In maintenance" value={stats.inMaintenance} icon={<Wrench className="w-5 h-5" />} />
        <StatTile label="Service logs" value={stats.serviceLogs} />
      </div>

      <Surface>
        {loading ? (
          <p className="text-slate-500 font-medium py-8 text-center">Loading fleet…</p>
        ) : vehicles.length === 0 ? (
          <p className="text-slate-500 font-medium py-8 text-center">
            No vehicles yet. Add your first bus or van to start tracking maintenance.
          </p>
        ) : (
          <div className="space-y-6">
            {vehicles.map((vehicle) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-slate-900 font-mono">
                      {vehicle.plateNumber}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      {vehicle.model} · Capacity {vehicle.capacity} · {vehicle.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="compact" variant="secondary" onClick={() => setMaintModal(vehicle)}>
                      Log service
                    </Button>
                    {vehicle.status !== "MAINTENANCE" && (
                      <Button
                        size="compact"
                        variant="ghost"
                        onClick={() => handleSetStatus(vehicle, "MAINTENANCE")}
                      >
                        Mark in maintenance
                      </Button>
                    )}
                    {vehicle.status !== "ACTIVE" && (
                      <Button size="compact" onClick={() => handleSetStatus(vehicle, "ACTIVE")}>
                        Mark active
                      </Button>
                    )}
                  </div>
                </div>

                {(vehicle.maintenanceLogs || []).length > 0 ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Service history
                    </p>
                    <ul className="space-y-2">
                      {[...(vehicle.maintenanceLogs || [])]
                        .sort(
                          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                        )
                        .map((log) => (
                          <li key={log.id} className="text-sm font-medium text-slate-700">
                            {formatDate(log.date)} — {log.description}
                            {log.cost > 0 ? ` · $${log.cost.toFixed(2)}` : ""}
                            {log.nextService ? ` · Next: ${formatDate(log.nextService)}` : ""}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 font-medium">No service logs yet.</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Surface>

      <AnimatePresence>
        {showVehicleModal && (
          <FeatureModalShell
            title="Add vehicle"
            onClose={() => setShowVehicleModal(false)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowVehicleModal(false)}>
                  Cancel
                </Button>
                <Button loading={submitting} onClick={handleCreateVehicle}>
                  Add vehicle
                </Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCreateVehicle}>
              <div>
                <label className={fieldLabel}>Plate number</label>
                <input
                  className={fieldInput}
                  value={vehicleForm.plateNumber}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, plateNumber: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={fieldLabel}>Model</label>
                <input
                  className={fieldInput}
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={fieldLabel}>Capacity</label>
                <input
                  type="number"
                  min={1}
                  className={fieldInput}
                  value={vehicleForm.capacity}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {maintModal && (
          <FeatureModalShell
            title="Log maintenance"
            subtitle={`${maintModal.plateNumber} · ${maintModal.model}`}
            onClose={() => setMaintModal(null)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setMaintModal(null)}>
                  Cancel
                </Button>
                <Button loading={submitting} onClick={handleLogMaintenance}>
                  Save log
                </Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleLogMaintenance}>
              <div>
                <label className={fieldLabel}>Description</label>
                <textarea
                  className={fieldInput}
                  rows={3}
                  value={maintForm.description}
                  onChange={(e) => setMaintForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={fieldLabel}>Cost</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={fieldInput}
                  value={maintForm.cost}
                  onChange={(e) => setMaintForm((f) => ({ ...f, cost: e.target.value }))}
                />
              </div>
              <div>
                <label className={fieldLabel}>Next service date</label>
                <input
                  type="date"
                  className={fieldInput}
                  value={maintForm.nextService}
                  onChange={(e) => setMaintForm((f) => ({ ...f, nextService: e.target.value }))}
                />
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
