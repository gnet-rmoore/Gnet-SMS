import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  FileText,
  User,
  AlertCircle,
  XCircle,
  Info,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  X,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  Shield,
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
import {
  useListFilters,
  parseFilterLogic,
  encodeFilterLogic,
  matchFilterLogic,
  type FilterFieldDef,
  type FilterLogicGroup,
} from "../../features/list-filters";

interface LogEntry {
  id: string;
  action: string;
  module: string;
  category?: string;
  details: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  schoolId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: string | null;
  country?: string | null;
  city?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  httpMethod?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  source?: string | null;
  errorMessage?: string | null;
  tags?: string | null;
  user?: { name: string; role: string; email?: string } | null;
  school?: { name: string; slug?: string } | null;
  createdAt: string;
  level: "INFO" | "WARNING" | "ERROR" | "CRITICAL" | string;
}

type ClauseRow = { field: string; op: "eq" | "contains"; value: string };
const MAX_CLAUSES = 3;

function DeviceIcon({ type }: { type?: string | null }) {
  if (type === "Mobile") return <Smartphone className="h-3.5 w-3.5" aria-hidden />;
  if (type === "Tablet") return <Tablet className="h-3.5 w-3.5" aria-hidden />;
  return <Monitor className="h-3.5 w-3.5" aria-hidden />;
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const Logs = () => {
  const { t } = useTranslation(["pages", "common"]);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState<{
    total: number;
    byCategory: Record<string, number>;
    byLevel: Record<string, number>;
  }>({ total: 0, byCategory: {}, byLevel: {} });
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<LogEntry | null>(null);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
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
        key: "category",
        label: t("superAdmin.logsUi.category"),
        type: "enum",
        primary: true,
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
        primary: true,
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
        });
      }
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

  const exportCsv = () => {
    const headers = [
      "id",
      "createdAt",
      "level",
      "category",
      "module",
      "action",
      "details",
      "userName",
      "userEmail",
      "userRole",
      "school",
      "ipAddress",
      "browser",
      "os",
      "deviceType",
      "country",
      "city",
      "entityType",
      "entityId",
      "beforeValue",
      "afterValue",
      "endpoint",
      "statusCode",
      "durationMs",
      "source",
    ];
    const rows = visibleLogs.map((l) =>
      [
        l.id,
        l.createdAt,
        l.level,
        l.category,
        l.module,
        l.action,
        l.details,
        l.userName || l.user?.name,
        l.userEmail || l.user?.email,
        l.userRole || l.user?.role,
        l.school?.name,
        l.ipAddress,
        l.browser,
        l.os,
        l.deviceType,
        l.country,
        l.city,
        l.entityType,
        l.entityId,
        l.beforeValue,
        l.afterValue,
        l.endpoint,
        l.statusCode,
        l.durationMs,
        l.source,
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

  const getLevelStyle = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-red-100 text-red-700 border-red-200";
      case "ERROR":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "WARNING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
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

  const actorLabel = (log: LogEntry) =>
    log.userName || log.user?.name || log.userEmail || log.user?.email || t("superAdmin.logsUi.systemUser");

  return (
    <PageShell width="wide">
      <PageHeader
        title={t("pages:superAdmin.logs")}
        subtitle={t("pages:superAdmin.logsSubtitle")}
        actions={
          <Button variant="secondary" type="button" onClick={exportCsv} disabled={!visibleLogs.length}>
            <FileText className="w-4 h-4" />
            {t("common:export")}
          </Button>
        }
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSearchParams({})}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-colors",
            logView === "platform"
              ? "bg-indigo-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          Platform log
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ view: "activity" })}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-colors",
            logView === "activity"
              ? "bg-indigo-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          Cross-service activity
        </button>
      </div>

      {logView === "activity" ? (
        <ActivityFeedPanel />
      ) : (
        <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("superAdmin.logsUi.statTotal")} value={summary.total || total} />
        <StatTile
          label={t("superAdmin.logsUi.statWarnings")}
          value={(summary.byLevel.WARNING || 0) + (summary.byLevel.WARN || 0)}
        />
        <StatTile label={t("superAdmin.logsUi.statErrors")} value={summary.byLevel.ERROR || 0} />
        <StatTile label={t("superAdmin.logsUi.statAuth")} value={summary.byCategory.AUTH || 0} />
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
          />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("superAdmin.logsUi.from")}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={cn(fieldControlClass.compact, "bg-white")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("superAdmin.logsUi.to")}
              <input
                type="date"
                value={toDate}
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
                    className={cn(fieldControlClass.compact, "bg-white sm:w-40")}
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
                <th className={`${dataTableClass.th} w-[14%]`}>{t("superAdmin.logsUi.timestamp")}</th>
                <th className={`${dataTableClass.th} w-[14%]`}>{t("superAdmin.logsUi.level")}</th>
                <th className={`${dataTableClass.th} w-[22%]`}>{t("superAdmin.logsUi.actionModule")}</th>
                <th className={`${dataTableClass.th} w-[20%]`}>{t("superAdmin.logsUi.user")}</th>
                <th className={`${dataTableClass.th} w-[14%]`}>{t("superAdmin.logsUi.context")}</th>
                <th className={`${dataTableClass.th} w-[16%]`}>{t("superAdmin.logsUi.details")}</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loading ? (
                <tr>
                  <td colSpan={6} className={dataTableClass.tdEmpty}>
                    {t("superAdmin.logsUi.loading")}
                  </td>
                </tr>
              ) : visibleLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={dataTableClass.tdEmpty}>
                    {t("superAdmin.noRecentLogs")}
                  </td>
                </tr>
              ) : (
                visibleLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                    onClick={() => setSelected(log)}
                  >
                    <td className={`${dataTableClass.td} font-mono text-xs text-slate-500 whitespace-nowrap`}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={cn(
                          "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                          getLevelStyle(log.level)
                        )}
                      >
                        {getLevelIcon(log.level)}
                        <span className="truncate">{log.level}</span>
                      </span>
                      <div className="mt-1 truncate font-mono text-[11px] font-semibold text-slate-400">
                        {log.category || "SYSTEM"}
                      </div>
                    </td>
                    <td className={dataTableClass.td}>
                      <div className="min-w-0 font-semibold tracking-tight text-slate-900 truncate">{log.action}</div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{log.module}</div>
                    </td>
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800">{actorLabel(log)}</div>
                          <div className="truncate font-mono text-[11px] text-slate-400">
                            {log.userRole || log.user?.role || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`${dataTableClass.td} text-xs text-slate-500`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <DeviceIcon type={log.deviceType} />
                        <span className="truncate">{log.browser || log.os || "—"}</span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-slate-400">{log.ipAddress || "—"}</div>
                    </td>
                    <td className={`${dataTableClass.td} text-sm text-slate-600`}>
                      <span className="block truncate">{log.details}</span>
                    </td>
                  </tr>
                ))
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

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="dialog" aria-modal>
          <button type="button" className="flex-1 cursor-default" aria-label="Close" onClick={() => setSelected(null)} />
          <aside className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                  {selected.category || "SYSTEM"}
                </p>
                <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">{selected.action}</h3>
                <p className="mt-1 font-mono text-xs text-slate-400">{selected.id}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelected(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-6 p-6">
              <p className="text-sm leading-relaxed text-slate-600">{selected.details}</p>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.timestamp")}
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-mono text-slate-800">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {new Date(selected.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.level")}
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                        getLevelStyle(selected.level)
                      )}
                    >
                      {selected.level}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.user")}
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-800">{actorLabel(selected)}</dd>
                  <dd className="font-mono text-xs text-slate-400">
                    {selected.userEmail || selected.user?.email || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.role")}
                  </dt>
                  <dd className="mt-1 font-mono text-slate-800">
                    {selected.userRole || selected.user?.role || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.school")}
                  </dt>
                  <dd className="mt-1 text-slate-800">{selected.school?.name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.entity")}
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-slate-800">
                    {selected.entityType || "—"}
                    {selected.entityId ? ` · ${selected.entityId}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.ip")}
                  </dt>
                  <dd className="mt-1 font-mono text-slate-800">{selected.ipAddress || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.location")}
                  </dt>
                  <dd className="mt-1 flex items-center gap-1 text-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {[selected.city, selected.country].filter(Boolean).join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.device")}
                  </dt>
                  <dd className="mt-1 text-slate-800">
                    {[selected.deviceType, selected.browser, selected.os].filter(Boolean).join(" · ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.source")}
                  </dt>
                  <dd className="mt-1 flex items-center gap-1 text-slate-800">
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                    {selected.source || "WEB"}
                    {selected.statusCode != null ? ` · HTTP ${selected.statusCode}` : ""}
                  </dd>
                </div>
              </dl>

              {selected.endpoint ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.endpoint")}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-700">
                    {selected.httpMethod || ""} {selected.endpoint}
                    {selected.durationMs != null ? ` (${selected.durationMs}ms)` : ""}
                  </p>
                </div>
              ) : null}

              {selected.errorMessage ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
                  {selected.errorMessage}
                </div>
              ) : null}

              {(selected.beforeValue || selected.afterValue) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t("superAdmin.logsUi.before")}
                    </p>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-slate-700">
                      {selected.beforeValue || "—"}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t("superAdmin.logsUi.after")}
                    </p>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-slate-700">
                      {selected.afterValue || "—"}
                    </pre>
                  </div>
                </div>
              )}

              {selected.userAgent ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.userAgent")}
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{selected.userAgent}</p>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
        </>
      )}
    </PageShell>
  );
};
