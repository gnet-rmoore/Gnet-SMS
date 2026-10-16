import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import {
  Search,
  Users,
  UserCog,
  BookOpen,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Command,
  X,
  Mail,
  Phone,
  LogOut,
  User,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  canSearchStudents,
  canSearchStaff,
  canSearchClassrooms,
} from "../constants/navByRole";
import { staffRoleLabel } from "../constants/roles";
import { getNavSectionsForSession } from "../lib/navSectionsForSession";
import { navSectionsToSearchPages } from "../lib/globalSearchPages";
import {
  highlightSegments,
  normalizeSearchText,
  scoreFields,
  sortByScoreDesc,
} from "../lib/searchRanking";
import { UserAvatar } from "./UserAvatar";
import { api } from "../services/api";

type SearchItemType = "page" | "student" | "staff" | "classroom" | "action" | "recent";

interface SearchItem {
  id: string;
  type: SearchItemType;
  label: string;
  subtitle?: string;
  path?: string;
  icon?: React.ElementType;
  meta?: Record<string, unknown>;
}

interface SearchGroup {
  key: string;
  label: string;
  items: SearchItem[];
  /** Best item score in the group — used to order groups by relevance. */
  topScore: number;
}

const RECENT_STORAGE_KEY = "gnet.globalSearch.recent";
const RECENT_MAX = 8;
const ENTITY_PAGE_SIZE = 8;
const MIN_ENTITY_QUERY = 2;
const DEBOUNCE_MS = 220;
const ENTITY_CACHE_MAX = 60;

const GROUP_PRIORITY: Record<string, number> = {
  students: 5,
  staff: 4,
  classrooms: 3,
  pages: 2,
  recent: 1,
  account: 0,
};

function loadRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function persistRecentSearches(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* storage unavailable — recents simply do not survive reloads */
  }
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function toArrayRows(res: unknown): any[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray((res as any).items)) return (res as any).items;
  return [];
}

/** Renders label text with query matches visually emphasized. */
const Highlighted = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <>{text}</>;
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark key={i} className="bg-transparent text-inherit font-extrabold text-indigo-600">
            {seg.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
};

export const GlobalSearch = () => {
  const { t } = useTranslation(["pages", "common", "nav", "roles"]);
  const { user, school, accessToken, logout, capabilities, entitlements } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [selectedIndex, setSelectedIndex] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const entityCacheRef = useRef(new Map<string, any[]>());

  const role = user?.role || "";
  const slug = school?.slug || "";

  const translateNavKey = useCallback(
    (key: string) =>
      t(key.startsWith("sections.") || key.startsWith("items.") ? key : `items.${key}`, {
        ns: "nav",
      }),
    [t]
  );

  const navSections = useMemo(
    () => getNavSectionsForSession(role, slug, capabilities, entitlements),
    [role, slug, capabilities, entitlements]
  );

  const allowedPages = useMemo(
    () => navSectionsToSearchPages(navSections, translateNavKey, t("globalSearch.page")),
    [navSections, translateNavKey, t]
  );

  const allowStudents = canSearchStudents(role);
  const allowStaff = canSearchStaff(role);
  const allowClassrooms = canSearchClassrooms(role);
  const isSuperAdmin = role === "SUPER_ADMIN";

  const profilePath = role === "SUPER_ADMIN" ? "/super-admin/profile" : slug ? `/${slug}/profile` : "/login";

  const rememberSearch = useCallback((value: string) => {
    const typed = value.trim();
    if (!typed) return;
    setRecentSearches((prev) => {
      const next = [
        typed,
        ...prev.filter((r) => normalizeSearchText(r) !== normalizeSearchText(typed)),
      ].slice(0, RECENT_MAX);
      persistRecentSearches(next);
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    persistRecentSearches([]);
  }, []);

  // ---- Global shortcut -------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- Open / close lifecycle ----------------------------------------------
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setEntityError(false);
      abortRef.current?.abort();
      return;
    }
    // Reset entity results when the palette re-opens.
    setStudents([]);
    setStaff([]);
    setClassrooms([]);
  }, [isOpen]);

  // ---- Classrooms: fetched once per open (scoped to the current user) -------
  useEffect(() => {
    if (!isOpen || !allowClassrooms || !accessToken || isSuperAdmin || !school?.id) return;
    let cancelled = false;
    const url = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"].includes(role)
      ? `/api/schools/${school.id}/classrooms`
      : `/api/classrooms`;
    api
      .get(url)
      .then((rows) => {
        if (!cancelled) setClassrooms(toArrayRows(rows));
      })
      .catch(() => {
        if (!cancelled) setClassrooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, allowClassrooms, accessToken, isSuperAdmin, school?.id, role]);

  // ---- Students / staff: server-side, debounced, abortable -------------------
  useEffect(() => {
    if (!isOpen || !accessToken || isSuperAdmin || !school?.id) {
      setEntityLoading(false);
      return;
    }
    const q = debouncedQuery.trim();
    if (q.length < MIN_ENTITY_QUERY) {
      abortRef.current?.abort();
      fetchSeqRef.current += 1;
      setStudents([]);
      setStaff([]);
      setEntityError(false);
      setEntityLoading(false);
      return;
    }

    const seq = ++fetchSeqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const cacheKey = normalizeSearchText(q);
    const tasks: Promise<void>[] = [];

    const runFetch = (kind: "stu" | "staff", apply: (rows: any[]) => void) => {
      const cached = entityCacheRef.current.get(`${kind}:${cacheKey}`);
      if (cached) {
        apply(cached);
        return;
      }
      const path =
        kind === "stu"
          ? `/api/schools/${school.id}/students`
          : `/api/schools/${school.id}/staff`;
      tasks.push(
        api
          .get(path, { params: { q, pageSize: ENTITY_PAGE_SIZE }, signal: controller.signal })
          .then((res) => {
            const rows = toArrayRows(res).slice(0, ENTITY_PAGE_SIZE);
            if (entityCacheRef.current.size >= ENTITY_CACHE_MAX) {
              const oldest = entityCacheRef.current.keys().next().value;
              if (oldest !== undefined) entityCacheRef.current.delete(oldest);
            }
            entityCacheRef.current.set(`${kind}:${cacheKey}`, rows);
            if (seq === fetchSeqRef.current) apply(rows);
          })
          .catch(() => {
            if (controller.signal.aborted || seq !== fetchSeqRef.current) return;
            apply([]);
            setEntityError(true);
          })
      );
    };

    if (allowStudents) runFetch("stu", setStudents);
    else setStudents([]);
    if (allowStaff) runFetch("staff", setStaff);
    else setStaff([]);

    if (tasks.length) {
      setEntityLoading(true);
      void Promise.allSettled(tasks).finally(() => {
        if (seq === fetchSeqRef.current) setEntityLoading(false);
      });
    }
  }, [isOpen, debouncedQuery, accessToken, isSuperAdmin, school?.id, role, allowStudents, allowStaff]);

  // ---- Result groups ---------------------------------------------------------
  const groups = useMemo((): SearchGroup[] => {
    const q = normalizeSearchText(query);

    const profileItem: SearchItem = {
      id: "page-profile",
      type: "page",
      label: t("globalSearch.myProfile"),
      subtitle: t("globalSearch.account"),
      path: profilePath,
      icon: User,
      meta: { segment: "profile", sectionLabel: t("globalSearch.account") },
    };

    const logoutItem: SearchItem = {
      id: "action-logout",
      type: "action",
      label: t("globalSearch.signOut"),
      subtitle: t("globalSearch.account"),
      icon: LogOut,
      meta: { action: "logout" },
    };

    const pushGroup = (out: SearchGroup[], key: string, label: string, items: SearchItem[], topScore: number) => {
      if (items.length) out.push({ key, label, items, topScore });
    };

    if (!q) {
      const out: SearchGroup[] = [];
      if (recentSearches.length) {
        out.push({
          key: "recent",
          label: t("globalSearch.recent"),
          topScore: 0,
          items: recentSearches.map((r) => ({
            id: `recent-${r}`,
            type: "recent" as const,
            label: r,
            subtitle: t("globalSearch.recentHint"),
            icon: Clock,
            meta: { query: r },
          })),
        });
      }
      pushGroup(out, "pages", t("globalSearch.suggestions"), allowedPages.slice(0, 8), 0);
      out.push({
        key: "account",
        label: t("globalSearch.account"),
        topScore: 0,
        items: [profileItem, logoutItem],
      });
      return out;
    }

    const pageScored: { item: SearchItem; score: number }[] = [];
    for (const p of allowedPages) {
      const score = scoreFields(
        [
          { text: p.label, weight: 1 },
          { text: p.meta?.sectionLabel, weight: 0.6 },
          { text: p.meta?.segment, weight: 0.55 },
          { text: p.path, weight: 0.45 },
        ],
        q
      );
      if (score > 0) pageScored.push({ item: p, score });
    }
    const topPages = sortByScoreDesc(pageScored).slice(0, 8);

    const out: SearchGroup[] = [];
    pushGroup(
      out,
      "pages",
      t("globalSearch.pagesGroup"),
      topPages.map((x) => x.item),
      topPages[0]?.score ?? 0
    );

    if (allowClassrooms) {
      const scored: { item: SearchItem; score: number }[] = [];
      for (const c of classrooms) {
        const name = String(c.name || "").trim();
        const code = String(c.classCode || c.code || "").trim();
        const score = Math.max(scoreFields([{ text: name }, { text: code, weight: 0.9 }], q), 0.01);
        if (score <= 0.01) continue;
        scored.push({
          score,
          item: {
            id: `classroom-${c.id}`,
            type: "classroom",
            label: name || code || t("globalSearch.classroom"),
            subtitle: code
              ? t("globalSearch.classroomWithCode", { code })
              : t("globalSearch.classroom"),
            icon: BookOpen,
            path: `/${slug}/classroom/${c.id}`,
            meta: {
              code,
              members: c._count?.members ?? c.members?.length ?? 0,
            },
          },
        });
        if (scored.length >= 30) break;
      }
      const top = sortByScoreDesc(scored).slice(0, 6);
      pushGroup(out, "classrooms", t("globalSearch.classroom"), top.map((x) => x.item), top[0]?.score ?? 0);
    }

    if (allowStudents) {
      const scored: { item: SearchItem; score: number }[] = [];
      for (const s of students) {
        const name = String(s.name || "").trim();
        const email = String(s.email || "").trim();
        const score = Math.max(
          scoreFields([{ text: name }, { text: email, weight: 0.85 }], q),
          0.5
        );
        scored.push({
          score,
          item: {
            id: `student-${s.id}`,
            type: "student",
            label: name || email || t("common:student"),
            subtitle: email || t("common:student"),
            icon: Users,
            path: `/${slug}/students`,
            meta: {
              id: s.id,
              email,
              phone: s.phone,
              photoUrl: s.photoUrl,
              isActive: s.isActive,
            },
          },
        });
      }
      const top = sortByScoreDesc(scored).slice(0, ENTITY_PAGE_SIZE);
      pushGroup(out, "students", t("common:student"), top.map((x) => x.item), top[0]?.score ?? 0);
    }

    if (allowStaff) {
      const scored: { item: SearchItem; score: number }[] = [];
      for (const st of staff) {
        const name = String(st.name || "").trim();
        const email = String(st.email || "").trim();
        const stRole = String(st.role || "");
        const roleLabel = staffRoleLabel(stRole);
        const score = Math.max(
          scoreFields(
            [
              { text: name },
              { text: email, weight: 0.85 },
              { text: roleLabel, weight: 0.7 },
              { text: stRole.replace(/_/g, " "), weight: 0.6 },
            ],
            q
          ),
          0.5
        );
        scored.push({
          score,
          item: {
            id: `staff-${st.id}`,
            type: "staff",
            label: name || email || t("globalSearch.typeStaff"),
            subtitle: roleLabel,
            icon: UserCog,
            path: `/${slug}/staff`,
            meta: {
              id: st.id,
              email,
              phone: st.phone,
              role: stRole,
              photoUrl: st.photoUrl,
              isActive: st.isActive !== false,
            },
          },
        });
      }
      const top = sortByScoreDesc(scored).slice(0, ENTITY_PAGE_SIZE);
      pushGroup(out, "staff", t("globalSearch.typeStaff"), top.map((x) => x.item), top[0]?.score ?? 0);
    }

    const profileScore = scoreFields(
      [
        { text: profileItem.label },
        { text: "profile", weight: 0.9 },
        { text: "my profile", weight: 0.9 },
        { text: t("common:myProfile"), weight: 0.9 },
      ],
      q
    );
    const logoutScore = scoreFields(
      [
        { text: logoutItem.label },
        { text: "sign out", weight: 0.8 },
        { text: "logout", weight: 0.8 },
        { text: "log out", weight: 0.8 },
        { text: t("common:logout"), weight: 0.8 },
      ],
      q
    );
    const accountItems: SearchItem[] = [];
    if (profileScore > 0) accountItems.push(profileItem);
    if (logoutScore > 0) accountItems.push(logoutItem);
    pushGroup(out, "account", t("globalSearch.account"), accountItems, Math.max(profileScore, logoutScore));

    // Surface the most relevant group first; stable priority breaks ties.
    out.sort(
      (a, b) =>
        b.topScore - a.topScore ||
        (GROUP_PRIORITY[b.key] ?? 0) - (GROUP_PRIORITY[a.key] ?? 0)
    );
    return out;
  }, [
    query,
    allowedPages,
    classrooms,
    students,
    staff,
    recentSearches,
    allowClassrooms,
    allowStudents,
    allowStaff,
    slug,
    profilePath,
    t,
  ]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const selectedItem = flatItems[selectedIndex] || null;
  const typedQuery = query.trim();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, flatItems.length]);

  useEffect(() => {
    const el = document.getElementById(`gs-opt-${selectedIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelectItem = (item: SearchItem) => {
    if (item.type === "recent") {
      const next = String(item.meta?.query || "");
      setQuery(next);
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    if (item.type === "action" && item.meta?.action === "logout") {
      logout();
      navigate("/login");
      setIsOpen(false);
      return;
    }
    if (typedQuery && (item.type === "student" || item.type === "staff" || item.type === "classroom")) {
      rememberSearch(typedQuery);
    }
    if (item.path) {
      navigate(item.path);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const count = flatItems.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (count ? (prev + 1) % count : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (count ? (prev - 1 + count) % count : 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedIndex(Math.max(0, count - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[selectedIndex]) handleSelectItem(flatItems[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const entityHint = [
    allowStudents && t("globalSearch.entityStudents"),
    allowStaff && t("globalSearch.entityStaff"),
    allowClassrooms && t("globalSearch.entityClasses"),
  ]
    .filter(Boolean)
    .join(", ");

  const typeLabel = useCallback(
    (type: SearchItemType) => {
      switch (type) {
        case "page":
          return t("globalSearch.page");
        case "student":
          return t("common:student");
        case "staff":
          return t("globalSearch.typeStaff");
        case "classroom":
          return t("globalSearch.classroom");
        case "action":
          return t("globalSearch.account");
        case "recent":
          return t("globalSearch.recent");
        default:
          return t("globalSearch.page");
      }
    },
    [t]
  );

  const showSkeleton = entityLoading && flatItems.length === 0;

  // ---- Render ----------------------------------------------------------------
  const renderList = () => {
    if (showSkeleton) {
      return (
        <div className="space-y-1.5 px-1 py-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/5 rounded bg-slate-100 animate-pulse" />
                <div className="h-2.5 w-1/4 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (flatItems.length === 0) {
      return (
        <div className="py-16 px-6 text-center space-y-2">
          <Search className="w-6 h-6 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold tracking-tight text-slate-800">
            {t("globalSearch.noMatches")}
          </p>
          <p className="text-xs text-slate-500">{t("globalSearch.noMatchesHint")}</p>
        </div>
      );
    }

    let offset = 0;
    return (
      <div role="presentation">
        {groups.map((group) => {
          const start = offset;
          offset += group.items.length;
          return (
            <div key={group.key} role="presentation" className="mb-1">
              <div className="flex items-center justify-between px-3 py-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {group.label}
                  <span className="ml-1.5 font-semibold text-slate-400 normal-case">
                    {group.items.length}
                  </span>
                </p>
                {group.key === "recent" && (
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline underline-offset-2"
                  >
                    {t("globalSearch.clearRecent")}
                  </button>
                )}
              </div>
              {group.items.map((item, i) => {
                const flatIndex = start + i;
                const ItemIcon = item.icon || Sparkles;
                const focused = flatIndex === selectedIndex;
                return (
                  <button
                    key={item.id}
                    id={`gs-opt-${flatIndex}`}
                    type="button"
                    role="option"
                    aria-selected={focused}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors border ${
                      focused
                        ? "bg-indigo-50 border-indigo-100 text-slate-900"
                        : "bg-white border-transparent hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        focused ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">
                        <Highlighted text={item.label} query={typedQuery} />
                      </p>
                      {item.subtitle ? (
                        <p className="text-xs font-medium text-slate-400 truncate">
                          <Highlighted text={item.subtitle} query={typedQuery} />
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 ${focused ? "text-indigo-500" : "text-slate-300"}`}
                    />
                  </button>
                );
              })}
            </div>
          );
        })}
        {entityError ? (
          <p className="mx-1 mt-1 flex items-start gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-medium text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {t("globalSearch.loadError")}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center sm:justify-start gap-0 sm:gap-2.5 p-2.5 sm:px-4 sm:py-2.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-white rounded-xl transition-all cursor-pointer group w-11 h-11 sm:w-48 lg:w-64 sm:h-auto max-w-xs shrink-0 min-h-11 min-w-11"
        title={t("globalSearch.triggerTitle")}
        id="global-search-header-trigger"
        aria-label={t("globalSearch.openLabel")}
      >
        <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
        <span className="hidden sm:block text-xs font-bold text-slate-500 group-hover:text-slate-600 transition-colors text-left flex-1 truncate">
          {t("globalSearch.searchPlaceholder")}
        </span>
        <div className="hidden md:flex items-center gap-0.5 bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg text-[9px] font-bold text-slate-400 shrink-0">
          <kbd className="font-sans">Ctrl</kbd>
          <span>K</span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div
            onClick={(e) => {
              if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setIsOpen(false);
              }
            }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-start sm:items-center justify-center z-[100] p-4 overflow-hidden"
          >
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              onKeyDown={handleKeyDown}
              className="w-full max-w-3xl bg-white rounded-[32px] border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col h-[min(520px,85vh)] mt-12 sm:mt-0"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
                {entityLoading ? (
                  <Loader2 className="w-5 h-5 text-indigo-600 shrink-0 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-indigo-600 shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="gs-listbox"
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  aria-activedescendant={selectedItem ? `gs-opt-${selectedIndex}` : undefined}
                  aria-label={t("globalSearch.searchTitle")}
                  placeholder={
                    entityHint
                      ? t("globalSearch.searchPagesWith", { entities: entityHint })
                      : t("globalSearch.searchPagesOnly")
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 font-medium text-sm"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
                    aria-label={t("globalSearch.clearQuery")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
                  aria-label={t("globalSearch.close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden min-h-0 divide-x divide-slate-100">
                <div
                  id="gs-listbox"
                  role="listbox"
                  aria-label={t("globalSearch.searchTitle")}
                  aria-busy={entityLoading || undefined}
                  className="w-full sm:w-1/2 overflow-y-auto p-3 space-y-1"
                >
                  {!typedQuery ? null : (
                    <p
                      role="presentation"
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 py-1"
                    >
                      {t("globalSearch.results", { count: flatItems.length })}
                    </p>
                  )}
                  {renderList()}
                </div>

                <div className="hidden sm:flex w-1/2 bg-slate-50/60 overflow-y-auto p-6 flex-col">
                  {selectedItem ? (
                    <div className="flex-1 flex flex-col space-y-4">
                      <div className="flex items-start gap-3">
                        {selectedItem.type === "student" || selectedItem.type === "staff" ? (
                          <UserAvatar
                            userId={String(selectedItem.meta?.id || "")}
                            name={selectedItem.label}
                            photoUrl={selectedItem.meta?.photoUrl as string | null}
                            size="lg"
                            rounded="2xl"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            {React.createElement(selectedItem.icon || Sparkles, {
                              className: "w-6 h-6",
                            })}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                            {typeLabel(selectedItem.type)}
                          </p>
                          <h3 className="font-extrabold tracking-tight text-slate-900 text-lg leading-snug truncate">
                            {selectedItem.label}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">{selectedItem.subtitle}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-sm text-slate-600">
                        {selectedItem.type === "page" && (
                          <>
                            <p className="text-xs leading-relaxed">{t("globalSearch.openPageHint")}</p>
                            {selectedItem.path ? (
                              <p className="text-xs pt-1">
                                <span className="font-bold text-slate-400 uppercase text-xs tracking-wider block mb-0.5">
                                  {t("globalSearch.pathLabel")}
                                </span>
                                <span className="font-mono text-slate-600 break-all">
                                  {selectedItem.path}
                                </span>
                              </p>
                            ) : null}
                          </>
                        )}
                        {selectedItem.type === "recent" && (
                          <p className="text-xs leading-relaxed">{t("globalSearch.recentHint")}</p>
                        )}
                        {selectedItem.type === "classroom" && (
                          <>
                            <p className="text-xs">
                              <span className="font-bold text-slate-400 uppercase text-xs tracking-wider block mb-0.5">
                                {t("common:code")}
                              </span>
                              <span className="font-mono">
                                {String(selectedItem.meta?.code || "—")}
                              </span>
                            </p>
                            <p className="text-xs">
                              <span className="font-bold text-slate-400 uppercase text-xs tracking-wider block mb-0.5">
                                {t("common:members")}
                              </span>
                              {String(selectedItem.meta?.members ?? "—")}
                            </p>
                          </>
                        )}
                        {(selectedItem.type === "student" || selectedItem.type === "staff") && (
                          <>
                            <p className="flex items-center gap-2 text-xs">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {String(selectedItem.meta?.email || "—")}
                            </p>
                            {selectedItem.meta?.phone != null && (
                              <p className="flex items-center gap-2 text-xs">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {String(selectedItem.meta.phone || "—")}
                              </p>
                            )}
                          </>
                        )}
                        {selectedItem.type === "action" && (
                          <p className="text-xs leading-relaxed">{t("globalSearch.signOutHint")}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectItem(selectedItem)}
                        className="mt-auto w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
                      >
                        {selectedItem.type === "action"
                          ? t("globalSearch.signOut")
                          : t("globalSearch.open")}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                      <Command className="w-10 h-10 text-slate-300" />
                      <p className="text-sm font-extrabold tracking-tight text-slate-600">
                        {t("globalSearch.searchTitle")}
                      </p>
                      <p className="text-xs max-w-[220px]">{t("globalSearch.searchHint")}</p>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-sans">Esc</kbd>
                      {t("globalSearch.close")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-sans">↵</kbd>
                      {t("globalSearch.open")}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
