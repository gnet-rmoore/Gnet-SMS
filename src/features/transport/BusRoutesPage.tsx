import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bus, MapPin, Plus, RefreshCw, Users } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { confirmAction } from "../../lib/swal";
import { transportApi } from "./api";
import type { TransportRoute, Vehicle } from "./types";
import { useDirectory } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

export function BusRoutesPage() {
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const { students, staff } = useDirectory(school?.id);

  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState<string | null>(null);
  const [showRiderModal, setShowRiderModal] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState({ name: "", vehicleId: "", driverStaffId: "", notes: "" });
  const [stopForm, setStopForm] = useState({ name: "", pickupTime: "" });
  const [riderForm, setRiderForm] = useState({ studentId: "", stopId: "" });

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [r, v] = await Promise.all([
        transportApi.fetchRoutes(school.id),
        transportApi.fetchVehicles(school.id),
      ]);
      setRoutes(Array.isArray(r) ? r : []);
      setVehicles(Array.isArray(v) ? v : []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load routes", "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s.name])),
    [students]
  );
  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);
  const vehicleMap = useMemo(
    () => new Map(vehicles.map((v) => [v.id, `${v.plateNumber} (${v.model})`])),
    [vehicles]
  );

  const stats = useMemo(
    () => ({
      routes: routes.length,
      active: routes.filter((r) => r.status === "ACTIVE").length,
      stops: routes.reduce((n, r) => n + r.stops.length, 0),
      riders: routes.reduce((n, r) => n + r.riders.length, 0),
    }),
    [routes]
  );

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !routeForm.name.trim()) {
      showToast("Route name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await transportApi.createRoute(school.id, {
        name: routeForm.name.trim(),
        vehicleId: routeForm.vehicleId || undefined,
        driverStaffId: routeForm.driverStaffId || undefined,
        notes: routeForm.notes.trim() || undefined,
      });
      showToast("Route created", "success");
      setShowRouteModal(false);
      setRouteForm({ name: "", vehicleId: "", driverStaffId: "", notes: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create route", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStop = async (routeId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!stopForm.name.trim()) {
      showToast("Stop name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await transportApi.addStop(routeId, {
        name: stopForm.name.trim(),
        pickupTime: stopForm.pickupTime.trim() || undefined,
      });
      showToast("Stop added", "success");
      setShowStopModal(null);
      setStopForm({ name: "", pickupTime: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to add stop", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRider = async (routeId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!riderForm.studentId) {
      showToast("Select a student", "error");
      return;
    }
    setSubmitting(true);
    try {
      await transportApi.addRider(routeId, {
        studentId: riderForm.studentId,
        stopId: riderForm.stopId || undefined,
      });
      showToast("Rider assigned", "success");
      setShowRiderModal(null);
      setRiderForm({ studentId: "", stopId: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to assign rider", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRider = async (routeId: string, studentId: string) => {
    const ok = await confirmAction({
      title: "Remove rider?",
      text: "This student will no longer be assigned to the route.",
      confirmText: "Remove",
    });
    if (!ok) return;
    try {
      await transportApi.removeRider(routeId, studentId);
      showToast("Rider removed", "success");
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to remove rider", "error");
    }
  };

  return (
    <PageShell className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Bus routes"
        subtitle="Manage routes, stops, and student ridership."
        actions={
          <>
            <ExportCsvButton
              filename={`bus_routes_${new Date().toISOString().slice(0, 10)}`}
              headers={["Route", "Status", "Vehicle", "Driver", "Stops", "Riders"]}
              rows={routes.map((r) => [
                r.name,
                r.status,
                r.vehicleId ? vehicleMap.get(r.vehicleId) || r.vehicleId : "",
                r.driverStaffId ? staffMap.get(r.driverStaffId) || r.driverStaffId : "",
                String(r.stops.length),
                String(r.riders.length),
              ])}
              disabled={loading}
            />
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowRouteModal(true)}>
              <Plus className="w-4 h-4" />
              New route
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Routes" value={stats.routes} icon={<Bus className="w-5 h-5" />} />
        <StatTile label="Active" value={stats.active} />
        <StatTile label="Stops" value={stats.stops} icon={<MapPin className="w-5 h-5" />} />
        <StatTile label="Riders" value={stats.riders} icon={<Users className="w-5 h-5" />} />
      </div>

      <Surface>
        {loading ? (
          <p className="text-slate-500 font-medium py-8 text-center">Loading routes…</p>
        ) : routes.length === 0 ? (
          <p className="text-slate-500 font-medium py-8 text-center">
            No routes yet. Create your first bus route to get started.
          </p>
        ) : (
          <div className="space-y-6">
            {routes.map((route) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{route.name}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      {route.status === "ACTIVE" ? "Active" : "Inactive"}
                      {route.vehicleId && vehicleMap.get(route.vehicleId)
                        ? ` · ${vehicleMap.get(route.vehicleId)}`
                        : ""}
                      {route.driverStaffId && staffMap.get(route.driverStaffId)
                        ? ` · Driver: ${staffMap.get(route.driverStaffId)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="compact" variant="secondary" onClick={() => setShowStopModal(route.id)}>
                      Add stop
                    </Button>
                    <Button size="compact" onClick={() => setShowRiderModal(route.id)}>
                      Add rider
                    </Button>
                  </div>
                </div>

                {route.stops.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Stops</p>
                    <ol className="space-y-1">
                      {route.stops.map((stop, i) => (
                        <li key={stop.id} className="text-sm font-medium text-slate-700">
                          {i + 1}. {stop.name}
                          {stop.pickupTime ? ` · ${stop.pickupTime}` : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {route.riders.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Riders</p>
                    <ul className="space-y-2">
                      {route.riders.map((rider) => (
                        <li
                          key={rider.id}
                          className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700"
                        >
                          <span>{studentMap.get(rider.studentId) || rider.studentId}</span>
                          <Button
                            size="compact"
                            variant="ghost"
                            onClick={() => handleRemoveRider(route.id, rider.studentId)}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Surface>

      <AnimatePresence>
        {showRouteModal && (
          <FeatureModalShell
            title="New bus route"
            subtitle="Create a route and assign vehicle or driver later."
            onClose={() => setShowRouteModal(false)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowRouteModal(false)}>
                  Cancel
                </Button>
                <Button loading={submitting} onClick={handleCreateRoute}>
                  Create route
                </Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCreateRoute}>
              <div>
                <label className={fieldLabel}>Route name</label>
                <input
                  className={fieldInput}
                  value={routeForm.name}
                  onChange={(e) => setRouteForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={fieldLabel}>Vehicle</label>
                <select
                  className={fieldInput}
                  value={routeForm.vehicleId}
                  onChange={(e) => setRouteForm((f) => ({ ...f, vehicleId: e.target.value }))}
                >
                  <option value="">None</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} — {v.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Driver</label>
                <select
                  className={fieldInput}
                  value={routeForm.driverStaffId}
                  onChange={(e) => setRouteForm((f) => ({ ...f, driverStaffId: e.target.value }))}
                >
                  <option value="">None</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Notes</label>
                <textarea
                  className={fieldInput}
                  rows={2}
                  value={routeForm.notes}
                  onChange={(e) => setRouteForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStopModal && (
          <FeatureModalShell
            title="Add stop"
            onClose={() => setShowStopModal(null)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowStopModal(null)}>
                  Cancel
                </Button>
                <Button loading={submitting} onClick={(e) => handleAddStop(showStopModal, e)}>
                  Add stop
                </Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={(e) => handleAddStop(showStopModal, e)}>
              <div>
                <label className={fieldLabel}>Stop name</label>
                <input
                  className={fieldInput}
                  value={stopForm.name}
                  onChange={(e) => setStopForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={fieldLabel}>Pickup time</label>
                <input
                  className={fieldInput}
                  placeholder="07:30"
                  value={stopForm.pickupTime}
                  onChange={(e) => setStopForm((f) => ({ ...f, pickupTime: e.target.value }))}
                />
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRiderModal && (
          <FeatureModalShell
            title="Assign rider"
            onClose={() => setShowRiderModal(null)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowRiderModal(null)}>
                  Cancel
                </Button>
                <Button loading={submitting} onClick={(e) => handleAddRider(showRiderModal, e)}>
                  Assign
                </Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={(e) => handleAddRider(showRiderModal, e)}>
              <div>
                <label className={fieldLabel}>Student</label>
                <select
                  className={fieldInput}
                  value={riderForm.studentId}
                  onChange={(e) => setRiderForm((f) => ({ ...f, studentId: e.target.value }))}
                  required
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Stop (optional)</label>
                <select
                  className={fieldInput}
                  value={riderForm.stopId}
                  onChange={(e) => setRiderForm((f) => ({ ...f, stopId: e.target.value }))}
                >
                  <option value="">Any stop</option>
                  {(routes.find((r) => r.id === showRiderModal)?.stops || []).map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
