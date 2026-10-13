import React from "react";
import { ArrowRight, BookOpen, CalendarDays, ClipboardList, CreditCard, GraduationCap, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { ChildSwitcher } from "../../components/ChildSwitcher";
import { UserAvatar } from "../../components/UserAvatar";
import { useSelectedChild } from "../../hooks/useSelectedChild";
import { FamilyApplicationsPanel, useFamilyApplications } from "../../features/parent/FamilyApplicationsPanel";

type Child = { id: string; name: string; email?: string; photoUrl?: string | null };

export const Children = () => {
  const { t } = useTranslation("pages");
  const { user, accessToken, school } = useAuthStore();
  const [children, setChildren] = React.useState<Child[]>([]);
  const { applications } = useFamilyApplications();
  const [loading, setLoading] = React.useState(true);
  const { studentId, selectChild } = useSelectedChild();
  const slug = school?.slug || "";

  React.useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/parents/${user.id}/children`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (response) => (response.ok ? response.json() : []))
      .then((rows) => setChildren(Array.isArray(rows) ? rows : []))
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, [accessToken, user?.id]);

  React.useEffect(() => {
    if (children.length && !children.some((child) => child.id === studentId)) {
      selectChild(children[0].id);
    }
  }, [children, selectChild, studentId]);

  const childHref = (path: string, childId: string) =>
    `/${slug}/${path}${path === "grades" ? `/${childId}` : `?studentId=${encodeURIComponent(childId)}`}`;
  const contactHref = school?.contactEmail ? `mailto:${school.contactEmail}` : school?.contactPhone ? `tel:${school.contactPhone}` : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">{t("children.title")}</h1>
          <p className="mt-1 text-slate-500 font-medium">{t("children.subtitle")}</p>
        </div>
        <ChildSwitcher children={children} studentId={studentId} onChange={selectChild} />
      </div>

      {applications.length > 0 ? (
        <div className="space-y-3">
          <FamilyApplicationsPanel />
          <div className="text-end">
            <Link
              to={`/${slug}/my-applications`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              {t("children.applications.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-[32px] border border-slate-200 bg-white" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{t("children.empty.title")}</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">{t("children.empty.body")}</p>
        </div>
      ) : (
        <>
          {children.length > 1 && (
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                {t("children.compare.title")}
              </p>
              <div className="flex flex-wrap gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => selectChild(child.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      studentId === child.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">{t("children.compare.hint")}</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {children.map((child, index) => (
              <motion.section
                key={child.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
              >
                <div className="flex items-center gap-4">
                  <UserAvatar
                    userId={child.id}
                    name={child.name}
                    photoUrl={child.photoUrl}
                    size="lg"
                    rounded="2xl"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-900">{child.name}</h2>
                    <p className="truncate text-sm font-medium text-slate-500">
                      {child.email || t("children.profileFallback")}
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-sm text-slate-500">{t("children.cardHint")}</p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      ["grades", t("children.links.grades"), BookOpen],
                      ["attendance", t("children.links.attendance"), CalendarDays],
                      ["fees", t("children.links.fees"), CreditCard],
                      ["classroom", t("children.links.classes"), Users],
                    ] as const
                  ).map(([path, label, Icon]) => (
                    <Link
                      key={path}
                      to={childHref(path, child.id)}
                      onClick={() => selectChild(child.id)}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-600"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        </>
      )}
      {contactHref ? (
        <a
          href={contactHref}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
        >
          {t("children.contactSchool")} <ArrowRight className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
};
