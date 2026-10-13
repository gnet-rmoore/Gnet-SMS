import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { PageShell, PageHeader } from "../../components/ui";
import { FamilyApplicationsPanel } from "../../features/parent/FamilyApplicationsPanel";

export function MyApplications() {
  const { t } = useTranslation("pages");
  const { school } = useAuthStore();
  const slug = school?.slug || "";

  return (
    <PageShell>
      <PageHeader
        title={t("children.applications.pageTitle")}
        subtitle={t("children.applications.pageSubtitle")}
        actions={
          <Link
            to={`/${slug}/children`}
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("children.applications.backToChildren")}
          </Link>
        }
      />
      <FamilyApplicationsPanel />
    </PageShell>
  );
}
