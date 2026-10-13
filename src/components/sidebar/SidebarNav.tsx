import React from "react";
import type { NavSection } from "../../constants/navByRole";
import { SidebarSection } from "./SidebarSection";

type SidebarNavProps = {
  sections: NavSection[];
  pathname: string;
  openSections: Record<string, boolean>;
  collapsed: boolean;
  flyoutSectionId: string | null;
  navBadges: Record<string, number>;
  translateLabel: (key: string) => string;
  emptyLabel: string;
  onToggleSection: (id: string) => void;
  onFlyoutSection: (id: string | null) => void;
  onNavigate?: () => void;
};

export function SidebarNav({
  sections,
  pathname,
  openSections,
  collapsed,
  flyoutSectionId,
  navBadges,
  translateLabel,
  emptyLabel,
  onToggleSection,
  onFlyoutSection,
  onNavigate,
}: SidebarNavProps) {
  if (sections.length === 0) {
    return (
      <p className={collapsed ? "px-2 py-3 text-center text-[11px] text-slate-500" : "px-4 py-3 text-xs font-medium text-slate-500"}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <nav
      className={`flex-1 space-y-2 overflow-y-auto overflow-x-visible py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 ${
        collapsed ? "px-2" : "px-3"
      }`}
    >
      {sections.map((section) => (
        <SidebarSection
          key={section.id}
          section={section}
          pathname={pathname}
          isOpen={openSections[section.id] === true}
          collapsed={collapsed}
          flyoutOpen={flyoutSectionId === section.id}
          navBadges={navBadges}
          translateLabel={translateLabel}
          onToggle={() => onToggleSection(section.id)}
          onFlyoutOpen={() => onFlyoutSection(section.id)}
          onFlyoutClose={() => onFlyoutSection(null)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
