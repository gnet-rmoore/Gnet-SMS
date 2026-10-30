import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building, Bed, Plus, RefreshCw, Users } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { confirmAction } from "../../lib/swal";
import { hostelApi } from "./api";
import { useDirectory, formatDate } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

type HostelRoom = {
  id: string;
  label: string;
  capacity: number;
  status: string;
  assignments: { id: string }[];
};

type HostelBuilding = {
  id: string;
  name: string;
  genderPolicy?: string | null;
  rooms: HostelRoom[];
};

type HostelAssignment = {
  id: string;
  studentId: string;
  studentName?: string;
  checkIn: string;
  room: { label: string; building: { name: string } };
};

type Tab = "buildings" | "assignments";

export function Hostel() {
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const { students } = useDirectory(school?.id);

  const [tab, setTab] = useState<Tab>("buildings");
  const [buildings, setBuildings] = useState<HostelBuilding[]>([]);
  const [assignments, setAssignments] = useState<HostelAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [roomModal, setRoomModal] = useState<HostelBuilding | null>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ name: "", genderPolicy: "" });
  const [roomForm, setRoomForm] = useState({ label: "", capacity: "2" });
  const [assignForm, setAssignForm] = useState({ roomId: "", studentId: "" });

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [b, a] = await Promise.all([
        hostelApi.fetchBuildings(school.id),
        hostelApi.fetchAssignments(school.id),
      ]);
      setBuildings(Array.isArray(b) ? b : []);
      setAssignments(Array.isArray(a) ? a : []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load hostel data", "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const occupancy = useMemo(() => {
    const totalBeds = buildings.reduce(
      (n, b) => n + b.rooms.reduce((m, r) => m + r.capacity, 0),
      0
    );
    const usedBeds = assignments.length;
    return { totalBeds, usedBeds, available: totalBeds - usedBeds };
  }, [buildings, assignments]);

  const stats = useMemo(
    () => ({
      buildings: buildings.length,
      rooms: buildings.reduce((n, b) => n + b.rooms.length, 0),
      occupied: occupancy.usedBeds,
      capacity: occupancy.totalBeds,
    }),
    [buildings, occupancy]
  );

  const allRooms = useMemo(
    () =>
      buildings.flatMap((b) =>
        b.rooms.map((r) => ({
          ...r,
          buildingName: b.name,
          occupied: r.assignments?.length || 0,
        }))
      ),
    [buildings]
  );

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !buildingForm.name.trim()) {
      showToast("Building name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await hostelApi.createBuilding(school.id, {
        name: buildingForm.name.trim(),
        genderPolicy: buildingForm.genderPolicy.trim() || undefined,
      });
      showToast("Building created", "success");
      setShowBuildingModal(false);
      setBuildingForm({ name: "", genderPolicy: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create building", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomModal || !roomForm.label.trim()) {
      showToast("Room label is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await hostelApi.createRoom(roomModal.id, {
        label: roomForm.label.trim(),
        capacity: parseInt(roomForm.capacity, 10) || 1,
      });
      showToast("Room added", "success");
      setRoomModal(null);
      setRoomForm({ label: "", capacity: "2" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to add room", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !assignForm.roomId || !assignForm.studentId) {
      showToast("Room and student are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await hostelApi.createAssignment(school.id, {
        roomId: assignForm.roomId,
        studentId: assignForm.studentId,
      });
      showToast("Student assigned", "success");
      setAssignModal(false);
      setAssignForm({ roomId: "", studentId: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to assign bed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (assignmentId: string) => {
    const ok = await confirmAction({
      title: "Check out student?",
      text: "This will free the bed for a new assignment.",
      confirmText: "Check out",
    });
    if (!ok) return;
    try {
      await hostelApi.checkout(assignmentId);
      showToast("Student checked out", "success");
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Checkout failed", "error");
    }
  };

  return (
    <PageShell className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Hostel"
        subtitle="Buildings, rooms, and bed assignments."
        actions={
          <>
            <ExportCsvButton
              filename={`hostel_${tab}_${new Date().toISOString().slice(0, 10)}`}
              headers={
                tab === "assignments"
                  ? ["Student", "Building", "Room", "Check-in"]
                  : ["Building", "Room", "Capacity", "Occupied", "Status"]
              }
              rows={
                tab === "assignments"
                  ? assignments.map((a) => [
                      a.studentName || a.studentId,
                      a.room.building.name,
                      a.room.label,
                      formatDate(a.checkIn),
                    ])
                  : allRooms.map((r) => [
                      r.buildingName,
                      r.label,
                      String(r.capacity),
                      String(r.occupied),
                      r.status,
                    ])
              }
              disabled={loading}
            />
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {tab === "buildings" ? (
              <Button onClick={() => setShowBuildingModal(true)}>
                <Plus className="w-4 h-4" />
                Add building
              </Button>
            ) : (
              <Button onClick={() => setAssignModal(true)}>
                <Plus className="w-4 h-4" />
                Assign bed
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Buildings" value={stats.buildings} icon={<Building className="w-5 h-5" />} />
        <StatTile label="Rooms" value={stats.rooms} icon={<Bed className="w-5 h-5" />} />
        <StatTile label="Beds occupied" value={stats.occupied} icon={<Users className="w-5 h-5" />} />
        <StatTile label="Total capacity" value={stats.capacity} />
      </div>

      <div className="flex gap-2">
        {(["buildings", "assignments"] as Tab[]).map((t) => (
          <Button key={t} variant={tab === t ? "primary" : "secondary"} size="compact" onClick={() => setTab(t)}>
            {t === "buildings" ? "Buildings & rooms" : "Assignments"}
          </Button>
        ))}
      </div>

      <Surface>
        {loading ? (
          <p className="text-slate-500 font-medium py-8 text-center">Loading…</p>
        ) : tab === "buildings" ? (
          buildings.length === 0 ? (
            <p className="text-slate-500 font-medium py-8 text-center">No hostel buildings yet.</p>
          ) : (
            <div className="space-y-6">
              {buildings.map((building) => (
                <motion.div
                  key={building.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{building.name}</h3>
                      {building.genderPolicy && (
                        <p className="text-sm text-slate-500 font-medium">{building.genderPolicy}</p>
                      )}
                    </div>
                    <Button size="compact" variant="secondary" onClick={() => setRoomModal(building)}>
                      Add room
                    </Button>
                  </div>
                  {building.rooms.length > 0 ? (
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {building.rooms.map((room) => (
                        <li key={room.id} className="text-sm font-medium text-slate-700 rounded-xl bg-white border border-slate-100 p-3">
                          {room.label} · {room.assignments?.length || 0}/{room.capacity} beds · {room.status}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 font-medium">No rooms yet.</p>
                  )}
                </motion.div>
              ))}
            </div>
          )
        ) : assignments.length === 0 ? (
          <p className="text-slate-500 font-medium py-8 text-center">No active assignments.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="flex flex-wrap justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-bold text-slate-900">{a.studentName || a.studentId}</p>
                  <p className="text-sm text-slate-500 font-medium">
                    {a.room.building.name} · Room {a.room.label} · Since {formatDate(a.checkIn)}
                  </p>
                </div>
                <Button size="compact" variant="secondary" onClick={() => handleCheckout(a.id)}>
                  Check out
                </Button>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <AnimatePresence>
        {showBuildingModal && (
          <FeatureModalShell title="Add building" onClose={() => setShowBuildingModal(false)} footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowBuildingModal(false)}>Cancel</Button>
              <Button loading={submitting} onClick={handleCreateBuilding}>Create</Button>
            </div>
          }>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCreateBuilding}>
              <div><label className={fieldLabel}>Name</label><input className={fieldInput} value={buildingForm.name} onChange={(e) => setBuildingForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div><label className={fieldLabel}>Gender policy</label><input className={fieldInput} placeholder="Boys / Girls / Mixed" value={buildingForm.genderPolicy} onChange={(e) => setBuildingForm((f) => ({ ...f, genderPolicy: e.target.value }))} /></div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {roomModal && (
          <FeatureModalShell title="Add room" subtitle={roomModal.name} onClose={() => setRoomModal(null)} footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRoomModal(null)}>Cancel</Button>
              <Button loading={submitting} onClick={handleCreateRoom}>Add room</Button>
            </div>
          }>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCreateRoom}>
              <div><label className={fieldLabel}>Room label</label><input className={fieldInput} value={roomForm.label} onChange={(e) => setRoomForm((f) => ({ ...f, label: e.target.value }))} required /></div>
              <div><label className={fieldLabel}>Capacity</label><input type="number" min={1} className={fieldInput} value={roomForm.capacity} onChange={(e) => setRoomForm((f) => ({ ...f, capacity: e.target.value }))} /></div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assignModal && (
          <FeatureModalShell title="Assign bed" onClose={() => setAssignModal(false)} footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
              <Button loading={submitting} onClick={handleAssign}>Assign</Button>
            </div>
          }>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleAssign}>
              <div>
                <label className={fieldLabel}>Room</label>
                <select className={fieldInput} value={assignForm.roomId} onChange={(e) => setAssignForm((f) => ({ ...f, roomId: e.target.value }))} required>
                  <option value="">Select room</option>
                  {allRooms.filter((r) => r.occupied < r.capacity).map((r) => (
                    <option key={r.id} value={r.id}>{r.buildingName} · {r.label} ({r.occupied}/{r.capacity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Student</label>
                <select className={fieldInput} value={assignForm.studentId} onChange={(e) => setAssignForm((f) => ({ ...f, studentId: e.target.value }))} required>
                  <option value="">Select student</option>
                  {students.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
