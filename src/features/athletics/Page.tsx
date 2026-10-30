import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, Dumbbell, Plus, RefreshCw, Users } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { confirmAction } from "../../lib/swal";
import { athleticsApi } from "./api";
import { useDirectory, formatDateTime } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

type RosterEntry = {
  studentId: string;
  studentName?: string;
  jerseyNumber?: string | null;
  role?: string | null;
};

type AthleticsEvent = {
  id: string;
  title: string;
  startsAt: string;
  location?: string | null;
  opponent?: string | null;
  result?: string | null;
};

type AthleticsTeam = {
  id: string;
  name: string;
  sport: string;
  season?: string | null;
  coachName?: string | null;
  roster: RosterEntry[];
  events: AthleticsEvent[];
};

type Tab = "teams" | "schedule";

export function Athletics() {
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const { students, staff } = useDirectory(school?.id);

  const [tab, setTab] = useState<Tab>("teams");
  const [teams, setTeams] = useState<AthleticsTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [rosterModal, setRosterModal] = useState<AthleticsTeam | null>(null);
  const [eventModal, setEventModal] = useState<AthleticsTeam | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", sport: "", season: "", coachStaffId: "" });
  const [rosterForm, setRosterForm] = useState({ studentId: "", jerseyNumber: "" });
  const [eventForm, setEventForm] = useState({ title: "", startsAt: "", location: "", opponent: "" });

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const t = await athleticsApi.fetchTeams(school.id);
      setTeams(Array.isArray(t) ? t : []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load teams", "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const allEvents = useMemo(
    () =>
      teams
        .flatMap((team) =>
          team.events.map((e) => ({ ...e, teamName: team.name, teamId: team.id }))
        )
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [teams]
  );

  const stats = useMemo(
    () => ({
      teams: teams.length,
      athletes: teams.reduce((n, t) => n + t.roster.length, 0),
      events: allEvents.length,
      sports: new Set(teams.map((t) => t.sport)).size,
    }),
    [teams, allEvents]
  );

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !teamForm.name.trim() || !teamForm.sport.trim()) {
      showToast("Name and sport are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await athleticsApi.createTeam(school.id, {
        name: teamForm.name.trim(),
        sport: teamForm.sport.trim(),
        season: teamForm.season.trim() || undefined,
        coachStaffId: teamForm.coachStaffId || undefined,
      });
      showToast("Team created", "success");
      setShowTeamModal(false);
      setTeamForm({ name: "", sport: "", season: "", coachStaffId: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create team", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterModal || !rosterForm.studentId) {
      showToast("Select a student", "error");
      return;
    }
    setSubmitting(true);
    try {
      await athleticsApi.addRoster(rosterModal.id, {
        studentId: rosterForm.studentId,
        jerseyNumber: rosterForm.jerseyNumber.trim() || undefined,
      });
      showToast("Athlete added to roster", "success");
      setRosterModal(null);
      setRosterForm({ studentId: "", jerseyNumber: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to add athlete", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRoster = async (teamId: string, studentId: string) => {
    const ok = await confirmAction({
      title: "Remove from roster?",
      text: "This student will be removed from the team roster.",
      confirmText: "Remove",
    });
    if (!ok) return;
    try {
      await athleticsApi.removeRoster(teamId, studentId);
      showToast("Athlete removed", "success");
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to remove athlete", "error");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventModal || !eventForm.title.trim() || !eventForm.startsAt) {
      showToast("Title and start time are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await athleticsApi.createEvent(eventModal.id, {
        title: eventForm.title.trim(),
        startsAt: new Date(eventForm.startsAt).toISOString(),
        location: eventForm.location.trim() || undefined,
        opponent: eventForm.opponent.trim() || undefined,
      });
      showToast("Event scheduled", "success");
      setEventModal(null);
      setEventForm({ title: "", startsAt: "", location: "", opponent: "" });
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to schedule event", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Athletics"
        subtitle="Teams, rosters, and fixture schedule."
        actions={
          <>
            <ExportCsvButton
              filename={`athletics_${tab}_${new Date().toISOString().slice(0, 10)}`}
              headers={
                tab === "schedule"
                  ? ["Team", "Event", "Starts", "Location", "Opponent", "Result"]
                  : ["Team", "Sport", "Season", "Coach", "Roster size"]
              }
              rows={
                tab === "schedule"
                  ? allEvents.map((e) => [
                      e.teamName,
                      e.title,
                      formatDateTime(e.startsAt),
                      e.location || "",
                      e.opponent || "",
                      e.result || "",
                    ])
                  : teams.map((t) => [
                      t.name,
                      t.sport,
                      t.season || "",
                      t.coachName || "",
                      String(t.roster.length),
                    ])
              }
              disabled={loading}
            />
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {tab === "teams" && (
              <Button onClick={() => setShowTeamModal(true)}>
                <Plus className="w-4 h-4" />
                New team
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Teams" value={stats.teams} icon={<Dumbbell className="w-5 h-5" />} />
        <StatTile label="Athletes" value={stats.athletes} icon={<Users className="w-5 h-5" />} />
        <StatTile label="Events" value={stats.events} icon={<Calendar className="w-5 h-5" />} />
        <StatTile label="Sports" value={stats.sports} />
      </div>

      <div className="flex gap-2">
        {(["teams", "schedule"] as Tab[]).map((t) => (
          <Button key={t} variant={tab === t ? "primary" : "secondary"} size="compact" onClick={() => setTab(t)}>
            {t === "teams" ? "Teams" : "Schedule"}
          </Button>
        ))}
      </div>

      <Surface>
        {loading ? (
          <p className="text-slate-500 font-medium py-8 text-center">Loading…</p>
        ) : tab === "teams" ? (
          teams.length === 0 ? (
            <p className="text-slate-500 font-medium py-8 text-center">No teams yet.</p>
          ) : (
            <div className="space-y-6">
              {teams.map((team) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{team.name}</h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {team.sport}
                        {team.season ? ` · ${team.season}` : ""}
                        {team.coachName ? ` · Coach: ${team.coachName}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="compact" variant="secondary" onClick={() => setRosterModal(team)}>Add athlete</Button>
                      <Button size="compact" onClick={() => setEventModal(team)}>Schedule event</Button>
                    </div>
                  </div>
                  {team.roster.length > 0 ? (
                    <ul className="space-y-2">
                      {team.roster.map((r) => (
                        <li key={r.studentId} className="flex justify-between gap-3 text-sm font-medium text-slate-700">
                          <span>
                            {r.studentName || r.studentId}
                            {r.jerseyNumber ? ` · #${r.jerseyNumber}` : ""}
                          </span>
                          <Button size="compact" variant="ghost" onClick={() => handleRemoveRoster(team.id, r.studentId)}>
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 font-medium">No roster members yet.</p>
                  )}
                </motion.div>
              ))}
            </div>
          )
        ) : allEvents.length === 0 ? (
          <p className="text-slate-500 font-medium py-8 text-center">No events scheduled.</p>
        ) : (
          <div className="space-y-3">
            {allEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-bold text-slate-900">{event.title}</p>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {(event as { teamName?: string }).teamName} · {formatDateTime(event.startsAt)}
                  {event.location ? ` · ${event.location}` : ""}
                  {event.opponent ? ` vs ${event.opponent}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <AnimatePresence>
        {showTeamModal && (
          <FeatureModalShell title="New team" onClose={() => setShowTeamModal(false)} footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowTeamModal(false)}>Cancel</Button>
              <Button loading={submitting} onClick={handleCreateTeam}>Create team</Button>
            </div>
          }>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCreateTeam}>
              <div><label className={fieldLabel}>Team name</label><input className={fieldInput} value={teamForm.name} onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div><label className={fieldLabel}>Sport</label><input className={fieldInput} value={teamForm.sport} onChange={(e) => setTeamForm((f) => ({ ...f, sport: e.target.value }))} required /></div>
              <div><label className={fieldLabel}>Season</label><input className={fieldInput} value={teamForm.season} onChange={(e) => setTeamForm((f) => ({ ...f, season: e.target.value }))} /></div>
              <div>
                <label className={fieldLabel}>Coach</label>
                <select className={fieldInput} value={teamForm.coachStaffId} onChange={(e) => setTeamForm((f) => ({ ...f, coachStaffId: e.target.value }))}>
                  <option value="">None</option>
                  {staff.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rosterModal && (
          <FeatureModalShell title="Add to roster" subtitle={rosterModal.name} onClose={() => setRosterModal(null)} footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRosterModal(null)}>Cancel</Button>
              <Button loading={submitting} onClick={handleAddRoster}>Add</Button>
            </div>
          }>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleAddRoster}>
              <div>
                <label className={fieldLabel}>Student</label>
                <select className={fieldInput} value={rosterForm.studentId} onChange={(e) => setRosterForm((f) => ({ ...f, studentId: e.target.value }))} required>
                  <option value="">Select student</option>
                  {students.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div><label className={fieldLabel}>Jersey number</label><input className={fieldInput} value={rosterForm.jerseyNumber} onChange={(e) => setRosterForm((f) => ({ ...f, jerseyNumber: e.target.value }))} /></div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {eventModal && (
          <FeatureModalShell title="Schedule event" subtitle={eventModal.name} onClose={() => setEventModal(null)} footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEventModal(null)}>Cancel</Button>
              <Button loading={submitting} onClick={handleCreateEvent}>Schedule</Button>
            </div>
          }>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleCreateEvent}>
              <div><label className={fieldLabel}>Title</label><input className={fieldInput} value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} required /></div>
              <div><label className={fieldLabel}>Start time</label><input type="datetime-local" className={fieldInput} value={eventForm.startsAt} onChange={(e) => setEventForm((f) => ({ ...f, startsAt: e.target.value }))} required /></div>
              <div><label className={fieldLabel}>Location</label><input className={fieldInput} value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} /></div>
              <div><label className={fieldLabel}>Opponent</label><input className={fieldInput} value={eventForm.opponent} onChange={(e) => setEventForm((f) => ({ ...f, opponent: e.target.value }))} /></div>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
