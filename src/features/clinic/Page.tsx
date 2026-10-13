import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HeartPulse, Plus, RefreshCw, Stethoscope } from "lucide-react";
import { PageShell, PageHeader, Surface, StatTile, Button } from "../../components/ui";
import { FeatureModalShell, fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { clinicApi } from "./api";
import { useDirectory, formatDateTime, todayIso } from "../campus-shared/useDirectory";
import { ExportCsvButton } from "../campus-shared/ExportCsvButton";

type ClinicVisit = {
  id: string;
  studentId: string;
  studentName?: string;
  reason: string;
  disposition: string;
  visitDate: string;
  parentNotified: boolean;
};

type HealthProfile = {
  bloodType?: string | null;
  allergies?: string | null;
  medications?: string | null;
  emergencyContact?: string | null;
};

type Tab = "visits" | "profile";

export function Clinic() {
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const { students } = useDirectory(school?.id);

  const [tab, setTab] = useState<Tab>("visits");
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [profileStudentId, setProfileStudentId] = useState("");
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    bloodType: "",
    allergies: "",
    medications: "",
    emergencyContact: "",
  });
  const [visitForm, setVisitForm] = useState({
    studentId: "",
    reason: "",
    treatment: "",
    disposition: "OBSERVATION",
    parentNotified: false,
  });

  const loadVisits = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const v = await clinicApi.fetchVisits(school.id, { date: todayIso() });
      setVisits(Array.isArray(v) ? v : []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load visits", "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, showToast]);

  useEffect(() => {
    if (tab === "visits") loadVisits();
  }, [tab, loadVisits]);

  const loadProfile = async (studentId: string) => {
    if (!school?.id || !studentId) return;
    setLoading(true);
    try {
      const p = await clinicApi.getHealthProfile(school.id, studentId);
      setProfile(p);
      setProfileForm({
        bloodType: p?.bloodType || "",
        allergies: p?.allergies || "",
        medications: p?.medications || "",
        emergencyContact: p?.emergencyContact || "",
      });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(
    () => ({
      today: visits.length,
      sentHome: visits.filter((v) => v.disposition === "SENT_HOME").length,
      referred: visits.filter((v) => v.disposition === "REFERRED").length,
      notified: visits.filter((v) => v.parentNotified).length,
    }),
    [visits]
  );

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !visitForm.studentId || !visitForm.reason.trim()) {
      showToast("Student and reason are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await clinicApi.createVisit(school.id, {
        studentId: visitForm.studentId,
        reason: visitForm.reason.trim(),
        treatment: visitForm.treatment.trim() || undefined,
        disposition: visitForm.disposition,
        parentNotified: visitForm.parentNotified,
      });
      showToast("Visit logged", "success");
      setShowVisitModal(false);
      setVisitForm({ studentId: "", reason: "", treatment: "", disposition: "OBSERVATION", parentNotified: false });
      await loadVisits();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to log visit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profileStudentId) return;
    setSubmitting(true);
    try {
      await clinicApi.saveHealthProfile(school.id, profileStudentId, {
        bloodType: profileForm.bloodType.trim() || null,
        allergies: profileForm.allergies.trim() || null,
        medications: profileForm.medications.trim() || null,
        emergencyContact: profileForm.emergencyContact.trim() || null,
      });
      showToast("Health profile saved", "success");
      await loadProfile(profileStudentId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save profile", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="Clinic"
        subtitle="Log visits and maintain student health profiles."
        actions={
          <>
            {tab === "visits" ? (
              <ExportCsvButton
                filename={`clinic_visits_${todayIso()}`}
                headers={["Student", "Reason", "Disposition", "Visit time", "Parent notified"]}
                rows={visits.map((v) => [
                  v.studentName || v.studentId,
                  v.reason,
                  v.disposition,
                  formatDateTime(v.visitDate),
                  v.parentNotified ? "Yes" : "No",
                ])}
                disabled={loading}
              />
            ) : null}
            <Button variant="secondary" onClick={() => (tab === "visits" ? loadVisits() : loadProfile(profileStudentId))} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {tab === "visits" && (
              <Button onClick={() => setShowVisitModal(true)}>
                <Plus className="w-4 h-4" />
                Log visit
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Today's visits" value={stats.today} icon={<Stethoscope className="w-5 h-5" />} />
        <StatTile label="Sent home" value={stats.sentHome} />
        <StatTile label="Referred" value={stats.referred} />
        <StatTile label="Parent notified" value={stats.notified} icon={<HeartPulse className="w-5 h-5" />} />
      </div>

      <div className="flex gap-2">
        {(["visits", "profile"] as Tab[]).map((t) => (
          <Button key={t} variant={tab === t ? "primary" : "secondary"} size="compact" onClick={() => setTab(t)}>
            {t === "visits" ? "Today's visits" : "Health profile"}
          </Button>
        ))}
      </div>

      <Surface>
        {tab === "visits" ? (
          loading ? (
            <p className="text-slate-500 font-medium py-8 text-center">Loading…</p>
          ) : visits.length === 0 ? (
            <p className="text-slate-500 font-medium py-8 text-center">No visits logged today.</p>
          ) : (
            <div className="space-y-3">
              {visits.map((visit) => (
                <motion.div
                  key={visit.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-bold text-slate-900">{visit.studentName || visit.studentId}</p>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    {visit.reason} · {visit.disposition} · {formatDateTime(visit.visitDate)}
                    {visit.parentNotified ? " · Parent notified" : ""}
                  </p>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div>
              <label className={fieldLabel}>Student</label>
              <select
                className={fieldInput}
                value={profileStudentId}
                onChange={(e) => {
                  setProfileStudentId(e.target.value);
                  if (e.target.value) loadProfile(e.target.value);
                }}
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {profileStudentId && (
              <form className="space-y-4" onSubmit={handleSaveProfile}>
                <div>
                  <label className={fieldLabel}>Blood type</label>
                  <input className={fieldInput} value={profileForm.bloodType} onChange={(e) => setProfileForm((f) => ({ ...f, bloodType: e.target.value }))} />
                </div>
                <div>
                  <label className={fieldLabel}>Allergies</label>
                  <textarea className={fieldInput} rows={2} value={profileForm.allergies} onChange={(e) => setProfileForm((f) => ({ ...f, allergies: e.target.value }))} />
                </div>
                <div>
                  <label className={fieldLabel}>Medications</label>
                  <textarea className={fieldInput} rows={2} value={profileForm.medications} onChange={(e) => setProfileForm((f) => ({ ...f, medications: e.target.value }))} />
                </div>
                <div>
                  <label className={fieldLabel}>Emergency contact</label>
                  <input className={fieldInput} value={profileForm.emergencyContact} onChange={(e) => setProfileForm((f) => ({ ...f, emergencyContact: e.target.value }))} />
                </div>
                {!profile && !loading && (
                  <p className="text-sm text-slate-500 font-medium">No profile on file — save to create one.</p>
                )}
                <Button loading={submitting} type="submit">Save profile</Button>
              </form>
            )}
          </div>
        )}
      </Surface>

      <AnimatePresence>
        {showVisitModal && (
          <FeatureModalShell
            title="Log clinic visit"
            onClose={() => setShowVisitModal(false)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowVisitModal(false)}>Cancel</Button>
                <Button loading={submitting} onClick={handleLogVisit}>Log visit</Button>
              </div>
            }
          >
            <form className="p-6 sm:p-8 space-y-4" onSubmit={handleLogVisit}>
              <div>
                <label className={fieldLabel}>Student</label>
                <select className={fieldInput} value={visitForm.studentId} onChange={(e) => setVisitForm((f) => ({ ...f, studentId: e.target.value }))} required>
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Reason</label>
                <input className={fieldInput} value={visitForm.reason} onChange={(e) => setVisitForm((f) => ({ ...f, reason: e.target.value }))} required />
              </div>
              <div>
                <label className={fieldLabel}>Treatment</label>
                <textarea className={fieldInput} rows={2} value={visitForm.treatment} onChange={(e) => setVisitForm((f) => ({ ...f, treatment: e.target.value }))} />
              </div>
              <div>
                <label className={fieldLabel}>Disposition</label>
                <select className={fieldInput} value={visitForm.disposition} onChange={(e) => setVisitForm((f) => ({ ...f, disposition: e.target.value }))}>
                  <option value="OBSERVATION">Observation</option>
                  <option value="SENT_HOME">Sent home</option>
                  <option value="REFERRED">Referred</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={visitForm.parentNotified} onChange={(e) => setVisitForm((f) => ({ ...f, parentNotified: e.target.checked }))} />
                Parent notified
              </label>
            </form>
          </FeatureModalShell>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
