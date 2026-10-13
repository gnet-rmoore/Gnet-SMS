import React from "react";
import { useAuthStore } from "../../store/authStore";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDashboardQuery } from "./hooks/useDashboardQuery";
import { getRoleDashboard } from "./registry";
import { RoleHomeShell } from "./components/RoleHomeShell";
import { AccountantDashboard } from "./components/AccountantDashboard";
import { DefaultRoleDashboard } from "./components/DefaultRoleDashboard";
import { ParentDashboard } from "./components/ParentDashboard";
import { StudentDashboard } from "./components/StudentDashboard";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { LeadershipDashboard } from "./components/LeadershipDashboard";
import { SpecialtyHubDashboard } from "./components/SpecialtyHubDashboard";
import { useGuideOptional } from "../platform-guide/GuideProvider";

export const SchoolDashboard = () => {
  const { t } = useTranslation("pages");
  const { user, capabilities, school } = useAuthStore();
  const {
    stats: statsData,
    summary: financeSummary,
    loading,
  } = useDashboardQuery();
  const { slug } = useParams();
  const guide = useGuideOptional();

  const def = getRoleDashboard(user?.role);
  const title = t(def.titleKey, { defaultValue: t("dashboard.title") });
  const subtitle = t(def.subtitleKey, { defaultValue: t("dashboard.subtitle") });

  let body: React.ReactNode;
  switch (def.body) {
    case "parent":
      body = <ParentDashboard />;
      break;
    case "accountant":
      body = (
        <AccountantDashboard
          financeSummary={financeSummary}
          user={user}
          slug={slug}
          loading={loading}
        />
      );
      break;
    case "student":
      body = <StudentDashboard />;
      break;
    case "teacher":
      body = <TeacherDashboard />;
      break;
    case "leadership":
      body = (
        <LeadershipDashboard
          loading={loading}
          statsData={statsData}
          kpiPreset={def.leadershipKpis || "school"}
        />
      );
      break;
    case "specialty":
      body = (
        <SpecialtyHubDashboard
          hubs={def.hubs || []}
          role={user?.role}
          schoolId={school?.id}
        />
      );
      break;
    default:
      body = <DefaultRoleDashboard loading={loading} statsData={statsData} user={user} />;
  }

  return (
    <RoleHomeShell
      title={title}
      subtitle={subtitle}
      slug={slug}
      quickActions={def.quickActions}
      capabilities={capabilities}
      showQuickActions={def.body !== "parent" && def.quickActions.length > 0}
      guideTrack={Boolean(guide?.track)}
      guideIncomplete={guide?.progress?.status !== "COMPLETED"}
      onStartTour={() => void guide?.startTour()}
    >
      {body}
    </RoleHomeShell>
  );
};
