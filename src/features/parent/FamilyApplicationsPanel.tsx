import React from "react";
import { ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";

export type FamilyApplication = {
  id: string;
  applicationNumber: string | null;
  studentName: string;
  status: string;
  gradeLevelName: string | null;
  appliedAt: string;
};

export function useFamilyApplications() {
  const { accessToken, school } = useAuthStore();
  const [applications, setApplications] = React.useState<FamilyApplication[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!school?.id || !accessToken) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/schools/${school.id}/my-applications`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => (response.ok ? response.json() : []))
      .then((rows) => setApplications(Array.isArray(rows) ? rows : []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, [accessToken, school?.id]);

  return { applications, loading };
}

export function FamilyApplicationsPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation(["pages", "common"]);
  const { applications, loading } = useFamilyApplications();

  if (loading) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm font-medium">
        {t("children.applications.loading")}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center">
        <ClipboardList className="mx-auto mb-4 h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">{t("children.applications.empty")}</p>
      </div>
    );
  }

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
      {!compact ? (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("children.applications.title")}
            </h2>
            <p className="text-sm text-slate-500">{t("children.applications.subtitle")}</p>
          </div>
        </div>
      ) : null}
      <ul className="divide-y divide-slate-100">
        {applications.map((app) => (
          <li key={app.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-slate-900">{app.studentName}</p>
              <p className="text-sm text-slate-500">
                {app.applicationNumber || app.id.slice(0, 8)}
                {app.gradeLevelName ? ` · ${app.gradeLevelName}` : ""}
              </p>
            </div>
            <span className="inline-flex rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              {t(`admissions.status.${app.status}`, { defaultValue: app.status.replace(/_/g, " ") })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
