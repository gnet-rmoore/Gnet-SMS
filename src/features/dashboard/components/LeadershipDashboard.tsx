import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Layers,
  AlertCircle,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RecentActivityPanel } from "./RecentActivityPanel";
import { useAuthStore } from "../../../store/authStore";
import { reportsApi } from "../../reports/api";
import { academicCalendarApi } from "../../academics-shared/calendar/api";
import {
  aggregateLogSeverity,
  attendanceByGradeLevelChart,
  attendanceSnapshot,
  schoolPopulationChart,
  setupProgressChart,
} from "../lib/chartAggregates";
import {
  DashboardChartCard,
  DashboardChartsGrid,
} from "./charts/DashboardChartCard";
import {
  DashboardFeaturedChartRow,
  DashboardFeaturedChartSide,
  DashboardFeaturedChartWide,
} from "./charts/DashboardFeaturedChartRow";
import {
  PremiumBarChart,
  PremiumDonutChart,
  PremiumHorizontalBarChart,
} from "./charts/PremiumChartWidgets";
import {
  SETUP_STEPS,
  REQUIRED_SETUP_STEPS,
  isBrandingDone,
  isCalendarReady,
  hasTeacher,
  statusFromFetch,
  statusFromPredicate,
  isAdmissionPolicyReviewed,
  type SetupStepStatus,
} from "../../onboarding/setupChecklist";
import {
  DashboardBodyShell,
  DashboardHeroKpi,
  DashboardInlineLink,
  DashboardKpiSkeleton,
  DashboardKpiTile,
  DashboardPanel,
  dashboardToneAt,
  type DashboardTone,
} from "./dashboardUi";

export type LeadershipDashboardProps = {
  loading?: boolean;
  statsData?: {
    totalStudents?: number | null;
    totalTeachers?: number | null;
    totalClassrooms?: number | null;
    totalApplications?: number | null;
    pendingApplications?: number | null;
    recentLogs?: any[];
  } | null;
  kpiPreset?: "school" | "registrar" | "academic" | "ops" | "admin";
};

function fmtCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return String(n);
}

type KpiDef = {
  label: string;
  value: string;
  icon: typeof Users;
  tone: DashboardTone;
  badge: string;
  hint?: string;
};

/**
 * Leadership home — honest school counts + recent activity.
 * School Admin also sees remaining setup steps.
 */
export function LeadershipDashboard({
  loading,
  statsData,
  kpiPreset = "school",
}: LeadershipDashboardProps) {
  const { t } = useTranslation("pages");
  const { slug } = useParams();
  const { user, school, accessToken } = useAuthStore();
  const showSetup = kpiPreset === "admin" && user?.role === "SCHOOL_ADMIN";

  const [setupRemaining, setSetupRemaining] = useState<number | null>(null);
  const [setupComplete, setSetupComplete] = useState<number>(0);
  const [attendanceStats, setAttendanceStats] = useState<unknown>(null);
  const [setupItems, setSetupItems] = useState<
    Array<{ id: string; label: string; path: string; status: SetupStepStatus }>
  >([]);

  useEffect(() => {
    if (!showSetup || !school?.id || !accessToken) return;
    let cancelled = false;
    (async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [grades, subjects, staff, rooms, calendar, fees] = await Promise.all([
        fetch(`/api/schools/${school.id}/grade-levels`, { headers }).then(async (r) => ({
          ok: r.ok,
          data: r.ok ? await r.json() : null,
        })),
        fetch(`/api/schools/${school.id}/subjects`, { headers }).then(async (r) => ({
          ok: r.ok,
          data: r.ok ? await r.json() : null,
        })),
        fetch(`/api/schools/${school.id}/staff`, { headers }).then(async (r) => ({
          ok: r.ok,
          data: r.ok ? await r.json() : null,
        })),
        fetch(`/api/schools/${school.id}/classrooms`, { headers }).then(async (r) => ({
          ok: r.ok,
          data: r.ok ? await r.json() : null,
        })),
        academicCalendarApi
          .fetchCalendar(school.id)
          .then((data) => ({ ok: true, data }))
          .catch(() => ({ ok: false, data: null })),
        fetch(`/api/schools/${school.id}/fee-templates`, { headers }).then(async (r) => ({
          ok: r.ok,
          data: r.ok ? await r.json() : null,
        })),
      ]);
      if (cancelled) return;

      const statusById: Record<string, SetupStepStatus> = {
        branding: statusFromPredicate(
          true,
          isBrandingDone({ logoUrl: school.logoUrl, brandColor: school.brandColor })
        ),
        grades: statusFromFetch(grades.ok, grades.data),
        subjects: statusFromFetch(subjects.ok, subjects.data),
        staff: statusFromPredicate(staff.ok, hasTeacher(staff.data)),
        classrooms: statusFromFetch(rooms.ok, rooms.data),
        calendar: statusFromPredicate(calendar.ok, isCalendarReady(calendar.data)),
        fees: statusFromFetch(fees.ok, fees.data),
        admissionPolicy: statusFromPredicate(
          true,
          isAdmissionPolicyReviewed(school.id)
        ),
      };

      const items = SETUP_STEPS.map((s) => ({
        id: s.id,
        label: s.label,
        path: s.path,
        status: statusById[s.id] || "unknown",
      }));
      const remaining = REQUIRED_SETUP_STEPS.filter((s) => {
        const st = statusById[s.id];
        return st === "todo" || st === "unknown";
      }).length;

      setSetupItems(items.filter((i) => i.status === "todo"));
      setSetupRemaining(remaining);
      setSetupComplete(REQUIRED_SETUP_STEPS.length - remaining);
    })();
    return () => {
      cancelled = true;
    };
  }, [showSetup, school?.id, school?.logoUrl, school?.brandColor, accessToken]);

  useEffect(() => {
    if (!school?.id) return;
    let cancelled = false;
    void reportsApi.fetchAttendanceStats(school.id).then((data) => {
      if (!cancelled) setAttendanceStats(data);
    });
    return () => {
      cancelled = true;
    };
  }, [school?.id]);

  const tiles: KpiDef[] = [];

  if (kpiPreset === "registrar") {
    tiles.push(
      {
        label: t("dashboard.stats.totalStudents"),
        value: loading ? "…" : fmtCount(statsData?.totalStudents),
        icon: Users,
        tone: "emerald",
        badge: t("dashboard.stats.totalStudents"),
      },
      {
        label: t("dashboard.stats.totalApplications"),
        value: loading ? "…" : fmtCount(statsData?.totalApplications),
        icon: GraduationCap,
        tone: "indigo",
        badge: t("dashboard.stats.totalApplications"),
        hint:
          statsData?.totalApplications == null
            ? t("dashboard.leadership.noAppStats")
            : undefined,
      },
      {
        label: t("dashboard.stats.pendingApps"),
        value: loading ? "…" : fmtCount(statsData?.pendingApplications),
        icon: AlertCircle,
        tone: "amber",
        badge: t("dashboard.stats.pendingApps"),
      }
    );
  } else if (kpiPreset === "academic") {
    tiles.push(
      {
        label: t("dashboard.stats.totalTeachers"),
        value: loading ? "…" : fmtCount(statsData?.totalTeachers),
        icon: Users,
        tone: "emerald",
        badge: t("dashboard.stats.totalTeachers"),
      },
      {
        label: t("dashboard.stats.totalStudents"),
        value: loading ? "…" : fmtCount(statsData?.totalStudents),
        icon: GraduationCap,
        tone: "indigo",
        badge: t("dashboard.stats.totalStudents"),
      },
      {
        label: t("dashboard.stats.classrooms"),
        value: loading ? "…" : fmtCount(statsData?.totalClassrooms),
        icon: Layers,
        tone: "amber",
        badge: t("dashboard.stats.classrooms"),
        hint:
          statsData?.totalClassrooms == null
            ? t("dashboard.leadership.openClassrooms")
            : undefined,
      }
    );
  } else if (kpiPreset === "ops") {
    tiles.push(
      {
        label: t("dashboard.stats.totalTeachers"),
        value: loading ? "…" : fmtCount(statsData?.totalTeachers),
        icon: Users,
        tone: "emerald",
        badge: t("dashboard.stats.totalTeachers"),
        hint: t("dashboard.leadership.staffProxyHint"),
      },
      {
        label: t("dashboard.stats.totalStudents"),
        value: loading ? "…" : fmtCount(statsData?.totalStudents),
        icon: GraduationCap,
        tone: "indigo",
        badge: t("dashboard.stats.totalStudents"),
      }
    );
  } else {
    tiles.push(
      {
        label: t("dashboard.stats.totalStudents"),
        value: loading ? "…" : fmtCount(statsData?.totalStudents),
        icon: Users,
        tone: "emerald",
        badge: t("dashboard.stats.totalStudents"),
      },
      {
        label: t("dashboard.stats.totalTeachers"),
        value: loading ? "…" : fmtCount(statsData?.totalTeachers),
        icon: GraduationCap,
        tone: "indigo",
        badge: t("dashboard.stats.totalTeachers"),
      }
    );
    if (showSetup) {
      tiles.push({
        label: t("dashboard.stats.setupRemaining"),
        value: setupRemaining == null ? "…" : String(setupRemaining),
        icon: ClipboardCheck,
        tone: "amber",
        badge: t("dashboard.stats.setupRemaining"),
        hint:
          setupRemaining === 0
            ? t("dashboard.leadership.setupDone")
            : t("dashboard.leadership.setupHint"),
      });
    }
  }

  const hero = tiles[0];
  const secondary = tiles.slice(1);

  const c = (key: string) => t(`dashboard.charts.${key}`);
  const label = (name: string) =>
    t(`dashboard.charts.labels.${name}`, { defaultValue: name });
  const localize = (data: ReturnType<typeof schoolPopulationChart>) =>
    data.map((d) => ({ ...d, name: label(d.name) }));

  const population = localize(
    schoolPopulationChart(statsData?.totalStudents, statsData?.totalTeachers)
  );
  const attendance = localize(attendanceSnapshot(attendanceStats));
  const attendanceByGrade = localize(attendanceByGradeLevelChart(attendanceStats));
  const activity = localize(aggregateLogSeverity(statsData?.recentLogs || []));
  const setup = localize(
    showSetup && setupRemaining != null
      ? setupProgressChart(setupComplete, setupRemaining)
      : []
  );

  const populationTotal = population.reduce((sum, d) => sum + d.value, 0);
  const attendanceTotal = attendance.reduce((sum, d) => sum + d.value, 0);
  const setupTotal = setup.reduce((sum, d) => sum + d.value, 0);
  const isRegistrar = kpiPreset === "registrar";

  if (loading && !statsData) {
    return <DashboardKpiSkeleton count={Math.max(tiles.length, 3)} />;
  }

  return (
    <DashboardBodyShell>
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          tiles.length >= 4 ? "lg:grid-cols-4" : tiles.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
        } gap-4`}
      >
        {hero ? (
          <DashboardHeroKpi
            icon={hero.icon}
            badge={hero.badge}
            label={hero.label}
            value={hero.value}
          />
        ) : null}
        {secondary.map((tile, i) => (
          <DashboardKpiTile
            key={tile.label}
            icon={tile.icon}
            tone={tile.tone ?? dashboardToneAt(i + 1)}
            badge={tile.badge}
            label={tile.label}
            value={tile.value}
            subtext={tile.hint}
          />
        ))}
      </div>

      <DashboardFeaturedChartRow>
        <DashboardFeaturedChartWide>
          <DashboardChartCard title={c("schoolPopulation")} hint={c("schoolPopulationHint")}>
            <PremiumDonutChart
              data={population}
              emptyMessage={c("noData")}
              centerLabel={t("dashboard.accountant.total")}
              centerValue={populationTotal > 0 ? String(populationTotal) : undefined}
            />
          </DashboardChartCard>
        </DashboardFeaturedChartWide>
        <DashboardFeaturedChartSide>
          <DashboardChartCard title={c("attendanceToday")} hint={c("attendanceTodayHint")}>
            <PremiumDonutChart
              data={attendance}
              emptyMessage={c("noData")}
              centerLabel={t("dashboard.charts.labels.today", { defaultValue: "Today" })}
              centerValue={attendanceTotal > 0 ? String(attendanceTotal) : undefined}
            />
          </DashboardChartCard>
        </DashboardFeaturedChartSide>
      </DashboardFeaturedChartRow>

      <DashboardChartsGrid>
        {showSetup ? (
          <DashboardChartCard title={c("setupProgress")} hint={c("setupProgressHint")}>
            <PremiumDonutChart
              data={setup}
              emptyMessage={c("noData")}
              centerLabel={t("dashboard.accountant.total")}
              centerValue={setupTotal > 0 ? String(setupTotal) : undefined}
            />
          </DashboardChartCard>
        ) : isRegistrar ? (
          <DashboardChartCard
            title={c("attendanceByGradeLevel")}
            hint={c("attendanceByGradeLevelHint")}
            className="lg:col-span-3"
          >
            <PremiumHorizontalBarChart
              data={attendanceByGrade}
              emptyMessage={c("noData")}
            />
          </DashboardChartCard>
        ) : (
          <DashboardChartCard title={c("recentActivityMix")} hint={c("recentActivityMixHint")}>
            <PremiumHorizontalBarChart data={activity} emptyMessage={c("noData")} />
          </DashboardChartCard>
        )}
      </DashboardChartsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivityPanel loading={loading} recentLogs={statsData?.recentLogs} />
        </div>

        <div className="space-y-6">
          {showSetup && setupItems.length > 0 ? (
            <DashboardPanel title={t("dashboard.leadership.setupTitle")}>
              <ul className="space-y-2">
                {setupItems.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/${slug}/${item.path}`}
                      className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-amber-50/60 border border-amber-100 hover:border-amber-200 transition-colors"
                    >
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {item.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-amber-600 shrink-0 rtl:rotate-180" />
                    </Link>
                  </li>
                ))}
              </ul>
              <DashboardInlineLink to={`/${slug}/onboarding`} className="mt-4">
                {t("dashboard.leadership.openSetup")}
              </DashboardInlineLink>
            </DashboardPanel>
          ) : (
            <DashboardPanel
              title={t("dashboard.leadership.calendarTitle")}
              hint={t("dashboard.leadership.calendarBody")}
            >
              <DashboardInlineLink to={`/${slug}/calendar`}>
                {t("dashboard.leadership.openCalendar")}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </DashboardInlineLink>
            </DashboardPanel>
          )}
        </div>
      </div>
    </DashboardBodyShell>
  );
}
