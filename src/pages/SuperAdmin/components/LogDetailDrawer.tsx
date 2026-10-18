import React from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Fingerprint,
  Globe,
  KeyRound,
  MapPin,
  Monitor,
  Shield,
  Target,
  User,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import {
  actorLabel,
  diffFields,
  formatValue,
  levelStyle,
  outcomeStyle,
  safeParseJson,
  sensitivityStyle,
  targetLabel,
  type LogEntry,
} from "../logTypes";

function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold",
        className
      )}
    >
      {children}
    </span>
  );
}

function CopyableValue({ value, label }: { value: string; label?: string }) {
  const { t } = useTranslation(["pages", "common"]);
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate font-mono text-xs text-slate-800" title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={label || t("superAdmin.logsUi.copyId")}
        className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{title}</h4>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-slate-800">
        {icon}
        {children}
      </dd>
    </div>
  );
}

function DeviceIcon({ type }: { type?: string | null }) {
  return <Monitor className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
}

export function LogDetailDrawer({
  log,
  onClose,
}: {
  log: LogEntry | null;
  onClose: () => void;
}) {
  const { t } = useTranslation(["pages", "common"]);
  const [showRaw, setShowRaw] = React.useState(false);

  React.useEffect(() => {
    if (!log) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [log, onClose]);

  if (!log) return null;

  const before = safeParseJson(log.beforeValue);
  const after = safeParseJson(log.afterValue);
  const changes = diffFields(before, after);
  const hasSnapshots = Boolean(log.beforeValue || log.afterValue);
  const target = targetLabel(log);
  const deviceSummary = [log.deviceType, log.browser, log.os].filter(Boolean).join(" · ");
  const location = [log.city, log.country].filter(Boolean).join(", ");
  const isProblem = log.outcome === "FAILURE" || log.outcome === "DENIED" || log.level === "ERROR" || log.level === "CRITICAL";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="dialog" aria-modal="true">
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label={t("common:close")}
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-slate-100 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                  {log.category || "SYSTEM"}
                </span>
                <Chip className={levelStyle(log.level)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", log.level === "CRITICAL" ? "bg-red-500" : log.level === "ERROR" ? "bg-orange-500" : log.level === "WARNING" ? "bg-amber-500" : "bg-blue-500")} />
                  {log.level}
                </Chip>
                {log.outcome ? (
                  <Chip className={outcomeStyle(log.outcome)}>{log.outcome}</Chip>
                ) : null}
                {log.dataSensitivity ? (
                  <Chip className={sensitivityStyle(log.dataSensitivity)}>
                    <Shield className="h-3 w-3" />
                    {log.dataSensitivity}
                  </Chip>
                ) : null}
              </div>
              <h3 className="mt-2 break-words text-xl font-extrabold tracking-tight text-slate-900">
                {log.action}
              </h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-mono">{log.id}</span>
                <button
                  type="button"
                  aria-label={t("superAdmin.logsUi.copyId")}
                  onClick={() => void navigator.clipboard?.writeText(log.id)}
                  className="rounded-md p-0.5 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="space-y-7 p-6">
          {isProblem && log.errorMessage ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-bold">{t("superAdmin.logsUi.failureReason")}</p>
                <p className="mt-0.5 break-words">{log.errorMessage}</p>
              </div>
            </div>
          ) : null}

          <Section title={t("superAdmin.logsUi.sectionOverview")}>
            <p className="text-sm leading-relaxed text-slate-700">{log.details}</p>
            <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <InfoRow label={t("superAdmin.logsUi.timestamp")} icon={<Clock className="h-3.5 w-3.5 text-slate-400" />}>
                <span className="font-mono">{new Date(log.createdAt).toLocaleString()}</span>
              </InfoRow>
              <InfoRow label={t("superAdmin.logsUi.module")}>
                <span className="font-mono">{log.module}</span>
              </InfoRow>
              <InfoRow label={t("superAdmin.logsUi.outcome")}>
                {log.outcome ? (
                  <Chip className={outcomeStyle(log.outcome)}>{log.outcome}</Chip>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label={t("superAdmin.logsUi.source")} icon={<Shield className="h-3.5 w-3.5 text-slate-400" />}>
                {log.source || "WEB"}
                {log.statusCode != null ? ` · HTTP ${log.statusCode}` : ""}
              </InfoRow>
            </dl>
          </Section>

          <div className="grid gap-6 sm:grid-cols-2">
            <Section title={t("superAdmin.logsUi.sectionActor")}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {actorLabel(log, t("superAdmin.logsUi.systemUser"))}
                  </p>
                  <p className="truncate font-mono text-xs text-slate-400">
                    {log.userEmail || log.user?.email || "—"}
                  </p>
                  <p className="truncate font-mono text-[11px] text-slate-400">
                    {log.userRole || log.user?.role || "—"}
                  </p>
                </div>
              </div>
            </Section>

            <Section title={t("superAdmin.logsUi.sectionTarget")}>
              {target ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{target}</p>
                    <p className="truncate font-mono text-xs text-slate-400">
                      {log.targetUserEmail || "—"}
                    </p>
                    <p className="truncate font-mono text-[11px] text-slate-400">
                      {log.targetUserRole || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">{t("superAdmin.logsUi.noTarget")}</p>
              )}
            </Section>
          </div>

          <Section title={t("superAdmin.logsUi.sectionRequest")}>
            <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <InfoRow label={t("superAdmin.logsUi.method")}>
                <span className="font-mono">{log.httpMethod || "—"}</span>
              </InfoRow>
              <InfoRow label={t("superAdmin.logsUi.duration")}>
                <span className="font-mono">{log.durationMs != null ? `${log.durationMs} ms` : "—"}</span>
              </InfoRow>
              <div className="col-span-2">
                <InfoRow label={t("superAdmin.logsUi.endpoint")}>
                  <span className="break-all font-mono text-xs text-slate-700">{log.endpoint || "—"}</span>
                </InfoRow>
              </div>
              <InfoRow label={t("superAdmin.logsUi.ip")}>
                <span className="font-mono">{log.ipAddress || "—"}</span>
              </InfoRow>
              <InfoRow label={t("superAdmin.logsUi.location")} icon={<MapPin className="h-3.5 w-3.5 text-slate-400" />}>
                {location || "—"}
              </InfoRow>
              <div className="col-span-2">
                <InfoRow label={t("superAdmin.logsUi.device")} icon={<DeviceIcon type={log.deviceType} />}>
                  {deviceSummary || "—"}
                </InfoRow>
              </div>
            </dl>
          </Section>

          {log.authMethod || log.sessionId || log.userAgent ? (
            <Section title={t("superAdmin.logsUi.sectionSecurity")}>
              <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                {log.authMethod ? (
                  <InfoRow label={t("superAdmin.logsUi.authMethod")} icon={<KeyRound className="h-3.5 w-3.5 text-slate-400" />}>
                    <span className="font-mono">{log.authMethod}</span>
                  </InfoRow>
                ) : null}
                {log.sessionId ? (
                  <InfoRow label={t("superAdmin.logsUi.sessionId")} icon={<Fingerprint className="h-3.5 w-3.5 text-slate-400" />}>
                    <CopyableValue value={log.sessionId} />
                  </InfoRow>
                ) : null}
                {log.userAgent ? (
                  <div className="col-span-2">
                    <InfoRow label={t("superAdmin.logsUi.userAgent")} icon={<Globe className="h-3.5 w-3.5 text-slate-400" />}>
                      <span className="break-all font-mono text-[11px] text-slate-500">{log.userAgent}</span>
                    </InfoRow>
                  </div>
                ) : null}
              </dl>
            </Section>
          ) : null}

          {hasSnapshots ? (
            <Section title={t("superAdmin.logsUi.sectionChanges")}>
              {log.changesSummary ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-500">
                    {t("superAdmin.logsUi.changes")}
                  </p>
                  <p className="break-words font-mono text-xs text-indigo-900">{log.changesSummary}</p>
                </div>
              ) : null}

              {changes.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="w-1/3 px-3 py-2">{t("superAdmin.logsUi.field")}</th>
                        <th className="w-1/3 px-3 py-2">{t("superAdmin.logsUi.oldValue")}</th>
                        <th className="w-1/3 px-3 py-2">{t("superAdmin.logsUi.newValue")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {changes.map((c) => (
                        <tr key={c.field}>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700 break-all align-top">
                            {c.field}
                          </td>
                          <td className="px-3 py-2 text-xs text-rose-700 break-all align-top">
                            {formatValue(c.before)}
                          </td>
                          <td className="px-3 py-2 text-xs text-emerald-700 break-all align-top">
                            {formatValue(c.after)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">{t("superAdmin.logsUi.noChanges")}</p>
              )}

              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                {showRaw ? t("superAdmin.logsUi.hideRaw") : t("superAdmin.logsUi.showRaw")}
              </button>
              {showRaw ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t("superAdmin.logsUi.before")}
                    </p>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-slate-700">
                      {before ? JSON.stringify(before, null, 2) : log.beforeValue || "—"}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t("superAdmin.logsUi.after")}
                    </p>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-slate-700">
                      {after ? JSON.stringify(after, null, 2) : log.afterValue || "—"}
                    </pre>
                  </div>
                </div>
              ) : null}
            </Section>
          ) : null}

          {log.errorMessage && !isProblem ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="break-words">{log.errorMessage}</span>
            </div>
          ) : null}

          <Section title={t("superAdmin.logsUi.sectionTechnical")}>
            <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <InfoRow label={t("superAdmin.logsUi.school")}>
                {log.school?.name || "—"}
              </InfoRow>
              <InfoRow label={t("superAdmin.logsUi.entity")}>
                <span className="font-mono text-xs">
                  {log.entityType || "—"}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </span>
              </InfoRow>
              {log.correlationId ? (
                <InfoRow label={t("superAdmin.logsUi.correlationId")} icon={<Fingerprint className="h-3.5 w-3.5 text-slate-400" />}>
                  <CopyableValue value={log.correlationId} />
                </InfoRow>
              ) : null}
              {log.requestId ? (
                <InfoRow label={t("superAdmin.logsUi.requestId")} icon={<Fingerprint className="h-3.5 w-3.5 text-slate-400" />}>
                  <CopyableValue value={log.requestId} />
                </InfoRow>
              ) : null}
              {log.tags ? (
                <div className="col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("superAdmin.logsUi.tags")}
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {log.tags
                      .split(",")
                      .filter(Boolean)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Section>
        </div>
      </aside>
    </div>
  );
}
