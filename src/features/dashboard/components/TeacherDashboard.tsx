import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BookOpen,
  Users,
  ClipboardCheck,
  ClipboardList,
  Award,
  FileText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/authStore";
import { workspaceApi } from "../../classroom-workspace/api";
import type { ChartDatum } from "../lib/chartAggregates";
import {
  fetchTeacherDashboardAnalytics,
  type TeacherDashboardAnalytics,
} from "../lib/teacherDashboardAnalytics";
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
  DashboardBodyShell,
  DashboardHeroKpi,
  DashboardInlineLink,
  DashboardKpiSkeleton,
  DashboardKpiTile,
  DashboardLinkTile,
  DashboardListRow,
  DashboardPanel,
} from "./dashboardUi";

type TeacherKpis = {
  classCount: number | null;
  studentSeats: number | null;
};

const EMPTY_ANALYTICS: TeacherDashboardAnalytics = {
  attendance: [],
  assignments: [],
  quizzes: [],
  exams: [],
};

/**
 * Teacher home — classrooms, roster seats, and honest teaching analytics.
 */
export function TeacherDashboard() {
  const { t } = useTranslation("pages");
  const { slug } = useParams();
  const { school } = useAuthStore();
  const [kpis, setKpis] = useState<TeacherKpis>({
    classCount: null,
    studentSeats: null,
  });
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; students: number }>>(
    []
  );
  const [analytics, setAnalytics] = useState<TeacherDashboardAnalytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const raw = await workspaceApi.fetchMyClassrooms().catch(() => null);
        if (cancelled) return;
        if (raw == null) {
          setKpis({ classCount: null, studentSeats: null });
          setRooms([]);
          return;
        }
        const list = Array.isArray(raw) ? raw : (raw as any)?.classrooms || [];
        const mapped = list.map((c: any) => ({
          id: c.id,
          name: c.name || c.subject?.name || t("dashboard.teacher.classFallback"),
          students: Number(c._count?.members ?? c.memberCount ?? 0),
        }));
        const seats = mapped.reduce((s: number, r: { students: number }) => s + r.students, 0);
        setRooms(mapped.slice(0, 6));
        setKpis({
          classCount: mapped.length,
          studentSeats: seats,
        });

        if (school?.id && mapped.length > 0) {
          setChartsLoading(true);
          const data = await fetchTeacherDashboardAnalytics(
            school.id,
            mapped.map((r: { id: string }) => r.id)
          );
          if (!cancelled) setAnalytics(data);
        } else if (!cancelled) {
          setAnalytics(EMPTY_ANALYTICS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setChartsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school?.id, t]);

  const fmt = (n: number | null) => (n == null ? "—" : String(n));

  const c = (key: string) => t(`dashboard.charts.${key}`);
  const label = (name: string) =>
    t(`dashboard.charts.labels.${name}`, { defaultValue: name });

  const withLabels = (data: ChartDatum[]) =>
    data.map((d) => ({ ...d, name: label(d.name) }));

  const attendanceTotal = analytics.attendance.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return <DashboardKpiSkeleton count={3} />;
  }

  return (
    <DashboardBodyShell>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardHeroKpi
          icon={BookOpen}
          badge={t("dashboard.stats.myClasses")}
          label={t("dashboard.stats.myClasses")}
          value={fmt(kpis.classCount)}
        />
        <DashboardKpiTile
          icon={Users}
          tone="emerald"
          badge={t("dashboard.stats.rosterSeats")}
          label={t("dashboard.stats.rosterSeats")}
          value={fmt(kpis.studentSeats)}
          subtext={t("dashboard.teacher.rosterHint")}
        />
        <DashboardKpiTile
          icon={ClipboardCheck}
          tone="amber"
          badge={t("dashboard.stats.needsAttention")}
          label={t("dashboard.teacher.openTools")}
          value={t("dashboard.teacher.openTools")}
          subtext={t("dashboard.teacher.openToolsHint")}
        />
      </div>

      <DashboardFeaturedChartRow>
        <DashboardFeaturedChartWide>
          <DashboardChartCard title={c("teacherAssignments")} hint={c("teacherAssignmentsHint")}>
            <PremiumHorizontalBarChart
              data={withLabels(analytics.assignments)}
              emptyMessage={chartsLoading ? t("dashboard.loading") : c("noData")}
            />
          </DashboardChartCard>
        </DashboardFeaturedChartWide>
        <DashboardFeaturedChartSide>
          <DashboardChartCard title={c("teacherAttendance")} hint={c("teacherAttendanceHint")}>
            <PremiumDonutChart
              data={withLabels(analytics.attendance)}
              emptyMessage={chartsLoading ? t("dashboard.loading") : c("noData")}
              centerLabel={t("dashboard.accountant.total")}
              centerValue={
                chartsLoading ? "…" : attendanceTotal > 0 ? String(attendanceTotal) : undefined
              }
            />
          </DashboardChartCard>
        </DashboardFeaturedChartSide>
      </DashboardFeaturedChartRow>

      <DashboardChartsGrid>
        <DashboardChartCard title={c("teacherQuizzes")} hint={c("teacherQuizzesHint")}>
          <PremiumBarChart
            data={withLabels(analytics.quizzes)}
            emptyMessage={chartsLoading ? t("dashboard.loading") : c("noData")}
            layout="vertical"
          />
        </DashboardChartCard>
        <DashboardChartCard title={c("teacherExams")} hint={c("teacherExamsHint")}>
          <PremiumBarChart
            data={withLabels(analytics.exams)}
            emptyMessage={chartsLoading ? t("dashboard.loading") : c("noData")}
            layout="vertical"
          />
        </DashboardChartCard>
      </DashboardChartsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardPanel
          title={t("dashboard.teacher.myClassesTitle")}
          action={
            <DashboardInlineLink to={`/${slug}/classroom`}>
              {t("dashboard.teacher.viewAll")}
            </DashboardInlineLink>
          }
        >
          {rooms.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              {t("dashboard.teacher.noClasses")}
            </p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((r) => (
                <li key={r.id}>
                  <DashboardListRow
                    to={`/${slug}/classroom/${r.id}`}
                    label={r.name}
                    trailing={
                      <span className="text-xs font-mono font-bold text-slate-500 shrink-0">
                        {t("dashboard.teacher.studentsShort", { count: r.students })}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel title={t("dashboard.teacher.shortcutsTitle")}>
          <div className="grid grid-cols-1 gap-3">
            {[
              { to: "attendance", label: t("dashboard.actions.takeAttendance"), tone: "emerald" as const, icon: ClipboardCheck },
              { to: "gradebook", label: t("dashboard.actions.gradebook"), tone: "indigo" as const, icon: BookOpen },
              { to: "lesson-plans", label: t("dashboard.actions.lessonPlans"), tone: "amber" as const, icon: FileText },
              { to: "exams", label: t("dashboard.actions.examsAssessments"), tone: "rose" as const, icon: ClipboardList },
              { to: "grade-review", label: t("dashboard.actions.mySubmissions"), tone: "slate" as const, icon: Award },
            ].map((item) => (
              <DashboardLinkTile
                key={item.to}
                to={`/${slug}/${item.to}`}
                icon={item.icon}
                tone={item.tone}
                label={item.label}
              />
            ))}
          </div>
        </DashboardPanel>
      </div>
    </DashboardBodyShell>
  );
}
