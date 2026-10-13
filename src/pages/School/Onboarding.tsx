import React from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Palette,
  Layers,
  CreditCard,
  GraduationCap,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Users,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../lib/swal";
import {
  SETUP_STEPS,
  allRequiredDone,
  canOpenSetupStep,
  hasTeacher,
  isAdmissionPolicyReviewed,
  isBrandingDone,
  isCalendarReady,
  markAdmissionPolicyReviewed,
  setupStepHref,
  statusFromFetch,
  statusFromPredicate,
  type SetupStepId,
  type SetupStepStatus,
} from "../../features/onboarding/setupChecklist";

type ChecklistItem = {
  id: SetupStepId;
  label: string;
  status: SetupStepStatus;
  href: string;
  canOpen: boolean;
  required: boolean;
  icon: React.ElementType;
};

const STEP_ICONS: Record<SetupStepId, React.ElementType> = {
  branding: Palette,
  grades: GraduationCap,
  subjects: BookOpen,
  staff: Users,
  classrooms: Layers,
  calendar: CalendarDays,
  fees: CreditCard,
  admissionPolicy: ClipboardList,
};

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Post-provision school setup checklist — operational readiness
 * (branding, curriculum, teacher, classroom, calendar periods, fee templates).
 */
export default function SchoolOnboardingPage() {
  const { slug } = useParams();
  const school = useAuthStore((s) => s.school);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setSchool = useAuthStore((s) => s.setSchool);

  const [items, setItems] = React.useState<ChecklistItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [markedComplete, setMarkedComplete] = React.useState(
    Boolean(school?.onboardingComplete)
  );

  const schoolId = school?.id;
  const role = user?.role;

  const refresh = React.useCallback(async () => {
    const current = useAuthStore.getState().school;
    const token = useAuthStore.getState().accessToken;
    if (!current?.id || !token) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [
        schoolRes,
        gradesRes,
        subjectsRes,
        staffRes,
        classroomsRes,
        calendarRes,
        feesRes,
      ] = await Promise.all([
        fetch(`/api/schools/${current.id}`, { headers }),
        fetch(`/api/schools/${current.id}/grade-levels`, { headers }),
        fetch(`/api/schools/${current.id}/subjects`, { headers }),
        fetch(`/api/schools/${current.id}/staff`, { headers }),
        fetch(`/api/schools/${current.id}/classrooms`, { headers }),
        fetch(`/api/schools/${current.id}/calendar`, { headers }),
        fetch(`/api/schools/${current.id}/fee-templates`, { headers }),
      ]);

      const schoolJson = schoolRes.ok ? await readJson(schoolRes) : null;
      const gradesJson = gradesRes.ok ? await readJson(gradesRes) : null;
      const subjectsJson = subjectsRes.ok ? await readJson(subjectsRes) : null;
      const staffJson = staffRes.ok ? await readJson(staffRes) : null;
      const classroomsJson = classroomsRes.ok ? await readJson(classroomsRes) : null;
      const calendarJson = calendarRes.ok ? await readJson(calendarRes) : null;
      const feesJson = feesRes.ok ? await readJson(feesRes) : null;

      const liveSchool =
        schoolJson && typeof schoolJson === "object"
          ? (schoolJson as {
              logoUrl?: string | null;
              brandColor?: string | null;
              onboardingComplete?: boolean;
            })
          : null;

      if (liveSchool && schoolRes.ok) {
        const prev = useAuthStore.getState().school;
        if (prev) {
          const logoChanged = (liveSchool.logoUrl ?? null) !== (prev.logoUrl ?? null);
          const colorChanged =
            (liveSchool.brandColor ?? null) !== (prev.brandColor ?? null);
          const completeChanged =
            Boolean(liveSchool.onboardingComplete) !== Boolean(prev.onboardingComplete);
          if (logoChanged || colorChanged || completeChanged) {
            setSchool({
              ...prev,
              logoUrl: liveSchool.logoUrl ?? prev.logoUrl,
              brandColor: liveSchool.brandColor ?? prev.brandColor,
              onboardingComplete:
                liveSchool.onboardingComplete ?? prev.onboardingComplete,
            });
          }
          if (liveSchool.onboardingComplete) setMarkedComplete(true);
        }
      }

      const brandingSource = liveSchool ?? current;
      let brandingStatus: SetupStepStatus;
      if (schoolRes.ok) {
        brandingStatus = isBrandingDone({
          logoUrl: brandingSource.logoUrl,
          brandColor: brandingSource.brandColor,
        })
          ? "done"
          : "todo";
      } else if (
        isBrandingDone({
          logoUrl: current.logoUrl,
          brandColor: current.brandColor,
        })
      ) {
        brandingStatus = "done";
      } else {
        brandingStatus = "unknown";
      }

      const admissionReviewed = isAdmissionPolicyReviewed(current.id);
      const viewerRole = useAuthStore.getState().user?.role;

      const statusById: Record<SetupStepId, SetupStepStatus> = {
        branding: brandingStatus,
        grades: statusFromFetch(gradesRes.ok, gradesJson),
        subjects: statusFromFetch(subjectsRes.ok, subjectsJson),
        staff: statusFromPredicate(staffRes.ok, hasTeacher(staffJson)),
        classrooms: statusFromFetch(classroomsRes.ok, classroomsJson),
        calendar: statusFromPredicate(calendarRes.ok, isCalendarReady(calendarJson)),
        fees: statusFromFetch(feesRes.ok, feesJson),
        admissionPolicy: admissionReviewed ? "done" : "todo",
      };

      const next: ChecklistItem[] = SETUP_STEPS.map((step) => ({
        id: step.id,
        label: step.label,
        status: statusById[step.id],
        href: setupStepHref(slug, step.path),
        canOpen: canOpenSetupStep(viewerRole, step.id),
        required: step.required,
        icon: STEP_ICONS[step.id],
      }));

      setItems(next);
    } finally {
      setLoading(false);
    }
  }, [slug, setSchool]);

  React.useEffect(() => {
    if (!schoolId || !accessToken) return;
    void refresh();
  }, [schoolId, accessToken, refresh]);

  React.useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const markPolicyReviewed = () => {
    if (!schoolId) return;
    markAdmissionPolicyReviewed(schoolId);
    setItems((prev) =>
      prev.map((i) =>
        i.id === "admissionPolicy" ? { ...i, status: "done" as const } : i
      )
    );
    void toast.fire({ icon: "success", title: "Admission settings marked reviewed" });
  };

  const completeOnboarding = async () => {
    const current = useAuthStore.getState().school;
    const token = useAuthStore.getState().accessToken;
    const currentUser = useAuthStore.getState().user;
    if (!current?.id || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/schools/${current.id}/onboarding/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const body = (await readJson(res)) as { error?: string } | null;
        await toast.fire({
          icon: "error",
          title: body?.error || "Could not mark setup complete",
        });
        return;
      }
      if (currentUser) {
        setAuth(currentUser, token, { ...current, onboardingComplete: true });
        setMarkedComplete(true);
      }
      await toast.fire({ icon: "success", title: "Setup marked complete" });
    } catch {
      await toast.fire({ icon: "error", title: "Could not mark setup complete" });
    } finally {
      setSaving(false);
    }
  };

  const requiredItems = items.filter((i) => i.required);
  const softItems = items.filter((i) => !i.required);
  const requiredDone = requiredItems.filter((i) => i.status === "done").length;
  const hasUnknownRequired = requiredItems.some((i) => i.status === "unknown");
  const canMarkComplete = allRequiredDone(items) && !hasUnknownRequired;

  const renderRow = (item: ChecklistItem) => {
    const Icon = item.icon;
    const rowClass =
      "flex items-center gap-4 rounded-2xl border border-slate-100 p-4 transition-colors";

    const statusIcon =
      item.status === "done" ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Done" />
      ) : item.status === "unknown" ? (
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" aria-label="Unknown" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="To do" />
      );

    const iconBadge = (
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          item.status === "done"
            ? "bg-emerald-50 text-emerald-600"
            : item.status === "unknown"
              ? "bg-amber-50 text-amber-600"
              : "bg-slate-50 text-slate-400"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
    );

    const copy = (
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{item.label}</p>
        {!item.required ? (
          <p className="mt-0.5 text-xs text-slate-500">Recommended</p>
        ) : null}
        {item.status === "unknown" ? (
          <p className="mt-0.5 text-xs font-medium text-amber-700">
            Couldn’t verify — try Refresh
          </p>
        ) : null}
        {!item.canOpen && item.status !== "done" ? (
          <p className="mt-0.5 text-xs text-slate-500">
            Ask a School Admin to finish this step
          </p>
        ) : null}
      </div>
    );

    if (item.id === "admissionPolicy") {
      return (
        <div key={item.id} className={rowClass}>
          {iconBadge}
          {copy}
          {item.canOpen ? (
            <Link
              to={item.href}
              className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Open
            </Link>
          ) : null}
          {item.status !== "done" && item.canOpen ? (
            <button
              type="button"
              onClick={markPolicyReviewed}
              className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Mark reviewed
            </button>
          ) : null}
          {statusIcon}
        </div>
      );
    }

    if (item.canOpen) {
      return (
        <Link key={item.id} to={item.href} className={`${rowClass} hover:border-indigo-200`}>
          {iconBadge}
          {copy}
          {statusIcon}
        </Link>
      );
    }

    return (
      <div key={item.id} className={`${rowClass} opacity-90`}>
        {iconBadge}
        {copy}
        {statusIcon}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-8 px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            School setup
          </h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Finish these required steps so admissions, classrooms, and gradebook periods work
            smoothly. Recommended steps help but do not block Mark setup complete.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      {markedComplete ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-5 py-3 text-sm font-medium text-emerald-800">
          Setup marked complete. Steps below still reflect live school data.
        </div>
      ) : null}

      {role && role !== "SCHOOL_ADMIN" ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3 text-sm text-slate-600">
          Some steps are owned by School Admin. You can see live status; links open only
          where your role has access.
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
      >
        {loading && items.length === 0 ? (
          <p className="text-sm text-slate-500">Checking setup…</p>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Required
            </p>
            {requiredItems.map(renderRow)}
            {softItems.length > 0 ? (
              <>
                <p className="pt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recommended
                </p>
                {softItems.map(renderRow)}
              </>
            ) : null}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="text-sm text-slate-500">
            {requiredDone}/{requiredItems.length || 7} required complete
            {hasUnknownRequired ? " · some steps could not be verified" : ""}
          </p>
          <div className="flex gap-3">
            {role === "SCHOOL_ADMIN" || role === "PRINCIPAL" || role === "REGISTRAR" ? (
              <Link
                to={`/${slug}/admissions`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
              >
                Go to admissions <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              type="button"
              disabled={saving || !canMarkComplete}
              onClick={() => void completeOnboarding()}
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Mark setup complete"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
