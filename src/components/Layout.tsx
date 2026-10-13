import React from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import {
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageSkeleton } from "./PageSkeleton";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { flattenNavSections } from "../constants/navByRole";
import { UserAvatar } from "./UserAvatar";
import { applySchoolBrandToDocument } from "../lib/brandPalette";
import { useNavBadges } from "../features/notifications/hooks/useNotificationsQuery";
import { getNavSectionsForSession } from "../lib/navSectionsForSession";
import { changeAppLocale, normalizeLocale, resolveEffectiveLocale } from "../i18n";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { persistPreferredLocale } from "../i18n/persistPreferredLocale";
import { translateApiError } from "../i18n/apiErrors";
import { alertError, toast } from "../lib/swal";
import type { AppLocale } from "../i18n/locales";
import { cn } from "../lib/cn";
import {
  AppSidebar,
  isNavActive,
  sectionContainsActive,
  readSidebarMode,
  writeSidebarMode,
} from "./sidebar";
import { GuideProvider } from "../features/platform-guide/GuideProvider";
import { GuideHost } from "../features/platform-guide/GuideHost";
import { ContinueGuideChip } from "../features/platform-guide/ContinueGuideChip";
import { GradebookBackgroundSyncRunner } from "../features/gradebook/components/GradebookBackgroundSyncRunner";

export function Layout({ children }: { children?: React.ReactNode }) {
  const { t, i18n } = useTranslation(["nav", "common"]);
  const { user, school, logout, accessToken, capabilities, entitlements, setAuth, setCapabilities, impersonation, endImpersonation } =
    useAuthStore();

  React.useEffect(() => {
    const next = resolveEffectiveLocale({
      userPreferred: user?.preferredLocale,
      schoolDefault: school?.defaultLocale,
    });
    if (next && i18n.language !== next) {
      void changeAppLocale(next);
    }
  }, [user?.preferredLocale, school?.defaultLocale, i18n.language]);

  const headerLocale =
    normalizeLocale(user?.preferredLocale) ||
    normalizeLocale(i18n.language) ||
    ("en" as AppLocale);

  const onHeaderLocaleChange = async (locale: AppLocale) => {
    try {
      await persistPreferredLocale(locale);
      void toast.fire({ icon: "success", title: t("languageSaved", { ns: "common" }) });
    } catch (err: unknown) {
      alertError(translateApiError(err) || t("errorGeneric", { ns: "common" }));
    }
  };
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true
  );
  /** Desktop: false = expanded, true = icon rail. Persisted. */
  const [desktopCollapsed, setDesktopCollapsed] = React.useState(() =>
    typeof window !== "undefined" ? readSidebarMode() === "collapsed" : false
  );
  /** Mobile overlay drawer — closed by default below `lg`. */
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [isPageLoading, setIsPageLoading] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);
  const { data: navBadges = {} } = useNavBadges();
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});
  const refreshedSession = React.useRef(false);

  const isSidebarExpandedVisual = isDesktop ? !desktopCollapsed : mobileNavOpen;
  const closeMobileNav = React.useCallback(() => setMobileNavOpen(false), []);
  const toggleSidebar = React.useCallback(() => {
    if (isDesktop) {
      setDesktopCollapsed((v) => {
        const next = !v;
        writeSidebarMode(next ? "collapsed" : "expanded");
        return next;
      });
    } else {
      setMobileNavOpen((v) => !v);
    }
  }, [isDesktop]);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setMobileNavOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    setMobileNavOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  React.useEffect(() => {
    if (!mobileNavOpen || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen, isDesktop]);

  // Prefer stored slug; fall back to URL segment so nav never links to /undefined/…
  const routeSlug = location.pathname.split("/").filter(Boolean)[0];
  const slug =
    school?.slug ||
    (routeSlug && routeSlug !== "super-admin" && routeSlug !== "login"
      ? routeSlug
      : undefined);

  React.useEffect(() => {
    if (!accessToken || refreshedSession.current) return;
    // Super Admin session is minted with a separate JWT secret; /api/auth/me must
    // not replace it with a school-access token (see authService.sessionForUserId).
    if (user?.role === "SUPER_ADMIN") {
      refreshedSession.current = true;
      return;
    }
    refreshedSession.current = true;
    void (async () => {
      try {
        const { roleAccessApi } = await import("../features/role-access/api");
        const session = await roleAccessApi.refreshSession();
        setAuth(
          {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
            photoUrl: session.user.photoUrl ?? null,
            mustChangePassword: Boolean(session.user.mustChangePassword),
          },
          session.accessToken,
          session.school as any,
          session.capabilities,
          session.entitlements ?? null,
          session.quotas ?? null
        );
        setCapabilities(session.capabilities);
      } catch (err: any) {
        if (
          err?.code === "SCHOOL_SUSPENDED" ||
          err?.code === "TRIAL_EXPIRED" ||
          err?.status === 403
        ) {
          const { redirectToSchoolUnavailable } = await import("../lib/schoolUnavailable");
          logout();
          redirectToSchoolUnavailable({
            schoolStatus: String(
              err.schoolStatus || err.code || school?.status || "SUSPENDED"
            ),
            schoolName: err.schoolName || school?.name || null,
            schoolSlug: err.schoolSlug || school?.slug || null,
          });
          return;
        }
        /* keep persisted session without photo until next login */
      }
    })();
  }, [accessToken, user?.role, setAuth, setCapabilities, logout, school?.name, school?.slug, school?.status]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const getSkeletonType = (path: string): "dashboard" | "table" | "detail" | "form" | "grid" => {
    const p = path.toLowerCase();
    if (p.includes("dashboard")) return "dashboard";
    if (p.includes("classroom") || p.includes("feed")) return "grid";
    if (p.includes("settings") || p.includes("profile") || p.includes("setup")) return "form";
    if (
      p.includes("staff") ||
      p.includes("students") ||
      p.includes("exams") ||
      p.includes("attendance") ||
      p.includes("fees") ||
      p.includes("expenses") ||
      p.includes("payroll") ||
      p.includes("leave") ||
      p.includes("records") ||
      p.includes("routes") ||
      p.includes("drivers") ||
      p.includes("work-orders") ||
      p.includes("inventory") ||
      p.includes("procurement") ||
      p.includes("library") ||
      p.includes("clinic") ||
      p.includes("counseling") ||
      p.includes("athletics") ||
      p.includes("hostel") ||
      p.includes("cafeteria")
    ) {
      return "table";
    }
    return "detail";
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const role = user?.role;
  const navSections = React.useMemo(
    () => getNavSectionsForSession(role, slug, capabilities, entitlements),
    [role, slug, capabilities, entitlements]
  );

  const navItems = React.useMemo(() => flattenNavSections(navSections), [navSections]);

  const translateNavKey = React.useCallback(
    (key: string) =>
      t(key.startsWith("sections.") || key.startsWith("items.") ? key : `items.${key}`, {
        ns: "nav",
      }),
    [t]
  );

  // Accordion: only the section for the current page stays open.
  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const s of navSections) {
      next[s.id] = sectionContainsActive(s, location.pathname);
    }
    if (!Object.values(next).some(Boolean)) {
      if (next.overview !== undefined) next.overview = true;
    }
    setOpenSections(next);
  }, [role, navSections, location.pathname]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const currentlyOpen = prev[id] === true;
      const next: Record<string, boolean> = {};
      for (const s of navSections) {
        next[s.id] = false;
      }
      if (!currentlyOpen) next[id] = true;
      return next;
    });
  };

  const pageContent = children ?? <Outlet />;
  const isKioskExam = /\/online-exams\/[^/]+\/(?:take|preview)(?:\/|$)/.test(location.pathname);

  React.useEffect(() => {
    if (role === "SUPER_ADMIN" || !school?.brandColor) {
      applySchoolBrandToDocument(null);
      return;
    }
    applySchoolBrandToDocument(school.brandColor);
    return () => applySchoolBrandToDocument(null);
  }, [role, school?.brandColor]);

  if (isKioskExam) {
    return <div className="min-h-screen bg-slate-100">{pageContent}</div>;
  }

  const activePageLabel =
    translateNavKey(
      navItems.find(
        (item) => isNavActive(location.pathname, item.to) && item.to !== "/super-admin"
      )?.labelKey ||
        navItems.find((item) => isNavActive(location.pathname, item.to))?.labelKey ||
        "items.dashboard"
    ) || "Dashboard";

  const profileTo = role === "SUPER_ADMIN" ? "/super-admin/profile" : `/${slug}/profile`;

  const toggleLabel = isDesktop
    ? desktopCollapsed
      ? t("expandSidebar", { ns: "common", defaultValue: "Expand sidebar" })
      : t("collapseSidebar", { ns: "common", defaultValue: "Collapse sidebar" })
    : mobileNavOpen
      ? t("closeNav", { ns: "common" })
      : t("openNav", { ns: "common" });

  return (
    <GuideProvider>
    <div className="flex min-h-screen bg-slate-100">
      <AnimatePresence>
        {mobileNavOpen && !isDesktop ? (
          <motion.button
            type="button"
            key="nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
            aria-label={t("closeNav", { ns: "common" })}
            onClick={closeMobileNav}
          />
        ) : null}
      </AnimatePresence>

      <AppSidebar
        navSections={navSections}
        pathname={location.pathname}
        openSections={openSections}
        navBadges={navBadges}
        translateLabel={translateNavKey}
        emptyNavLabel={t("noNavForRole", { ns: "common", defaultValue: "No navigation for this role." })}
        isDesktop={isDesktop}
        desktopCollapsed={desktopCollapsed}
        mobileOpen={mobileNavOpen}
        brand={{
          logoUrl: role !== "SUPER_ADMIN" ? school?.logoUrl : null,
          title: "Gnet SMS",
          subtitle: role === "SUPER_ADMIN" ? "Super Admin" : school?.name || "School",
          letter: role === "SUPER_ADMIN" ? "S" : school?.name?.[0] || "S",
        }}
        user={{
          id: user?.id,
          name: user?.name,
          photoUrl: user?.photoUrl,
          role: user?.role,
        }}
        profileTo={profileTo}
        onToggleSection={toggleSection}
        onNavigate={closeMobileNav}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 sm:h-20 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={toggleSidebar}
              className="min-h-11 min-w-11 shrink-0 rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
              aria-label={toggleLabel}
              aria-expanded={isSidebarExpandedVisual}
              aria-controls="app-sidebar"
            >
              {isDesktop ? (
                desktopCollapsed ? (
                  <PanelLeftOpen className="h-6 w-6" />
                ) : (
                  <PanelLeftClose className="h-6 w-6" />
                )
              ) : mobileNavOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <h2 className="truncate text-base font-semibold text-slate-900 sm:text-xl">
              {activePageLabel}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
            <GlobalSearch />
            <NotificationBell />

            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="group flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 transition-all hover:bg-slate-50 focus:outline-none sm:gap-3 sm:border-s sm:border-slate-200 sm:px-2 sm:ps-6"
              >
                <div className="hidden text-end md:block">
                  <p className="text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                    {user?.name}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {user?.role
                      ? user.role
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (c) => c.toUpperCase())
                      : ""}
                  </p>
                </div>
                <UserAvatar
                  userId={user?.id}
                  name={user?.name}
                  photoUrl={user?.photoUrl}
                  size="md"
                />
                <ChevronDown
                  className={cn(
                    "hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:block",
                    isProfileDropdownOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {isProfileDropdownOpen ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute end-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl"
                  >
                    <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 text-start">
                      <p className="truncate text-sm font-black text-slate-900">{user?.name}</p>
                      <p className="truncate text-xs font-medium text-slate-500">{user?.email}</p>
                    </div>

                    <div className="space-y-1 p-1.5">
                      <Link
                        to={profileTo}
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-indigo-600"
                      >
                        <User className="h-4 w-4 text-slate-400" />
                        <span>{t("myProfile", { ns: "common", defaultValue: "My Profile" })}</span>
                      </Link>

                      {role === "SUPER_ADMIN" ? (
                        <Link
                          to="/super-admin/guide"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-indigo-600"
                        >
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <span>{t("platformGuide", { ns: "common", defaultValue: "Platform guide" })}</span>
                        </Link>
                      ) : slug ? (
                        <Link
                          to={`/${slug}/guide`}
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-indigo-600"
                        >
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <span>{t("platformGuide", { ns: "common", defaultValue: "Platform guide" })}</span>
                        </Link>
                      ) : null}

                      <div className="rounded-xl px-2.5 py-2">
                        <LanguageSelect
                          id="header-preferred-locale"
                          value={headerLocale}
                          label={t("yourLanguage", { ns: "common" })}
                          hint={null}
                          applyImmediately={false}
                          onChange={(locale) => void onHeaderLocaleChange(locale)}
                          className="[&_select]:rounded-xl [&_select]:py-2 [&_label]:mb-1"
                        />
                      </div>

                      {role === "SUPER_ADMIN" && (
                        <Link
                          to="/super-admin/settings"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-indigo-600"
                        >
                          <Settings className="h-4 w-4 text-slate-400" />
                          <span>
                            {t("systemSettings", { ns: "common", defaultValue: "System Settings" })}
                          </span>
                        </Link>
                      )}

                      {["SCHOOL_ADMIN", "IT_ADMIN"].includes(role || "") && (
                        <Link
                          to={`/${slug}/settings`}
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-indigo-600"
                        >
                          <Settings className="h-4 w-4 text-slate-400" />
                          <span>
                            {t("schoolSettings", { ns: "common", defaultValue: "School Settings" })}
                          </span>
                        </Link>
                      )}

                      <hr className="mx-2 my-1.5 border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-rose-600 transition-all duration-150 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t("logout", { ns: "common" })}</span>
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {impersonation ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm font-medium text-amber-900">
              Impersonating <span className="font-bold">{impersonation.targetName}</span>
              {" · "}
              {impersonation.reason}
              {" · "}
              ends {new Date(impersonation.expiresAt).toLocaleString()}
            </p>
            <button
              type="button"
              className="text-sm font-bold text-amber-900 underline"
              onClick={() => {
                endImpersonation();
                navigate("/super-admin");
              }}
            >
              End impersonation
            </button>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {isPageLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <PageSkeleton type={getSkeletonType(location.pathname)} />
              </motion.div>
            ) : (
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="min-w-0"
              >
                {pageContent}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <GuideHost />
      <ContinueGuideChip />
      {school?.id &&
        user?.role &&
        ["TEACHER", "SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role) && (
          <GradebookBackgroundSyncRunner schoolId={school.id} />
        )}
    </div>
    </GuideProvider>
  );
}
