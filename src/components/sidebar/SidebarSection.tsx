import React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { NavSection } from "../../constants/navByRole";
import { NavBadge } from "../../features/notifications/components/NavBadge";
import { navKeyFromPath } from "../../features/notifications/utils";
import { cn } from "../../lib/cn";
import { SidebarFlyout } from "./SidebarFlyout";
import { SidebarLeaf } from "./SidebarLeaf";
import { isNavActive, sectionBadgeTotal, sectionContainsActive } from "./navUtils";

type SidebarSectionProps = {
  section: NavSection;
  pathname: string;
  isOpen: boolean;
  collapsed: boolean;
  flyoutOpen: boolean;
  navBadges: Record<string, number>;
  translateLabel: (key: string) => string;
  onToggle: () => void;
  onFlyoutOpen: () => void;
  onFlyoutClose: () => void;
  onNavigate?: () => void;
};

export function SidebarSection({
  section,
  pathname,
  isOpen,
  collapsed,
  flyoutOpen,
  navBadges,
  translateLabel,
  onToggle,
  onFlyoutOpen,
  onFlyoutClose,
  onNavigate,
}: SidebarSectionProps) {
  const activeInSection = sectionContainsActive(section, pathname);
  const groupBadge = sectionBadgeTotal(section, navBadges, navKeyFromPath);
  const SectionIcon = section.items[0]?.icon;
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => onFlyoutClose(), 140);
  };

  React.useEffect(() => () => clearCloseTimer(), []);

  if (collapsed) {
    const only = section.items.length === 1 ? section.items[0] : null;

    return (
      <div
        className="relative"
        onMouseEnter={() => {
          if (only) return;
          clearCloseTimer();
          onFlyoutOpen();
        }}
        onMouseLeave={() => {
          if (only) return;
          scheduleClose();
        }}
      >
        {only ? (
          <Link
            to={only.to}
            onClick={onNavigate}
            className={cn(
              "relative flex min-h-11 w-full items-center justify-center rounded-xl transition-colors",
              activeInSection
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
            )}
            title={translateLabel(only.labelKey)}
          >
            {SectionIcon ? <SectionIcon className="h-5 w-5" /> : null}
            {groupBadge > 0 ? (
              <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
            ) : null}
          </Link>
        ) : (
          <button
            type="button"
            ref={triggerRef}
            onClick={() => {
              if (flyoutOpen) onFlyoutClose();
              else onFlyoutOpen();
            }}
            onFocus={() => {
              clearCloseTimer();
              onFlyoutOpen();
            }}
            className={cn(
              "relative flex min-h-11 w-full items-center justify-center rounded-xl transition-colors",
              activeInSection || flyoutOpen
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
            )}
            aria-expanded={flyoutOpen}
            aria-haspopup="menu"
            title={translateLabel(section.labelKey)}
          >
            {SectionIcon ? <SectionIcon className="h-5 w-5" /> : null}
            {groupBadge > 0 ? (
              <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
            ) : null}
          </button>
        )}
        <AnimatePresence>
          {flyoutOpen && !only ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SidebarFlyout
                title={translateLabel(section.labelKey)}
                items={section.items}
                pathname={pathname}
                navBadges={navBadges}
                translateLabel={translateLabel}
                anchorEl={triggerRef.current}
                onNavigate={onNavigate}
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleClose}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl transition-colors duration-200",
        isOpen ? "bg-white/[0.04] ring-1 ring-white/5" : "ring-1 ring-transparent"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-start transition-colors",
          // Active color on label/icon only — solid fill is reserved for leaf items
          activeInSection
            ? "bg-transparent text-indigo-400 hover:bg-white/5"
            : isOpen
              ? "bg-transparent text-slate-200 hover:bg-white/5"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        )}
        aria-expanded={isOpen}
        aria-current={activeInSection ? "true" : undefined}
      >
        {SectionIcon ? (
          <SectionIcon
            className={cn(
              "h-4 w-4 shrink-0",
              activeInSection ? "text-indigo-400" : isOpen ? "text-slate-300" : "text-slate-500"
            )}
          />
        ) : null}
        <span className="flex-1 truncate text-xs font-bold uppercase tracking-wider">
          {translateLabel(section.labelKey)}
        </span>
        {!isOpen && groupBadge > 0 ? <NavBadge count={groupBadge} active={false} /> : null}
        {isOpen ? (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0",
              activeInSection ? "text-indigo-400" : "text-slate-400"
            )}
          />
        ) : (
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 rtl:rotate-180",
              activeInSection ? "text-indigo-400" : "text-slate-500"
            )}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-0.5 overflow-hidden px-1.5 pb-2"
          >
            {section.items.map((item) => (
              <SidebarLeaf
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={translateLabel(item.labelKey)}
                active={isNavActive(pathname, item.to)}
                badge={navBadges[navKeyFromPath(item.to) || ""] || 0}
                nested
                onNavigate={onNavigate}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
