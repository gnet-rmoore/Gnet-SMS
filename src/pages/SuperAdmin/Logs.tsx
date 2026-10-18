import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  FileText,
  User,
  AlertCircle,
  XCircle,
  Info,
  ShieldAlert,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  X,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  PageShell,
  PageHeader,
  Surface,
  Button,
  ListFilterBar,
  ListPagination,
  DataTable,
  dataTableClass,
  StatTile,
  fieldControlClass,
} from "../../components/ui";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { ActivityFeedPanel } from "./components/ActivityFeedPanel";
import { LogDetailDrawer } from "./components/LogDetailDrawer";
import {
  actorLabel,
  csvEscape,
  levelStyle,
  outcomeStyle,
  relativeTime,
  targetLabel,
  type LogEntry,
} from "./logTypes";
import {
  useListFilters,
  parseFilterLogic,
  encodeFilterLogic,
  matchFilterLogic,
  type FilterFieldDef,
  type FilterLogicGroup,
} from "../../features/list-filters";

type ClauseRow = { field: string; op: "eq" | "contains"; value: string };
const MAX_CLAUSES = 3;

function DeviceIcon({ type }: { type?: string | null }) {
  if (type === "Mobile") return <Smartphone className="h-3.5 w-3.5" aria-hidden />;
  if (type === "Tablet") return <Tablet className="h-3.5 w-3.5" aria-hidden />;
  return <Monitor className="h-3.5 w-3.5" aria-hidden />;
}

export const Logs = () => {
  const { t } = useTranslation(["pages", "common"]);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState<{
    total: number;
    byCategory: Record<string, number>;
    byLevel: Record<string, number>;
    byOutcome: Record<string, number>;
  }>({ total: 0, byCategory: {}, byLevel: {}, byOutcome: {} });
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<LogEntry | null>(null);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [autoRefresh, setAutoRefresh] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  const fields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "level",
        label: t("superAdmin.logsUi.level"),
        type: "enum",
        primary: true,
        allLabel: t("superAdmin.logsUi.allLevels"),
        options: [
          { value: "INFO", label: t("superAdmin.logsUi.levelInfo") },
          { value: "WARNING", label: t("superAdmin.logsUi.levelWarning") },
          { value: "ERROR", label: t("superAdmin.logsUi.levelError") },
          { value: "CRITICAL", label: t("superAdmin.logsUi.levelCritical") },
        ],
      },
      {
        key: "outcome",
        label: t("superAdmin.logsUi.outcome"),
        type: "enum",
        primary: true,
        allLabel: t("superAdmin.logsUi.allOutcomes"),
        options: [
          { value: "SUCCESS", label: t("superAdmin.logsUi.outcomeSuccess") },
          { value: "FAILURE", label: t("superAdmin.logsUi.outcomeFailure") },
          { value: "DENIED", label: t("superAdmin.logsUi.outcomeDenied") },
          { value: "PENDING", label: t("superAdmin.logsUi.outcomePending") },
        ],
      },
      {
        key: "category",
        label: t("superAdmin.logsUi.category"),
        type: "enum",
        allLabel: t("superAdmin.logsUi.allCategories"),
        options: [
          { value: "AUTH", label: t("superAdmin.logsUi.catAuth") },
          { value: "SESSION", label: t("superAdmin.logsUi.catSession") },
          { value: "USER_MGMT", label: t("superAdmin.logsUi.catUserMgmt") },
          { value: "ROLE", label: t("superAdmin.logsUi.catRole") },
          { value: "SECURITY", label: t("superAdmin.logsUi.catSecurity") },
          { value: "SCHOOLS", label: t("superAdmin.logsUi.catSchools") },
          { value: "BILLING", label: t("superAdmin.logsUi.catBilling") },
          { value: "SUPER_ADMIN", label: t("superAdmin.logsUi.catSuperAdmin") },
          { value: "SETTINGS", label: t("superAdmin.logsUi.catSettings") },
          { value: "COMMUNICATION", label: t("superAdmin.logsUi.catComms") },
          { value: "EXPORT", label: t("superAdmin.logsUi.catExport") },
          { value: "SYSTEM", label: t("superAdmin.logsUi.catSystem") },
        ],
      },
      {
        key: "module",
        label: t("superAdmin.logsUi.module"),
        type: "enum",
        allLabel: t("superAdmin.logsUi.allModules"),
        options: [
          { value: "AUTH", label: t("superAdmin.logsUi.moduleAuth") },
          { value: "USERS", label: t("superAdmin.logsUi.moduleUsers") },
          { value: "ROLES", label: t("superAdmin.logsUi.moduleRoles") },
          { value: "SCHOOLS", label: t("superAdmin.logsUi.moduleSchools") },
          { value: "SECURITY", label: t("superAdmin.logsUi.moduleSecurity") },
          { value: "SUPER_ADMIN", label: t("superAdmin.logsUi.moduleSuperAdmin") },
          { value: "SETTINGS", label: t("superAdmin.logsUi.moduleSettings") },
          { value: "BILLING", label: t("superAdmin.logsUi.moduleBilling") },
          { value: "SYSTEM", label: t("superAdmin.logsUi.moduleSystem") },
        ],
      },
      {
        key: "authMethod",
        label: t("superAdmin.logsUi.authMethod"),
        type: "enum",
        allLabel: t("superAdmin.logsUi.allAuthMethods"),
        options: [
          { value: "PASSWORD", label: t("superAdmin.logsUi.authPassword") },
          { value: "MFA", label: t("superAdmin.logsUi.authMfa") },
          { value: "TOTP", label: t("superAdmin.logsUi.authTotp") },
          { value: "SMS", label: t("superAdmin.logsUi.authSms") },
          { value: "SSO", label: t("superAdmin.logsUi.authSso") },
          { value: "API_KEY", label: t("superAdmin.logsUi.authApiKey") },
        ],
      },
      {
        key: "dataSensitivity",
        label: t("superAdmin.logsUi.sensitivity"),
        type: "enum",
        allLabel: t("superAdmin.logsUi.allSensitivity"),
        options: [
          { value: "PUBLIC", label: t("superAdmin.logsUi.sensPublic") },
          { value: "INTERNAL", label: t("superAdmin.logsUi.sensInternal") },
          { value: "CONFIDENTIAL", label: t("superAdmin.logsUi.sensConfidential") },
          { value: "PII", label: t("superAdmin.logsUi.sensPii") },
          { value: "SECRET", label: t("superAdmin.logsUi.sensSecret") },
        ],
      },
    ],
    [t]
  );

  const filters = useListFilters({ fields, syncUrl: true, defaultPageSize: 20 });

  const clauseFieldOptions = useMemo(
    () => [
      { value: "level", label: t("superAdmin.logsUi.level") },
      { value: "category", label: t("superAdmin.logsUi.category") },
      { value: "module", label: t("superAdmin.logsUi.module") },
      { value: "action", label: t("superAdmin.logsUi.action") },
      { value: "details", label: t("superAdmin.logsUi.details") },
      { value: "userEmail", label: t("superAdmin.logsUi.email") },
      { value: "ipAddress", label: t("superAdmin.logsUi.ip") },
      { value: "targetUserEmail", label: t("superAdmin.logsUi.targetEmail") },
      { value: "correlationId", label: t("superAdmin.logsUi.correlationId") },
    ],
    [t]
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const logView = searchParams.get("view") === "activity" ? "activity" : "platform";
  const initialLogicGroup = useMemo(() => parseFilterLogic(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [logic, setLogic] = useState<"AND" | "OR">(initialLogicGroup.logic);
  const [clauses, setClauses] = useState<ClauseRow[]>(() =>
    initialLogicGroup.clauses.map((c) => ({
      field: c.field,
      op: c.op === "contains" ? "contains" : "eq",
      value: c.value,
    }))
  );
  const [logicOpen, setLogicOpen] = useState(() => initialLogicGroup.clauses.length > 0);

  React.useEffect(() => {
    const f = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    setFromDate(f);
    setToDate(to);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveLogicGroup: FilterLogicGroup = useMemo(
    () => ({
      logic,
      clauses: clauses
        .filter((c) => c.field && c.value.trim())
        .map((c) => ({ field: c.field, op: c.op, value: c.value.trim() })),
    }),
    [logic, clauses]
  );

  React.useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("logic");
        for (let i = 0; i < MAX_CLAUSES; i++) next.delete(`c${i}`);
        if (effectiveLogicGroup.clauses.length > 0) {
          const encoded = encodeFilterLogic(effectiveLogicGroup);
          Object.entries(encoded).forEach(([k, v]) => next.set(k, v));
        }
        if (fromDate) next.set("from", fromDate);
        else next.delete("from");
        if (toDate) next.set("to", toDate);
        else next.delete("to");
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveLogicGroup, fromDate, toDate, setSearchParams]);

  const updateClause = (index: number, patch: Partial<ClauseRow>) => {
    setClauses((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };
  const addClause = () => {
    setClauses((prev) => (prev.length >= MAX_CLAUSES ? prev : [...prev, { field: "level", op: "eq", value: "" }]));
    setLogicOpen(true);
  };
  const removeClause = (index: number) => setClauses((prev) => prev.filter((_, i) => i !== index));
  const clearLogic = () => {
    setClauses([]);
    setLogic("AND");
  };

  const visibleLogs = useMemo(() => {
    if (effectiveLogicGroup.clauses.length === 0) return logs;
    return logs.filter((log) => matchFilterLogic(log as unknown as Record<string, unknown>, effectiveLogicGroup));
  }, [logs, effectiveLogicGroup]);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(filters.apiParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "") query.set(k, String(v));
      });
      if (filters.committedQ) query.set("search", filters.committedQ);
      if (fromDate) query.set("from", new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.set("to", end.toISOString());
      }
      const [logsRes, summaryRes] = await Promise.all([
        fetch(`/api/super-admin/logs?${query.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(
          `/api/super-admin/logs/summary?${new URLSearchParams({
            ...(fromDate ? { from: new Date(fromDate).toISOString() } : {}),
            ...(toDate
              ? {
                  to: (() => {
                    const end = new Date(toDate);
                    end.setHours(23, 59, 59, 999);
                    return end.toISOString();
                  })(),
                }
              : {}),
          }).toString()}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
      ]);
      const data = await logsRes.json();
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
      } else {
        setLogs(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total || 0));
      }
      if (summaryRes.ok) {
        const s = await summaryRes.json();
        setSummary({
          total: Number(s?.total || 0),
          byCategory: s?.byCategory || {},
          byLevel: s?.byLevel || {},
          byOutcome: s?.byOutcome || {},
        });
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters.apiParams, filters.committedQ, fromDate, toDate]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLogs();
    }, 50);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  React.useEffect(() => {
    if (!autoRefresh || logView !== "platform") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchLogs();
    }, 30000);
    return () => window.clearInterval(id);
  }, [autoRefresh, logView, fetchLogs]);

  const applyRange = (days: number | null) => {
    if (days == null) {
      setFromDate("");
      setToDate("");
      return;
    }
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    setFromDate(from.toISOString().slice(0, 10));
    setToDate(to.toISOString().slice(0, 10));
  };

  const activeRange = (() => {
    if (!fromDate && !toDate) return "all";
    const from = fromDate ? new Date(fromDate).getTime() : 0;
    const to = toDate ? new Date(toDate).getTime() : 0;
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    if (to && Math.abs(to - dayStart.getTime()) > 86400000) return "custom";
    const span = (now.getTime() - from) / 86400000;
    if (Math.abs(span - 1) < 0.75) return "1d";
    if (Math.abs(span - 7) < 0.75) return "7d";
    if (Math.abs(span - 30) < 0.75) return "30d";
    return "custom";
  })();

  const exportCsv = () => {
    const headers = [
      "id",
      "createdAt",
      "level",
      "outcome",
      "category",
      "module",
      "action",
      "details",
      "changesSummary",
      "userName",
      "userEmail",
      "userRole",
      "targetUserName",
      "targetUserEmail",
      "targetUserRole",
      "authMethod",
      "dataSensitivity",
      "school",
      "ipAddress",
      "browser",
      "os",
      "deviceType",
      "country",
      "city",
      "entityType",
      "entityId",
      "correlationId",
      "requestId",
      "beforeValue",
      "afterValue",
      "endpoint",
      "statusCode",
      "durationMs",
      "source",
      "errorMessage",
      "tags",
    ];
    const rows = visibleLogs.map((l) =>
      [
        l.id,
        l.createdAt,
        l.level,
        l.outcome,
        l.category,
        l.module,
        l.action,
        l.details,
        l.changesSummary,
        l.userName || l.user?.name,
        l.userEmail || l.user?.email,
        l.userRole || l.user?.role,
        l.targetUserName,
        l.targetUserEmail,
        l.targetUserRole,
        l.authMethod,
        l.dataSensitivity,
        l.school?.name,
        l.ipAddress,
        l.browser,
        l.os,
        l.deviceType,
        l.country,
        l.city,
        l.entityType,
        l.entityId,
        l.correlationId,
        l.requestId,
        l.beforeValue,
        l.afterValue,
        l.endpoint,
        l.statusCode,
        l.durationMs,
        l.source,
        l.errorMessage,
        l.tags,
      ]
        .map(csvEscape)
        .join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "CRITICAL":
      case "WARNING":
        return <AlertCircle className="w-4 h-4" />;
      case "ERROR":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const rangeChips: { key: string; label: string; days: number | null }[] = [
    { key: "1d", label: t("superAdmin.logsUi.quick24h"), days: 1 },
    { key: "7d", label: t("superAdmin.logsUi.quick7d"), days: 7 },
    { key: "30d", label: t("superAdmin.logsUi.quick30d"), days: 30 },
    { key: "all", label: t("superAdmin.logsUi.quickAll"), days: null },
  ];

  const criticalCount = (summary.byLevel.CRITICAL || 0) + (summary.byLevel.ERROR || 0);
  const failedCount = (summary.byOutcome.FAILURE || 0) + (summary.byOutcome.DENIED || 0);

  return (
    <PageShell width="wide">
      <PageHeader
        title={t("pages:superAdmin.logs")}
        subtitle={t("pages:superAdmin.logsSubtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {logView === "platform" ? (
              <>
                <Button
                  variant={autoRefresh ? "primary" : "secondary"}
                  type="button"
                  onClick={() => setAutoRefresh((v) => !v)}
                  aria-pressed={autoRefresh}
                >
                  <RefreshCw className={cn("w-4 h-4", autoRefresh && "animate-spin")} />
                  {autoRefresh ? t("superAdmin.logsUi.autoRefreshOn") : t("superAdmin.logsUi.autoRefresh")}
                </Button>
                <Button variant="secondary" type="button" onClick={() => void fetchLogs()}>
                  <RefreshCw className="w-4 h-4" />
                  {t("superAdmin.logsUi.refreshNow")}
                </Button>
                <Button variant="secondary" type="button" onClick={exportCsv} disabled={!visibleLogs.length}>
                  <Download className="w-4 h-4" />
                  {t("common:export")}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold transition-colors",
              logView === "platform" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {t("superAdmin.logsUi.tabPlatform")}
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ view: "activity" })}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold transition-colors",
              logView === "activity" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {t("superAdmin.logsUi.tabActivity")}
          </button>
        </div>
        {lastUpdated && logView === "platform" ? (
          <p className="text-xs font-medium text-slate-400" aria-live="polite">
            {t("superAdmin.logsUi.lastUpdated", { time: lastUpdated.toLocaleTimeString() })}
          </p>
        ) : null}
      </div>

      {logView === "activity" ? (
        <ActivityFeedPanel />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("superAdmin.logsUi.statTotal")}
              value={summary.total || total}
              icon={<FileText className="h-5 w-5" />}
            />
            <StatTile
              label={t("superAdmin.logsUi.statWarnings")}
              value={(summary.byLevel.WARNING || 0) + (summary.byLevel.WARN || 0)}
              icon={<AlertCircle className="h-5 w-5" />}
            />
            <StatTile
              label={t("superAdmin.logsUi.statProblems")}
              value={criticalCount}
              hint={failedCount ? t("superAdmin.logsUi.statFailuresHint", { count: failedCount }) : undefined}
              icon={<ShieldAlert className="h-5 w-5" />}
            />
            <StatTile
              label={t("superAdmin.logsUi.statAuth")}
              value={summary.byCategory.AUTH || 0}
              icon={<User className="h-5 w-5" />}
            />
          </div>

          <Surface variant="primary" className="overflow-hidden p-0">
            <div className="space-y-4 border-b border-slate-100 p-6">
              <ListFilterBar
                fields={fields}
                q={filters.q}
                onSearchChange={filters.setQ}
                values={filters.values}
                onValueChange={filters.setValue}
                onClear={() => {
                  filters.clear();
                  setFromDate("");
                  setToDate("");
                }}
                searchPlaceholder={t("superAdmin.logsUi.searchPlaceholder")}
                shownCount={visibleLogs.length}
                totalCount={total}
                savedViewsScope="sa-system-logs"
              />
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("superAdmin.logsUi.quickRange")}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {rangeChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => applyRange(chip.days)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
                          activeRange === chip.key
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("superAdmin.logsUi.from")}
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={cn(fieldControlClass.compact, "bg-white")}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("superAdmin.logsUi.to")}
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    className={cn(fieldControlClass.compact, "bg-white")}
                  />
                </label>
              </div>
            </div>

            <div className="border-b border-slate-100">
              <button
                type="button"
                onClick={() => setLogicOpen((o) => !o)}
                aria-expanded={logicOpen}
                aria-controls="logs-advanced-logic"
                className="flex w-full items-center justify-between px-6 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-indigo-600" aria-hidden />
                  {t("pages:listFilters.advancedLogic")}
                  {effectiveLogicGroup.clauses.length > 0 ? (
                    <span className="font-mono text-xs text-indigo-600">{effectiveLogicGroup.clauses.length}</span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 text-slate-400 transition-transform", logicOpen && "rotate-180")}
                  aria-hidden
                />
              </button>

              {logicOpen ? (
                <div id="logs-advanced-logic" className="space-y-3 bg-slate-50/70 px-6 py-4">
                  {clauses.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("pages:listFilters.matchLabel")}
                      </span>
                      <select
                        value={logic}
                        onChange={(e) => setLogic(e.target.value === "OR" ? "OR" : "AND")}
                        className={cn(fieldControlClass.compact, "w-auto bg-white")}
                      >
                        <option value="AND">{t("pages:listFilters.logicAnd")}</option>
                        <option value="OR">{t("pages:listFilters.logicOr")}</option>
                      </select>
                    </div>
                  ) : null}
                  {clauses.map((clause, i) => (
                    <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={clause.field}
                        onChange={(e) => updateClause(i, { field: e.target.value })}
                        className={cn(fieldControlClass.compact, "bg-white sm:w-48")}
                      >
                        {clauseFieldOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={clause.op}
                        onChange={(e) => updateClause(i, { op: e.target.value === "contains" ? "contains" : "eq" })}
                        className={cn(fieldControlClass.compact, "bg-white sm:w-32")}
                      >
                        <option value="eq">{t("pages:listFilters.opEq")}</option>
                        <option value="contains">{t("pages:listFilters.opContains")}</option>
                      </select>
                      <input
                        type="text"
                        value={clause.value}
                        onChange={(e) => updateClause(i, { value: e.target.value })}
                        placeholder={t("pages:listFilters.valuePlaceholder")}
                        className={cn(fieldControlClass.compact, "flex-1 bg-white")}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeClause(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    {clauses.length < MAX_CLAUSES ? (
                      <Button type="button" variant="secondary" size="compact" onClick={addClause}>
                        <Plus className="h-4 w-4" />
                        {t("pages:listFilters.addClause")}
                      </Button>
                    ) : null}
                    {clauses.length > 0 ? (
                      <Button type="button" variant="ghost" size="compact" onClick={clearLogic}>
                        {t("pages:listFilters.clearAll")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <DataTable>
              <table className={dataTableClass.table}>
                <thead className={dataTableClass.thead}>
                  <tr>
                    <th className={`${dataTableClass.th} w-[11%]`}>{t("superAdmin.logsUi.timestamp")}</th>
                    <th className={`${dataTableClass.th} w-[13%]`}>{t("superAdmin.logsUi.level")}</th>
                    <th className={`${dataTableClass.th} w-[18%]`}>{t("superAdmin.logsUi.actionModule")}</th>
                    <th className={`${dataTableClass.th} w-[16%]`}>{t("superAdmin.logsUi.user")}</th>
                    <th className={`${dataTableClass.th} w-[13%]`}>{t("superAdmin.logsUi.target")}</th>
                    <th className={`${dataTableClass.th} w-[19%]`}>{t("superAdmin.logsUi.details")}</th>
                    <th className={`${dataTableClass.th} w-[10%]`}>{t("superAdmin.logsUi.context")}</th>
                  </tr>
                </thead>
                <tbody className={dataTableClass.tbody}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className={dataTableClass.tdEmpty}>
                        {t("superAdmin.logsUi.loading")}
                      </td>
                    </tr>
                  ) : visibleLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={dataTableClass.tdEmpty}>
                        {t("superAdmin.noRecentLogs")}
                      </td>
                    </tr>
                  ) : (
                    visibleLogs.map((log) => {
                      const target = targetLabel(log);
                      return (
                        <tr
                          key={log.id}
                          tabIndex={0}
                          role="button"
                          className="cursor-pointer transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600/40"
                          onClick={() => setSelected(log)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelected(log);
                            }
                          }}
                        >
                          <td className={`${dataTableClass.td} whitespace-nowrap`}>
                            <div className="font-mono text-xs text-slate-700" title={new Date(log.createdAt).toLocaleString()}>
                              {relativeTime(log.createdAt)}
                            </div>
                            <div className="truncate font-mono text-[11px] text-slate-400">
                              {new Date(log.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td className={dataTableClass.td}>
                            <span
                              className={cn(
                                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                                levelStyle(log.level)
                              )}
                            >
                              {getLevelIcon(log.level)}
                              <span className="truncate">{log.level}</span>
                            </span>
                            <div className="mt-1 truncate">
                              <span
                                className={cn(
                                  "inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase",
                                  outcomeStyle(log.outcome)
                                )}
                              >
                                {log.outcome || "SUCCESS"}
                              </span>
                            </div>
                          </td>
                          <td className={dataTableClass.td}>
                            <div className="min-w-0 truncate font-semibold tracking-tight text-slate-900">{log.action}</div>
                            <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                              {log.category || "SYSTEM"} · {log.module}
                            </div>
                          </td>
                          <td className={dataTableClass.td}>
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-800">
                                  {actorLabel(log, t("superAdmin.logsUi.systemUser"))}
                                </div>
                                <div className="truncate font-mono text-[11px] text-slate-400">
                                  {log.userRole || log.user?.role || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={dataTableClass.td}>
                            {target ? (
                              <>
                                <div className="truncate text-sm font-medium text-slate-800">{target}</div>
                                <div className="truncate font-mono text-[11px] text-slate-400">
                                  {log.targetUserRole || "—"}
                                </div>
                              </>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-400">
                                {log.entityType ? `${log.entityType}` : "—"}
                              </span>
                            )}
                          </td>
                          <td className={`${dataTableClass.td} text-sm text-slate-600`}>
                            <span className="block truncate" title={log.changesSummary || log.details}>
                              {log.changesSummary || log.details}
                            </span>
                          </td>
                          <td className={`${dataTableClass.td} text-xs text-slate-500`}>
                            <div className="flex min-w-0 items-center gap-1.5">
                              <DeviceIcon type={log.deviceType} />
                              <span className="truncate">{log.browser || log.os || "—"}</span>
                            </div>
                            <div className="mt-1 truncate font-mono text-[11px] text-slate-400">{log.ipAddress || "—"}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </DataTable>

            <ListPagination
              total={total}
              page={filters.page}
              pageSize={filters.pageSize}
              onPageChange={filters.setPage}
              onPageSizeChange={filters.setPageSize}
            />
          </Surface>

          <LogDetailDrawer log={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </PageShell>
  );
};
