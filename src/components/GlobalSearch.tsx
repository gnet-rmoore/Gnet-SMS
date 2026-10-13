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
import { UserAvatar } from "./UserAvatar";
import { api } from "../services/api";

type SearchItemType = "page" | "student" | "staff" | "classroom" | "action";

interface SearchItem {
  id: string;
  type: SearchItemType;
  label: string;
  subtitle?: string;
  path?: string;
  icon?: React.ElementType;
  meta?: Record<string, unknown>;
}

function normalizeQuery(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function matchesQuery(haystack: string, q: string): boolean {
  if (!q) return false;
  const h = normalizeQuery(haystack);
  if (!h) return false;
  if (h.includes(q)) return true;
  // Match hyphenated path segments as words ("grade-review" ↔ "grade review")
  return h.replace(/[-_]/g, " ").includes(q);
}

export const GlobalSearch = () => {
  const { t } = useTranslation(["pages", "common", "nav", "roles"]);
  const { user, school, accessToken, logout, capabilities, entitlements } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const profilePath =
    role === "SUPER_ADMIN" ? "/super-admin/profile" : slug ? `/${slug}/profile` : "/login";

  const fetchSearchData = useCallback(async () => {
    if (!accessToken) return;
    // Super admin: pages only (no school tenant entities)
    if (role === "SUPER_ADMIN" || !school?.id) {
      setStudents([]);
      setStaff([]);
      setClassrooms([]);
      return;
    }

    setLoading(true);
    try {
      const tasks: Promise<void>[] = [];

      if (allowStudents) {
        tasks.push(
          api
            .get(`/api/schools/${school.id}/students`)
            .then((rows) => setStudents(Array.isArray(rows) ? rows : []))
            .catch(() => setStudents([]))
        );
      } else {
        setStudents([]);
      }

      if (allowStaff) {
        tasks.push(
          api
            .get(`/api/schools/${school.id}/staff`)
            .then((rows) => setStaff(Array.isArray(rows) ? rows : []))
            .catch(() => setStaff([]))
        );
      } else {
        setStaff([]);
      }

      if (allowClassrooms) {
        const url = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"].includes(role)
          ? `/api/schools/${school.id}/classrooms`
          : `/api/classrooms`;
        tasks.push(
          api
            .get(url)
            .then((rows) => setClassrooms(Array.isArray(rows) ? rows : []))
            .catch(() => setClassrooms([]))
        );
      } else {
        setClassrooms([]);
      }

      await Promise.all(tasks);
    } finally {
      setLoading(false);
    }
  }, [school?.id, role, accessToken, allowStudents, allowStaff, allowClassrooms]);

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

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      setQuery("");
      setSelectedIndex(0);
      return;
    }
    document.body.style.overflow = "hidden";
    void fetchSearchData();
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [isOpen, fetchSearchData]);

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
        default:
          return t("globalSearch.page");
      }
    },
    [t]
  );

  const filteredItems = useMemo((): SearchItem[] => {
    const q = normalizeQuery(query);

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

    if (!q) {
      return [...allowedPages.slice(0, 8), profileItem, logoutItem];
    }

    const out: SearchItem[] = [];

    for (const p of allowedPages) {
      const sectionLabel = String(p.meta?.sectionLabel || "");
      const segment = String(p.meta?.segment || "");
      if (
        matchesQuery(p.label, q) ||
        matchesQuery(sectionLabel, q) ||
        matchesQuery(segment, q) ||
        matchesQuery(String(p.path || ""), q)
      ) {
        out.push(p);
      }
    }

    if (
      matchesQuery(profileItem.label, q) ||
      matchesQuery("profile", q) ||
      matchesQuery("my profile", q) ||
      matchesQuery(t("common:myProfile"), q)
    ) {
      out.push(profileItem);
    }

    if (allowClassrooms) {
      let n = 0;
      for (const c of classrooms) {
        if (n >= 6) break;
        const name = String(c.name || "").trim();
        const code = String(c.classCode || c.code || "").trim();
        if (matchesQuery(name, q) || matchesQuery(code, q)) {
          out.push({
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
          });
          n++;
        }
      }
    }

    if (allowStudents) {
      let n = 0;
      for (const s of students) {
        if (n >= 8) break;
        const name = String(s.name || "").trim();
        const email = String(s.email || "").trim();
        if (matchesQuery(name, q) || matchesQuery(email, q)) {
          out.push({
            id: `student-${s.id}`,
            type: "student",
            label: name || email || t("common:student"),
            subtitle: t("common:student"),
            icon: Users,
            path: `/${slug}/students`,
            meta: {
              id: s.id,
              email,
              phone: s.phone,
              photoUrl: s.photoUrl,
              isActive: s.isActive,
            },
          });
          n++;
        }
      }
    }

    if (allowStaff) {
      let n = 0;
      for (const st of staff) {
        if (n >= 8) break;
        const name = String(st.name || "").trim();
        const email = String(st.email || "").trim();
        const stRole = String(st.role || "");
        const roleLabel = staffRoleLabel(stRole);
        if (
          matchesQuery(name, q) ||
          matchesQuery(email, q) ||
          matchesQuery(stRole.replace(/_/g, " "), q) ||
          matchesQuery(roleLabel, q)
        ) {
          out.push({
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
          });
          n++;
        }
      }
    }

    if (
      matchesQuery(logoutItem.label, q) ||
      matchesQuery("sign out", q) ||
      matchesQuery("logout", q) ||
      matchesQuery("log out", q) ||
      matchesQuery(t("common:logout"), q)
    ) {
      out.push(logoutItem);
    }

    return out;
  }, [
    query,
    allowedPages,
    classrooms,
    students,
    staff,
    allowClassrooms,
    allowStudents,
    allowStaff,
    slug,
    profilePath,
    t,
  ]);

  const selectedItem = filteredItems[selectedIndex] || null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filteredItems.length]);

  const handleSelectItem = (item: SearchItem) => {
    if (item.type === "action" && item.meta?.action === "logout") {
      logout();
      navigate("/login");
      setIsOpen(false);
      return;
    }
    if (item.path) {
      navigate(item.path);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length)
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) handleSelectItem(filteredItems[selectedIndex]);
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
                <Search className="w-5 h-5 text-indigo-600 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    entityHint
                      ? t("globalSearch.searchPagesWith", { entities: entityHint })
                      : t("globalSearch.searchPagesOnly")
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 font-medium text-sm"
                />
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
                <div className="w-full sm:w-1/2 overflow-y-auto p-3 space-y-1">
                  {loading && filteredItems.length === 0 ? (
                    <div className="py-16 text-center text-sm text-slate-500">{t("common:loading")}</div>
                  ) : filteredItems.length === 0 ? (
                    <div className="py-16 px-6 text-center space-y-2">
                      <Search className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-sm font-extrabold tracking-tight text-slate-800">
                        {t("globalSearch.noMatches")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("globalSearch.noMatchesHint")}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
                        {!query
                          ? t("globalSearch.suggestions")
                          : t("globalSearch.results", { count: filteredItems.length })}
                      </p>
                      {filteredItems.map((item, index) => {
                        const ItemIcon = item.icon || Sparkles;
                        const focused = index === selectedIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectItem(item)}
                            onMouseEnter={() => setSelectedIndex(index)}
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
                              <p className="font-bold text-sm truncate">{item.label}</p>
                              <p className="text-xs font-medium text-slate-400 truncate">
                                {item.subtitle}
                              </p>
                            </div>
                            <ChevronRight
                              className={`w-4 h-4 shrink-0 ${focused ? "text-indigo-500" : "text-slate-300"}`}
                            />
                          </button>
                        );
                      })}
                    </>
                  )}
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
                            <p className="text-xs leading-relaxed">
                              {t("globalSearch.openPageHint")}
                            </p>
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
                        {selectedItem.type === "classroom" && (
                          <>
                            <p className="text-xs">
                              <span className="font-bold text-slate-400 uppercase text-xs tracking-wider block mb-0.5">
                                {t("common:code")}
                              </span>
                              <span className="font-mono">{String(selectedItem.meta?.code || "—")}</span>
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
                        {selectedItem.type === "action" ? t("globalSearch.signOut") : t("globalSearch.open")}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                      <Command className="w-10 h-10 text-slate-300" />
                      <p className="text-sm font-extrabold tracking-tight text-slate-600">{t("globalSearch.searchTitle")}</p>
                      <p className="text-xs max-w-[220px]">
                        {t("globalSearch.searchHint")}
                      </p>
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
