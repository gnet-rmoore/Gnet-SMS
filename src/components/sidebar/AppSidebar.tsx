import React from "react";
import { motion } from "motion/react";
import type { NavSection } from "../../constants/navByRole";
import { cn } from "../../lib/cn";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarNav } from "./SidebarNav";
import { SidebarProfileCard } from "./SidebarProfileCard";
import { SIDEBAR_EXPANDED_PX, SIDEBAR_RAIL_PX } from "./sidebarTokens";

export type AppSidebarProps = {
  navSections: NavSection[];
  pathname: string;
  openSections: Record<string, boolean>;
  navBadges: Record<string, number>;
  translateLabel: (key: string) => string;
  emptyNavLabel: string;
  isDesktop: boolean;
  /** Desktop icon-rail mode (ignored on mobile — always expanded labels). */
  desktopCollapsed: boolean;
  mobileOpen: boolean;
  brand: {
    logoUrl?: string | null;
    title: string;
    subtitle: string;
    letter: string;
  };
  user: {
    id?: string;
    name?: string;
    photoUrl?: string | null;
    role?: string | null;
  };
  profileTo: string;
  onToggleSection: (id: string) => void;
  onNavigate: () => void;
  onLogout: () => void;
};

export function AppSidebar({
  navSections,
  pathname,
  openSections,
  navBadges,
  translateLabel,
  emptyNavLabel,
  isDesktop,
  desktopCollapsed,
  mobileOpen,
  brand,
  user,
  profileTo,
  onToggleSection,
  onNavigate,
  onLogout,
}: AppSidebarProps) {
  const [flyoutSectionId, setFlyoutSectionId] = React.useState<string | null>(null);
  const collapsed = isDesktop && desktopCollapsed;
  const visible = isDesktop || mobileOpen;

  React.useEffect(() => {
    setFlyoutSectionId(null);
  }, [pathname, desktopCollapsed, mobileOpen]);

  React.useEffect(() => {
    if (!flyoutSectionId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlyoutSectionId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flyoutSectionId]);

  const targetWidth = isDesktop
    ? desktopCollapsed
      ? SIDEBAR_RAIL_PX
      : SIDEBAR_EXPANDED_PX
    : SIDEBAR_EXPANDED_PX;

  return (
    <motion.aside
      id="app-sidebar"
      initial={false}
      animate={
        isDesktop
          ? { width: targetWidth, opacity: 1, x: 0 }
          : { width: SIDEBAR_EXPANDED_PX, opacity: 1, x: mobileOpen ? 0 : -SIDEBAR_EXPANDED_PX }
      }
      transition={{ duration: 0.2 }}
      className={cn(
        "z-50 flex h-screen shrink-0 flex-col overflow-visible bg-[#11101d] text-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.35)]",
        "fixed inset-y-0 start-0",
        "lg:sticky lg:top-3 lg:my-3 lg:ms-3 lg:h-[calc(100vh-1.5rem)] lg:rounded-[28px]",
        !visible && "pointer-events-none"
      )}
      aria-hidden={!visible}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[inherit]",
          collapsed ? "w-[76px]" : "w-72"
        )}
      >
        <SidebarBrand
          collapsed={collapsed}
          logoUrl={brand.logoUrl}
          title={brand.title}
          subtitle={brand.subtitle}
          letter={brand.letter}
        />
        <SidebarNav
          sections={navSections}
          pathname={pathname}
          openSections={openSections}
          collapsed={collapsed}
          flyoutSectionId={flyoutSectionId}
          navBadges={navBadges}
          translateLabel={translateLabel}
          emptyLabel={emptyNavLabel}
          onToggleSection={onToggleSection}
          onFlyoutSection={setFlyoutSectionId}
          onNavigate={() => {
            setFlyoutSectionId(null);
            onNavigate();
          }}
        />
        <SidebarProfileCard
          collapsed={collapsed}
          userId={user.id}
          name={user.name}
          photoUrl={user.photoUrl}
          role={user.role}
          profileTo={profileTo}
          onLogout={onLogout}
        />
      </div>
    </motion.aside>
  );
}
