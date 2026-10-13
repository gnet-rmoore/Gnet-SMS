import React, { useMemo } from "react";
import { ClipboardList, Mail, CheckCircle2, ShieldCheck, Building2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { PageShell, PageHeader, Surface, ListFilterBar, ListPagination } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../../features/list-filters";
import { useTranslation } from "react-i18next";
import { toast } from "../../lib/swal";
import {
  RegistrationDetailDrawer,
  RegistrationListPreview,
  type RegistrationDetail,
} from "./components/RegistrationDetailDrawer";

export const SchoolRegistrations = () => {
  const { t } = useTranslation(["pages", "common"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = React.useState<RegistrationDetail[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busyAction, setBusyAction] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<RegistrationDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [reveal, setReveal] = React.useState<{
    email: string;
    tempPassword: string;
    inviteUrl: string;
    schoolId?: string;
  } | null>(null);

  const fields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "status",
        label: t("common:status"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: [
          { value: "SUBMITTED", label: t("common:pending") },
          { value: "NEEDS_INFO", label: t("pages:superAdmin.registrationDetail.status.NEEDS_INFO") },
          { value: "APPROVED", label: t("common:approved") },
          { value: "REJECTED", label: t("common:rejected") },
          { value: "WITHDRAWN", label: t("pages:superAdmin.registrationDetail.status.WITHDRAWN") },
        ],
      },
    ],
    [t]
  );

  const filters = useListFilters({ fields, syncUrl: true, defaultPageSize: 50 });
  const status = filters.values.status;

  const load = React.useCallback(
    async (statusOverride?: string) => {
      setLoading(true);
      setError("");
      try {
        const effectiveStatus = statusOverride !== undefined ? statusOverride : status;
        const q = new URLSearchParams();
        if (effectiveStatus) q.set("status", effectiveStatus);
        q.set("page", String(filters.page));
        q.set("pageSize", String(filters.pageSize));
        if (filters.committedQ) q.set("q", filters.committedQ);
        const res = await fetch(`/api/super-admin/school-registrations?${q.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load");
        const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
        setRows(items);
        setTotal(typeof data.total === "number" ? data.total : items.length);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, status, filters.page, filters.pageSize, filters.committedQ]
  );

  const openIdFromUrl = searchParams.get("id");

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!openIdFromUrl || detailLoading || selectedId === openIdFromUrl) return;
    void openDetail(openIdFromUrl, false);
  }, [openIdFromUrl, accessToken]);

  const filteredRows = rows;

  const openDetail = async (id: string, syncUrl = true) => {
    setSelectedId(id);
    setDetailLoading(true);
    if (syncUrl) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("id", id);
        return next;
      });
    }
    try {
      const res = await fetch(`/api/super-admin/school-registrations/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load application");
      setDetail(data);
      setNotes(data.reviewNotes || "");
      setDrawerOpen(true);
    } catch (err: unknown) {
      setSelectedId(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("id");
        return next;
      });
      void toast.fire({
        icon: "error",
        title: err instanceof Error ? err.message : "Failed to load application",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDrawerOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("id");
      return next;
    });
  };

  const handleDrawerExitComplete = () => {
    setSelectedId(null);
    setDetail(null);
    setNotes("");
  };

  const act = async (action: "approve" | "reject" | "request-info") => {
    if (!selectedId) return;
    if (action === "request-info" && !notes.trim()) {
      void toast.fire({
        icon: "info",
        title: t("pages:superAdmin.registrationDetail.notesRequiredTitle"),
        text: t("pages:superAdmin.registrationDetail.notesRequiredBody"),
      });
      return;
    }

    setBusyAction(action);
    setError("");
    try {
      const res = await fetch(`/api/super-admin/school-registrations/${selectedId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");

      if (action === "approve") {
        if (data.tempPassword) {
          const schoolId = data.school?.id || data.registration?.schoolId;
          setReveal({
            email: data.admin?.email || data.registration?.applicantEmail,
            tempPassword: data.tempPassword,
            inviteUrl: data.inviteUrl,
            schoolId: schoolId || undefined,
          });
        }
        const schoolId = data.school?.id || data.registration?.schoolId;
        void toast.fire({
          icon: "success",
          title: t("pages:superAdmin.registrationDetail.approvedToast"),
          ...(schoolId
            ? {
                footer: `<a href="/super-admin/schools/${schoolId}">Open school</a>`,
              }
            : {}),
        });
        closeDetail();
        await load();
      } else if (action === "request-info") {
        void toast.fire({
          icon: "success",
          title: t("pages:superAdmin.registrationDetail.infoRequestedToast"),
        });
        filters.setValue("status", "NEEDS_INFO");
        await load("NEEDS_INFO");
        closeDetail();
      } else if (action === "reject") {
        void toast.fire({ icon: "success", title: t("pages:superAdmin.registrationDetail.rejectedToast") });
        closeDetail();
        await load();
      } else {
        closeDetail();
        await load();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Action failed";
      setError(message);
      void toast.fire({ icon: "error", title: message });
    } finally {
      setBusyAction("");
    }
  };

  const workflowSteps = [
    {
      icon: Building2,
      title: t("pages:superAdmin.registrationWorkflow.step1Title"),
      body: t("pages:superAdmin.registrationWorkflow.step1Body"),
    },
    {
      icon: Mail,
      title: t("pages:superAdmin.registrationWorkflow.step2Title"),
      body: t("pages:superAdmin.registrationWorkflow.step2Body"),
    },
    {
      icon: ShieldCheck,
      title: t("pages:superAdmin.registrationWorkflow.step3Title"),
      body: t("pages:superAdmin.registrationWorkflow.step3Body"),
    },
    {
      icon: CheckCircle2,
      title: t("pages:superAdmin.registrationWorkflow.step4Title"),
      body: t("pages:superAdmin.registrationWorkflow.step4Body"),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title={t("pages:superAdmin.registrations")}
        subtitle={t("pages:superAdmin.registrationsSubtitleLong")}
      />

      <Surface variant="nested" className="space-y-4">
        <div>
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
            {t("pages:superAdmin.registrationWorkflow.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{t("pages:superAdmin.registrationWorkflow.intro")}</p>
        </div>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <step.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t("pages:superAdmin.registrationWorkflow.stepLabel", { n: index + 1 })}
                </p>
                <p className="text-sm font-bold text-slate-900">{step.title}</p>
                <p className="text-xs leading-relaxed text-slate-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-500">
          {t("pages:superAdmin.registrationWorkflow.publicFormHint")}{" "}
          <Link to="/register-school" className="font-semibold text-indigo-600 hover:underline">
            /register-school
          </Link>
        </p>
      </Surface>

      <ListFilterBar
        fields={fields}
        q={filters.q}
        onSearchChange={filters.setQ}
        values={filters.values}
        onValueChange={filters.setValue}
        onClear={filters.clear}
        searchPlaceholder={t("pages:superAdmin.registrationDetail.searchPlaceholder")}
        shownCount={filteredRows.length}
        totalCount={total}
        savedViewsScope="platform:registrations"
      />

      {reveal ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="font-semibold text-emerald-900">
            {t("pages:superAdmin.registrationDetail.credentialsBanner")}
          </p>
          <p className="font-mono text-sm text-emerald-900">
            {t("common:email")}: {reveal.email}
          </p>
          <p className="font-mono text-sm text-emerald-900">
            {t("pages:superAdmin.registrationDetail.tempPassword")}: {reveal.tempPassword}
          </p>
          <p className="break-all text-sm text-emerald-800">
            {t("pages:superAdmin.registrationDetail.inviteLink")}: {reveal.inviteUrl}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {reveal.schoolId ? (
              <Link
                to={`/super-admin/schools/${reveal.schoolId}`}
                className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {t("pages:superAdmin.registrationDetail.openSchool")}
              </Link>
            ) : null}
            <button type="button" className="text-sm text-emerald-700 underline" onClick={() => setReveal(null)}>
              {t("common:close")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <Surface variant="primary" className="p-6">
        {loading ? (
          <p className="text-sm text-slate-500">{t("common:loading")}</p>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            {filters.hasActiveFilters
              ? t("pages:listFilters.noMatches")
              : t("pages:superAdmin.registrationDetail.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((r) => (
              <RegistrationListPreview
                key={r.id}
                registration={r}
                onOpen={() => void openDetail(r.id)}
              />
            ))}
          </div>
        )}
        <ListPagination
          total={total}
          page={filters.page}
          pageSize={filters.pageSize}
          onPageChange={filters.setPage}
          onPageSizeChange={filters.setPageSize}
        />
      </Surface>

      <RegistrationDetailDrawer
        open={drawerOpen && !!detail}
        registration={detail}
        notes={notes}
        onNotesChange={setNotes}
        busyAction={busyAction}
        onClose={closeDetail}
        onExitComplete={handleDrawerExitComplete}
        onApprove={() => void act("approve")}
        onReject={() => void act("reject")}
        onRequestInfo={() => void act("request-info")}
      />

      {selectedId && detailLoading ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20">
          <p className="rounded-2xl bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-lg">
            {t("pages:superAdmin.registrationDetail.loadingApplication")}
          </p>
        </div>
      ) : null}
    </PageShell>
  );
};
