import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Search,
  KeyRound,
  Users,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  XCircle,
  Download,
  UserCog,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { PageShell, PageHeader, Surface, StatTile, Button, DataTable, dataTableClass } from "../../components/ui";
import { UserAvatar } from "../../components/UserAvatar";
import { toast } from "../../lib/swal";
import {
  SuperAdminResetPasswordModal,
  type ResetPasswordTarget,
} from "./SuperAdminResetPasswordModal";
import { featuresByGroup, featureLabel, PLATFORM_FEATURE_KEYS } from "../../constants/platformFeatures";

type SchoolDetailData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  country: string;
  contactEmail: string;
  studentCount: number;
  staffCount: number;
  parentCount: number;
  userCount: number;
  planCode?: string | null;
  billingStatus?: string | null;
  billingProvider?: string | null;
  listPriceUsd?: number;
  internalNotes?: string | null;
  customDomain?: string | null;
  domainVerified?: boolean;
  domainTxtHost?: string | null;
  domainTxtValue?: string | null;
  domainEdge?: {
    cnameTarget?: string;
    steps?: string[];
    https?: string;
  };
  plan?: { label: string; code: string; monthlyPriceUsd?: number; features?: string[] };
  entitlements?: string[];
  entitlementsOverride?: string | null;
  quotaOverrides?: string | null;
  quotas?: { maxStudents: number | null; maxStaff: number | null; maxStorageMb?: number | null };
  health?: {
    score: number;
    onboardingComplete: boolean;
    trialExpired?: boolean;
    quotaOk?: { students: boolean; staff: boolean };
    lastAdminActivity?: string | null;
  } | null;
};

type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  photoUrl?: string | null;
};

type Tab = "students" | "staff" | "parents";

export const SchoolDetail = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const beginImpersonation = useAuthStore((s) => s.beginImpersonation);
  const [school, setSchool] = React.useState<SchoolDetailData | null>(null);
  const [tab, setTab] = React.useState<Tab>("students");
  const [items, setItems] = React.useState<DirectoryUser[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [loadingSchool, setLoadingSchool] = React.useState(true);
  const [loadingList, setLoadingList] = React.useState(true);
  const [error, setError] = React.useState("");
  const [resetUser, setResetUser] = React.useState<ResetPasswordTarget | null>(null);
  const [notes, setNotes] = React.useState("");
  const [plans, setPlans] = React.useState<{ code: string; label: string }[]>([]);
  const [impersonateReason, setImpersonateReason] = React.useState("");
  const [impersonateTarget, setImpersonateTarget] = React.useState<DirectoryUser | null>(null);
  const pageSize = 25;

  const reloadSchool = React.useCallback(async () => {
    if (!schoolId || !accessToken) return;
    const res = await fetch(`/api/super-admin/schools/${schoolId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load school");
    setSchool(data);
    setNotes(data.internalNotes || "");
  }, [schoolId, accessToken]);

  React.useEffect(() => {
    if (!schoolId || !accessToken) return;
    let cancelled = false;
    (async () => {
      setLoadingSchool(true);
      setError("");
      try {
        await reloadSchool();
        const p = await fetch("/api/super-admin/plans", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((r) => r.json());
        if (!cancelled && Array.isArray(p)) setPlans(p);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load school");
      } finally {
        if (!cancelled) setLoadingSchool(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, accessToken, reloadSchool]);

  React.useEffect(() => {
    if (!schoolId || !accessToken) return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (q) params.set("q", q);
        const res = await fetch(`/api/super-admin/schools/${schoolId}/${tab}?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load directory");
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setTotal(Number(data.total) || 0);
        }
      } catch (err: any) {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setError(err.message || "Failed to load directory");
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, accessToken, tab, page, q]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const saveNotes = async () => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/notes`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ internalNotes: notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Save failed" });
      return;
    }
    await toast.fire({ icon: "success", title: "Notes saved" });
  };

  const assignPlan = async (planCode: string) => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/plan`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Plan update failed" });
      return;
    }
    await toast.fire({ icon: "success", title: `Plan → ${planCode}` });
    await reloadSchool();
  };

  const [overrideFeatures, setOverrideFeatures] = React.useState<string[]>([]);
  const [useEntitlementOverride, setUseEntitlementOverride] = React.useState(false);

  React.useEffect(() => {
    if (!school) return;
    const has = Boolean(school.entitlementsOverride);
    setUseEntitlementOverride(has);
    setOverrideFeatures([...(school.entitlements || school.plan?.features || [])]);
  }, [school?.id, school?.entitlementsOverride, school?.entitlements, school?.plan?.features]);

  const saveEntitlementOverrides = async () => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/plan`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planCode: school?.planCode || "STANDARD",
        entitlementsOverride: useEntitlementOverride ? overrideFeatures : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Override save failed" });
      return;
    }
    await toast.fire({
      icon: "success",
      title: useEntitlementOverride ? "Entitlements override saved" : "Overrides cleared",
    });
    await reloadSchool();
  };

  const setBilling = async (billingStatus: string) => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/billing`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ billingStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Billing update failed" });
      return;
    }
    await toast.fire({ icon: "success", title: `Billing → ${billingStatus}` });
    await reloadSchool();
  };

  const setBackgroundImageUrl = async (url: string) => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/background-image`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ backgroundImageUrl: url }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Background image update failed" });
      return;
    }
    await toast.fire({ icon: "success", title: "Background image updated" });
    await reloadSchool();
  };

  const startCheckout = async () => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/billing/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Checkout failed" });
      return;
    }
    if (data.provider === "console" && data.id) {
      const complete = await fetch("/api/super-admin/billing/console-complete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: data.id }),
      });
      const done = await complete.json();
      if (!complete.ok) {
        await toast.fire({ icon: "error", title: done.error || "Console complete failed" });
        return;
      }
      await toast.fire({ icon: "success", title: "Marked ACTIVE_PAID (console checkout)" });
      await reloadSchool();
      return;
    }
    if (data.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
      await toast.fire({ icon: "info", title: "Stripe checkout opened" });
    }
  };

  const [domainInput, setDomainInput] = React.useState("");
  React.useEffect(() => {
    setDomainInput(school?.customDomain || "");
  }, [school?.customDomain]);

  const saveDomain = async () => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/domain`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customDomain: domainInput.trim() || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Domain update failed" });
      return;
    }
    await toast.fire({ icon: "success", title: "Domain saved — add TXT then Verify" });
    await reloadSchool();
  };

  const verifyDomain = async () => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/domain/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Verify failed" });
      return;
    }
    await toast.fire({ icon: "success", title: "Domain verified" });
    await reloadSchool();
  };

  const exportDsr = async () => {
    const res = await fetch(`/api/super-admin/schools/${schoolId}/export/dsr`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      await toast.fire({ icon: "error", title: data.error || "Export failed" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsr-${school?.slug || schoolId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [deleteReason, setDeleteReason] = React.useState("");
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const requestDelete = async () => {
    setDeleteReason("");
    setShowDeleteModal(true);
  };

  const confirmRequestDelete = async () => {
    if (deleteReason.trim().length < 5) {
      await toast.fire({ icon: "warning", title: "Reason required (min 5 chars)" });
      return;
    }
    const res = await fetch(`/api/super-admin/schools/${schoolId}/request-delete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: deleteReason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Request failed" });
      return;
    }
    setShowDeleteModal(false);
    await toast.fire({ icon: "success", title: "Delete requested — approve under Operators" });
    navigate("/super-admin/operators");
  };

  const runImpersonate = async () => {
    if (!impersonateTarget) return;
    const res = await fetch(`/api/super-admin/users/${impersonateTarget.id}/impersonate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: impersonateReason, minutes: 30 }),
    });
    const data = await res.json();
    if (!res.ok) {
      await toast.fire({ icon: "error", title: data.error || "Impersonation failed" });
      return;
    }
    beginImpersonation({
      accessToken: data.accessToken,
      user: data.user,
      school: data.school,
      capabilities: data.capabilities,
      reason: data.reason,
      expiresAt: data.expiresAt,
    });
    setImpersonateTarget(null);
    navigate(typeof window !== "undefined" ? window.location.origin + "/" + (data.school?.slug || "") + "/dashboard" : "/" + (data.school?.slug || "") + "/dashboard");
  };

  const tabs: { id: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: "students", label: "Students", count: school?.studentCount, icon: <GraduationCap className="w-4 h-4" /> },
    { id: "staff", label: "Staff", count: school?.staffCount, icon: <Briefcase className="w-4 h-4" /> },
    { id: "parents", label: "Parents", count: school?.parentCount, icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <PageShell width="wide">
      <div className="mb-2">
        <Link
          to="/super-admin/schools"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All schools
        </Link>
      </div>

      <PageHeader
        title={loadingSchool ? "School" : school?.name || "School"}
        subtitle={
          school
            ? `${school.slug} · ${school.status} · ${school.plan?.label || school.planCode || "—"} · ${school.country || "—"}`
            : "Loading school directory…"
        }
        actions={
          <>
            <Button variant="secondary" size="compact" onClick={() => void exportDsr()}>
              <Download className="w-4 h-4" />
              DSR export
            </Button>
            <Button variant="danger" size="compact" onClick={() => void requestDelete()}>
              <Trash2 className="w-4 h-4" />
              Request delete
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {school && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatTile label="Health" value={school.health?.score ?? "—"} />
            <StatTile label="Students" value={school.studentCount} icon={<GraduationCap className="w-5 h-5" />} />
            <StatTile label="Staff" value={school.staffCount} icon={<Briefcase className="w-5 h-5" />} />
            <StatTile label="Parents" value={school.parentCount} icon={<Users className="w-5 h-5" />} />
            <StatTile label="Quota students" value={`${school.studentCount}/${school.quotas?.maxStudents ?? "∞"}`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Surface variant="primary" className="p-6 space-y-4">
              <h3 className="font-extrabold tracking-tight text-slate-900">Plan & billing</h3>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium"
                value={school.planCode || "STANDARD"}
                onChange={(e) => void assignPlan(e.target.value)}
              >
                {(plans.length ? plans : [{ code: "STANDARD", label: "Standard" }]).map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Features:{" "}
                {(school.entitlements || []).length
                  ? `${(school.entitlements || []).length} modules · ${(school.entitlements || [])
                      .slice(0, 3)
                      .map(featureLabel)
                      .join(", ")}${
                      (school.entitlements || []).length > 3
                        ? ` +${(school.entitlements || []).length - 3} more`
                        : ""
                    }`
                  : "—"}
              </p>
              <div className="rounded-2xl border border-slate-100 p-4 space-y-4">
                <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={useEntitlementOverride}
                    onChange={(e) => setUseEntitlementOverride(e.target.checked)}
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">Custom entitlement override</span>
                    <span className="mt-0.5 block text-slate-500">
                      Choose from all {PLATFORM_FEATURE_KEYS.length} major platform modules.
                    </span>
                  </span>
                </label>
                <div
                  className={`max-h-72 space-y-4 overflow-y-auto pr-1 ${
                    useEntitlementOverride ? "" : "opacity-50 pointer-events-none"
                  }`}
                >
                  {featuresByGroup().map(({ group, items }) => (
                    <div key={group} className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {group}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map(({ key, label }) => (
                          <label
                            key={key}
                            className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-indigo-600"
                              checked={overrideFeatures.includes(key)}
                              onChange={() =>
                                setOverrideFeatures((prev) =>
                                  prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                                )
                              }
                            />
                            <span className="font-semibold text-slate-700 leading-snug">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="compact" variant="secondary" onClick={() => void saveEntitlementOverrides()}>
                  Save entitlements
                </Button>
              </div>
              <p className="text-sm text-slate-600">
                List price{" "}
                <span className="font-mono">${school.listPriceUsd ?? school.plan?.monthlyPriceUsd ?? 0}/mo</span>
                {" · "}
                Billing{" "}
                <span className="font-mono">{school.billingStatus || "TRIAL"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="compact" variant="secondary" onClick={() => void setBilling("COMP")}>
                  Mark COMP
                </Button>
                <Button size="compact" variant="secondary" onClick={() => void setBilling("PAST_DUE")}>
                  Past due
                </Button>
                <Button size="compact" onClick={() => void startCheckout()}>
                  Start checkout
                </Button>
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900">Custom domain</h4>
                  <Link
                    to="/super-admin/help"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    What is this?
                  </Link>
                </div>
                <input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="portal.myschool.edu"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="compact" variant="secondary" onClick={() => void saveDomain()}>
                    Save domain
                  </Button>
                  <Button size="compact" onClick={() => void verifyDomain()} disabled={!school.domainTxtValue}>
                    Verify TXT
                  </Button>
                </div>
                {school.domainTxtHost && school.domainTxtValue && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2 text-xs text-slate-600">
                    <p>
                      <span className="font-bold text-slate-800">1. TXT ownership</span> — add{" "}
                      <span className="font-mono">{school.domainTxtHost}</span> ={" "}
                      <span className="font-mono break-all">{school.domainTxtValue}</span>
                      {school.domainVerified ? (
                        <span className="ms-2 font-bold text-emerald-600">Verified</span>
                      ) : (
                        <span className="ms-2 font-bold text-amber-600">Pending</span>
                      )}
                    </p>
                    {school.domainEdge?.cnameTarget ? (
                      <p>
                        <span className="font-bold text-slate-800">2. CNAME</span> — point{" "}
                        <span className="font-mono">{school.customDomain}</span> →{" "}
                        <span className="font-mono">{school.domainEdge.cnameTarget}</span>
                      </p>
                    ) : null}
                    <p>
                      <span className="font-bold text-slate-800">3. HTTPS</span> — terminate TLS at the
                      platform edge (
                      <span className="font-mono">docker compose --profile edge up -d</span>
                      ). See <span className="font-mono">docs/CUSTOM_DOMAIN_EDGE.md</span>.
                    </p>
                    {Array.isArray(school.domainEdge?.steps) ? (
                      <ol className="list-decimal ps-4 space-y-1 text-slate-500">
                        {school.domainEdge.steps.map((step: string, idx: number) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                )}
              </div>
            </Surface>
            <Surface variant="primary" className="p-6 space-y-4">
              <h3 className="font-extrabold tracking-tight text-slate-900">Internal notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                placeholder="AE owner, contract notes…"
              />
              <Button size="compact" onClick={() => void saveNotes()}>
                Save notes
              </Button>
            </Surface>
          </div>
        </>
      )}

      <Surface variant="primary" className="p-0 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  tab === t.id ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.icon}
                {t.label}
                {typeof t.count === "number" && (
                  <span className={`font-mono text-xs ${tab === t.id ? "text-indigo-100" : "text-slate-400"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <form
            className="relative flex-1 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQ(searchInput.trim());
            }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </form>
        </div>

        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[32%]`}>User</th>
                <th className={`${dataTableClass.th} w-[16%]`}>Role</th>
                <th className={`${dataTableClass.th} w-[16%]`}>Status</th>
                <th className={`${dataTableClass.th} w-[16%]`}>Joined</th>
                <th className={`${dataTableClass.thEnd} w-[20%]`}>Actions</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loadingList ? (
                <tr>
                  <td colSpan={5} className={`${dataTableClass.tdEmpty} italic`}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${dataTableClass.tdEmpty} italic`}>
                    No {tab} found.
                  </td>
                </tr>
              ) : (
                items.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar userId={user.id} name={user.name} photoUrl={user.photoUrl} size="md" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 font-medium truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={dataTableClass.td}>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold inline-flex max-w-full truncate">
                        {user.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className={dataTableClass.td}>
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                          <XCircle className="w-3 h-3 shrink-0" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className={`${dataTableClass.td} text-sm font-medium text-slate-500 font-mono`}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className={dataTableClass.td}>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="compact"
                          className="px-2 min-w-8"
                          aria-label="Reset password"
                          title="Reset password"
                          onClick={() =>
                            setResetUser({
                              id: user.id,
                              name: user.name,
                              email: user.email,
                              role: user.role,
                            })
                          }
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        {(user.role === "SCHOOL_ADMIN" || user.role === "IT_ADMIN") && (
                          <Button
                            variant="ghost"
                            size="compact"
                            className="px-2 min-w-8"
                            aria-label="Impersonate user"
                            title="Impersonate user"
                            onClick={() => {
                              setImpersonateTarget(user);
                              setImpersonateReason("");
                            }}
                          >
                            <UserCog className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </DataTable>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500 font-medium">
              Page <span className="font-mono">{page}</span> of{" "}
              <span className="font-mono">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="secondary"
                size="compact"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Surface>

      <SuperAdminResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />

      {impersonateTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setImpersonateTarget(null)} />
          <div className="relative w-full max-w-md bg-white rounded-[32px] border border-slate-200 p-6 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 tracking-tight">Impersonate user</h3>
            <p className="text-sm text-slate-500">
              {impersonateTarget.name} ({impersonateTarget.email}) — 30 minute session, audited.
            </p>
            <input
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              placeholder="Support reason (required)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setImpersonateTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={impersonateReason.trim().length < 5}
                onClick={() => void runImpersonate()}
              >
                Start session
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[32px] border border-slate-200 p-6 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 tracking-tight">Request school delete</h3>
            <p className="text-sm text-slate-500">
              Dual-control: another Super Admin must approve (or solo OWNER force on Operators).
            </p>
            <input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Reason (required)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => void confirmRequestDelete()}>
                Request delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};
