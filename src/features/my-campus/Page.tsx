import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Bed,
  BookOpen,
  Bus,
  HeartPulse,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { PageShell, PageHeader, Surface, Button } from "../../components/ui";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { ChildSwitcher } from "../../components/ChildSwitcher";
import { useSelectedChild } from "../../hooks/useSelectedChild";
import { formatDate, formatDateTime } from "../campus-shared/useDirectory";
import { myCampusApi, type MyCampusSummary } from "./api";

type Child = { id: string; name: string; photoUrl?: string | null };

function dispositionLabel(value: string) {
  switch (value) {
    case "SENT_HOME":
      return "Sent home";
    case "REFERRED":
      return "Referred";
    default:
      return "Observation";
  }
}

export function MyCampus() {
  const { school, user, accessToken } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const isParent = user?.role === "PARENT";
  const { studentId, selectChild } = useSelectedChild();

  const [children, setChildren] = useState<Child[]>([]);
  const [summary, setSummary] = useState<MyCampusSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isParent || !user?.id) return;
    fetch(`/api/parents/${user.id}/children`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((rows) => setChildren(Array.isArray(rows) ? rows : []))
      .catch(() => setChildren([]));
  }, [accessToken, isParent, user?.id]);

  useEffect(() => {
    if (isParent && children.length && !children.some((c) => c.id === studentId)) {
      selectChild(children[0].id);
    }
  }, [children, isParent, selectChild, studentId]);

  const load = useCallback(async () => {
    if (!school?.id) return;
    if (isParent && !studentId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await myCampusApi.fetchSummary(
        school.id,
        isParent ? studentId : undefined
      );
      setSummary(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load campus services", "error");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [isParent, school?.id, showToast, studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName =
    summary?.studentName ||
    (isParent ? children.find((c) => c.id === studentId)?.name : user?.name) ||
    "Student";

  return (
    <PageShell className="pb-16">
      <PageToast toast={toast} />
      <PageHeader
        title="My campus services"
        subtitle={
          isParent
            ? "Transport, clinic, library, and boarding information for your linked children."
            : "Your transport route, clinic visits, library loans, and boarding assignment."
        }
        actions={
          <>
            {isParent && children.length > 0 ? (
              <ChildSwitcher children={children} studentId={studentId} onChange={selectChild} />
            ) : null}
            <Button variant="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

      {isParent && !loading && children.length === 0 ? (
        <Surface className="p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-extrabold tracking-tight text-slate-900">No children linked</p>
          <p className="text-sm text-slate-500 font-medium mt-2">
            Contact the school office to link a student to your parent account.
          </p>
        </Surface>
      ) : loading ? (
        <Surface className="p-8 text-center text-slate-500 font-medium">Loading…</Surface>
      ) : !summary ? (
        <Surface className="p-8 text-center text-slate-500 font-medium">
          No campus information available yet.
        </Surface>
      ) : (
        <div className="space-y-6">
          <p className="text-sm font-medium text-slate-500">
            Showing records for <span className="font-bold text-slate-900">{displayName}</span>
          </p>

          <ModuleSection
            icon={<Bus className="w-5 h-5" />}
            title="Transport"
            enabled={summary.transport.enabled}
            hasData={Boolean(summary.transport.data)}
            empty="No bus route assigned."
          >
            {summary.transport.data ? (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-extrabold tracking-tight text-slate-900">
                    {summary.transport.data.routeName}
                  </p>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Status: {summary.transport.data.status === "ACTIVE" ? "Active" : "Inactive"}
                    {summary.transport.data.vehicle
                      ? ` · ${summary.transport.data.vehicle.plateNumber} (${summary.transport.data.vehicle.model})`
                      : ""}
                  </p>
                  {summary.transport.data.assignedStop ? (
                    <p className="text-sm font-medium text-indigo-700 mt-2">
                      Your stop: {summary.transport.data.assignedStop.name}
                      {summary.transport.data.assignedStop.pickupTime
                        ? ` · ${summary.transport.data.assignedStop.pickupTime}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                {summary.transport.data.stops.length > 0 ? (
                  <ol className="space-y-1 text-sm text-slate-700 font-medium">
                    {summary.transport.data.stops.map((stop, i) => (
                      <li key={`${stop.name}-${i}`}>
                        {i + 1}. {stop.name}
                        {stop.pickupTime ? ` · ${stop.pickupTime}` : ""}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}
          </ModuleSection>

          <ModuleSection
            icon={<BookOpen className="w-5 h-5" />}
            title="Library"
            enabled={summary.library.enabled}
            hasData={summary.library.data.loans.length > 0}
            empty="No books checked out."
          >
            {summary.library.data.loans.length > 0 ? (
              <ul className="space-y-3">
                {summary.library.data.loans.map((loan) => (
                  <li
                    key={loan.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{loan.title}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Checked out {formatDate(loan.loanedAt)} · Due {formatDate(loan.dueAt)}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        loan.status === "OVERDUE"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {loan.status === "OVERDUE" ? "Overdue" : "On loan"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </ModuleSection>

          <ModuleSection
            icon={<HeartPulse className="w-5 h-5" />}
            title="Clinic"
            enabled={summary.clinic.enabled}
            hasData={
              Boolean(summary.clinic.data.healthProfile) ||
              summary.clinic.data.recentVisits.length > 0
            }
            empty="No clinic visits on file."
          >
            <div className="space-y-4">
              {summary.clinic.data.healthProfile ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Health profile (read-only)
                  </p>
                  {summary.clinic.data.healthProfile.bloodType ? (
                    <p>
                      <span className="text-slate-500">Blood type:</span>{" "}
                      {summary.clinic.data.healthProfile.bloodType}
                    </p>
                  ) : null}
                  {summary.clinic.data.healthProfile.allergies ? (
                    <p>
                      <span className="text-slate-500">Allergies:</span>{" "}
                      {summary.clinic.data.healthProfile.allergies}
                    </p>
                  ) : null}
                  {summary.clinic.data.healthProfile.emergencyContact ? (
                    <p>
                      <span className="text-slate-500">Emergency contact:</span>{" "}
                      {summary.clinic.data.healthProfile.emergencyContact}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {summary.clinic.data.recentVisits.length > 0 ? (
                <ul className="space-y-3">
                  {summary.clinic.data.recentVisits.map((visit) => (
                    <li
                      key={visit.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <p className="font-bold text-slate-900">{visit.reason}</p>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        {formatDateTime(visit.visitDate)} · {dispositionLabel(visit.disposition)}
                        {visit.parentNotified ? " · School notified guardian" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </ModuleSection>

          <ModuleSection
            icon={<Bed className="w-5 h-5" />}
            title="Hostel"
            enabled={summary.hostel.enabled}
            hasData={Boolean(summary.hostel.data)}
            empty="No active boarding assignment."
          >
            {summary.hostel.data ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-extrabold tracking-tight text-slate-900">
                  {summary.hostel.data.building} · Room {summary.hostel.data.room}
                </p>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Checked in {formatDate(summary.hostel.data.checkIn)}
                </p>
              </div>
            ) : null}
          </ModuleSection>

          <Surface className="p-4 text-xs text-slate-500 font-medium">
            Counseling records are confidential and are not shown here. Contact the school
            counselor directly for wellbeing questions.
          </Surface>
        </div>
      )}
    </PageShell>
  );
}

function ModuleSection({
  icon,
  title,
  enabled,
  hasData,
  empty,
  children,
}: {
  icon: ReactNode;
  title: string;
  enabled: boolean;
  hasData: boolean;
  empty: string;
  children: ReactNode;
}) {
  if (!enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Surface className="p-6 opacity-70">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            {icon}
            <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          </div>
          <p className="text-sm font-medium text-slate-500">
            This module is not enabled on your school&apos;s plan.
          </p>
        </Surface>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Surface className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-indigo-600">
          {icon}
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
        </div>
        {hasData ? children : <p className="text-sm font-medium text-slate-500">{empty}</p>}
      </Surface>
    </motion.div>
  );
}
