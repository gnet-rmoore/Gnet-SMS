import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Check,
  Copy,
  Key,
  Search,
  Zap,
  ArrowRight,
  Shield,
  Terminal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { PageShell, SMS_SHADOW_SURFACE, fieldControlClass } from "../../components/ui";
import { cn } from "../../lib/cn";
import { hasEntitlement } from "../../lib/entitlements";
import {
  loadSchoolApiKeyForSession,
  SCHOOL_API_KEY_SAVED_EVENT,
  type StoredSchoolApiKey,
} from "../../lib/schoolApiKeySession";
import {
  SCHOOL_API_DOC_SECTIONS,
  resolveSchoolApiPath,
  hasUnresolvedPathParams,
  type ApiDocEndpoint,
  type ApiDocSection,
} from "./catalog";
import { MethodBadge } from "./components/MethodBadge";
import { LiveApiConsole } from "./components/LiveApiConsole";
import { AuthReferencePanel } from "./components/AuthReferencePanel";

type SelectedRef = {
  sectionId: string;
  endpoint: ApiDocEndpoint;
};

export function SchoolApiDocsPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { slug } = useParams();
  const { school, entitlements, accessToken } = useAuthStore();
  const [q, setQ] = useState("");
  const [activeSection, setActiveSection] = useState(SCHOOL_API_DOC_SECTIONS[0]?.id || "school");
  const [selected, setSelected] = useState<SelectedRef | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [storedKey, setStoredKey] = useState<StoredSchoolApiKey | null>(null);
  const [autoRunToken, setAutoRunToken] = useState(0);
  const consoleRef = useRef<HTMLDivElement>(null);

  const apiAccess = hasEntitlement(entitlements, "api_access");
  const schoolId = school?.id || "";

  const refreshStoredKey = useCallback(() => {
    setStoredKey(schoolId ? loadSchoolApiKeyForSession(schoolId) : null);
  }, [schoolId]);

  useEffect(() => {
    refreshStoredKey();
  }, [refreshStoredKey]);

  useEffect(() => {
    const onKeySaved = (event: Event) => {
      const detail = (event as CustomEvent<{ schoolId?: string }>).detail;
      if (!detail?.schoolId || detail.schoolId === schoolId) refreshStoredKey();
    };
    const onFocus = () => refreshStoredKey();
    window.addEventListener(SCHOOL_API_KEY_SAVED_EVENT, onKeySaved);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(SCHOOL_API_KEY_SAVED_EVENT, onKeySaved);
      window.removeEventListener("focus", onFocus);
    };
  }, [schoolId, refreshStoredKey]);

  const filteredSections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SCHOOL_API_DOC_SECTIONS;
    return SCHOOL_API_DOC_SECTIONS.map((section) => ({
      ...section,
      endpoints: section.endpoints.filter((ep) => {
        const path = resolveSchoolApiPath(ep.path, schoolId || ":schoolId").toLowerCase();
        const summary = t(`apiDocs.endpoints.${ep.summaryKey}`).toLowerCase();
        return (
          path.includes(needle) ||
          summary.includes(needle) ||
          ep.method.toLowerCase().includes(needle)
        );
      }),
    })).filter((s) => s.endpoints.length > 0);
  }, [q, schoolId, t]);

  const visibleSection =
    filteredSections.find((s) => s.id === activeSection) || filteredSections[0] || null;

  const resolvedSelectedPath = selected
    ? resolveSchoolApiPath(selected.endpoint.path, schoolId || ":schoolId", selected.endpoint.pathParams)
    : "";

  const authReady = Boolean(storedKey?.secret && apiAccess) || Boolean(accessToken);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const pickEndpoint = (sectionId: string, endpoint: ApiDocEndpoint) => {
    setSelected({ sectionId, endpoint });
    setActiveSection(sectionId);
    const resolved = resolveSchoolApiPath(endpoint.path, schoolId || ":schoolId", endpoint.pathParams);
    if (!hasUnresolvedPathParams(resolved)) {
      setAutoRunToken((n) => n + 1);
    }
    window.requestAnimationFrame(() => {
      consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const cardShell = cn("rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white", SMS_SHADOW_SURFACE);

  const quickSteps = [
    {
      icon: Key,
      titleKey: "apiDocs.quickStart.step1Title",
      bodyKey: "apiDocs.quickStart.step1Body",
    },
    {
      icon: BookOpen,
      titleKey: "apiDocs.quickStart.step2Title",
      bodyKey: "apiDocs.quickStart.step2Body",
    },
    {
      icon: Terminal,
      titleKey: "apiDocs.quickStart.step3Title",
      bodyKey: "apiDocs.quickStart.step3Body",
    },
  ] as const;

  return (
    <PageShell width="wide" className="space-y-5 sm:space-y-8 pb-10 sm:pb-16 min-w-0">
      <motion.header
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(cardShell, "p-5 sm:p-8")}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              {t("apiDocs.heroEyebrow")}
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mt-1 font-dashboard">
              {t("apiDocs.title")}
            </h1>
            <p className="text-slate-500 mt-2 text-sm sm:text-base leading-relaxed max-w-3xl">
              {t("apiDocs.subtitle")}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {schoolId ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-mono text-slate-600 max-w-full truncate">
                  {t("apiDocs.heroSchoolId")}: {schoolId.slice(0, 8)}…
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                {t("apiDocs.heroLive")}
              </span>
              {storedKey ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  <Key className="w-3.5 h-3.5 shrink-0" />
                  {t("apiDocs.heroKeyReady")}
                </span>
              ) : authReady ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  {t("apiDocs.heroSessionReady")}
                </span>
              ) : null}
            </div>
          </div>
          {apiAccess && slug ? (
            <Link
              to={`/${slug}/settings?tab=API_KEYS`}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-3 sm:py-2.5 text-sm font-bold hover:bg-indigo-700 transition-colors shrink-0"
            >
              <Key className="w-4 h-4" />
              {t("apiDocs.manageKeys")}
            </Link>
          ) : null}
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className={cn(cardShell, "p-4 sm:p-6")}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          {t("apiDocs.quickStart.title")}
        </p>
        <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {quickSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.titleKey}
                className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 min-w-0"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-slate-400">{index + 1}</p>
                  <p className="text-sm font-extrabold tracking-tight text-slate-900 mt-0.5">
                    {t(step.titleKey)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t(step.bodyKey)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </motion.section>

      <AuthReferencePanel schoolId={schoolId} apiAccess={apiAccess} />

      <div className="min-w-0 -mx-1 px-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
          {t("apiDocs.navSections")}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin lg:hidden">
          {SCHOOL_API_DOC_SECTIONS.map((section) => {
            const count =
              filteredSections.find((s) => s.id === section.id)?.endpoints.length ?? 0;
            if (q && count === 0) return null;
            const active = visibleSection?.id === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "snap-start shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold border transition-colors whitespace-nowrap",
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
                )}
              >
                {t(`apiDocs.sections.${section.titleKey}`)}
                <span className="ms-1.5 opacity-80 font-mono text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-start min-w-0">
        <aside className="hidden lg:block lg:col-span-2 lg:sticky lg:top-6 space-y-1.5">
          {SCHOOL_API_DOC_SECTIONS.map((section) => {
            const count =
              filteredSections.find((s) => s.id === section.id)?.endpoints.length ?? 0;
            if (q && count === 0) return null;
            const active = visibleSection?.id === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full text-left rounded-2xl px-4 py-3 text-sm font-bold transition-colors border",
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-slate-900"
                )}
              >
                {t(`apiDocs.sections.${section.titleKey}`)}
                <span className="ms-1.5 opacity-80 font-mono text-xs">{count}</span>
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-5 space-y-4 min-w-0 order-2 lg:order-none">
          <div className={cn(cardShell, "p-4 sm:p-6 space-y-4")}>
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 truncate">
                {t("apiDocs.referenceTitle")}
              </h2>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("apiDocs.searchPlaceholder")}
                className={cn(fieldControlClass.default, "w-full bg-slate-50 ps-10 text-base sm:text-sm")}
              />
            </label>
          </div>

          <AnimatePresence mode="wait">
            {!visibleSection ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(cardShell, "p-8 sm:p-12 text-center border-dashed")}
              >
                <p className="text-sm font-medium text-slate-500">{t("apiDocs.noMatches")}</p>
              </motion.div>
            ) : (
              <motion.div
                key={visibleSection.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <SectionHeader section={visibleSection} t={t} />
                {visibleSection.endpoints.map((ep) => {
                  const rowId = `${visibleSection.id}-${ep.method}-${ep.path}`;
                  const isActive =
                    selected?.sectionId === visibleSection.id &&
                    selected.endpoint.path === ep.path &&
                    selected.endpoint.method === ep.method;
                  const resolved = resolveSchoolApiPath(ep.path, schoolId || ":schoolId");
                  return (
                    <EndpointRow
                      key={rowId}
                      ep={ep}
                      resolved={resolved}
                      isActive={isActive}
                      copied={copied === rowId}
                      onCopy={() => void copyText(resolved, rowId)}
                      onTry={() => pickEndpoint(visibleSection.id, ep)}
                      t={t}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn(cardShell, "p-4 sm:p-6")}>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
              {t("apiDocs.errorsTitle")}
            </h3>
            <ul className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 text-xs text-slate-600">
              <li className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <span className="font-mono font-bold text-slate-800">401</span>
                <p className="mt-1 leading-relaxed">{t("apiDocs.errors.unauthorized")}</p>
              </li>
              <li className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <span className="font-mono font-bold text-slate-800">403</span>
                <p className="mt-1 leading-relaxed">{t("apiDocs.errors.forbidden")}</p>
              </li>
              <li className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 sm:col-span-2 xl:col-span-1">
                <span className="font-mono font-bold text-slate-800">403</span>
                <p className="mt-1 leading-relaxed">{t("apiDocs.errors.readOnly")}</p>
              </li>
            </ul>
          </div>
        </div>

        <div
          className={cn(
            "lg:col-span-5 min-w-0",
            selected ? "order-1" : "order-3",
            "lg:order-none"
          )}
        >
          <LiveApiConsole
            ref={consoleRef}
            slug={slug}
            schoolId={schoolId}
            apiAccess={apiAccess}
            apiKey={storedKey?.secret ?? null}
            apiKeyLabel={storedKey?.name ? `${storedKey.name}` : null}
            accessToken={accessToken}
            selected={selected?.endpoint ?? null}
            resolvedPath={resolvedSelectedPath}
            autoRunToken={autoRunToken}
          />
        </div>
      </div>
    </PageShell>
  );
}

function SectionHeader({
  section,
  t,
}: {
  section: ApiDocSection;
  t: (key: string) => string;
}) {
  return (
    <div className="px-0.5 min-w-0">
      <h3 className="text-base font-extrabold tracking-tight text-slate-900">
        {t(`apiDocs.sections.${section.titleKey}`)}
      </h3>
      <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
        {t(`apiDocs.sections.${section.descriptionKey}`)}
      </p>
    </div>
  );
}

function EndpointRow({
  ep,
  resolved,
  isActive,
  copied,
  onCopy,
  onTry,
  t,
}: {
  ep: ApiDocEndpoint;
  resolved: string;
  isActive: boolean;
  copied: boolean;
  onCopy: () => void;
  onTry: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-[28px] border bg-white p-4 sm:p-5 transition-all min-w-0",
        isActive
          ? "border-indigo-300 ring-2 ring-indigo-500/15"
          : "border-slate-200 hover:border-indigo-200",
        SMS_SHADOW_SURFACE
      )}
    >
      <div className="flex flex-col gap-4 min-w-0">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={ep.method} />
            {ep.apiKeyGet ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {t("apiDocs.apiKeyOk")}
              </span>
            ) : null}
          </div>
          <p className="text-sm font-bold text-slate-900 leading-snug">
            {t(`apiDocs.endpoints.${ep.summaryKey}`)}
          </p>
          <code className="block text-xs font-mono text-slate-500 break-all overflow-x-auto">
            {resolved}
          </code>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-end">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-10"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {t("apiDocs.copyPath")}
          </button>
          <button
            type="button"
            onClick={onTry}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 sm:py-2 text-xs font-bold min-h-10"
          >
            {t("apiDocs.tryLive")}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
