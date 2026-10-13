import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import type { NavItem } from "../../constants/navByRole";
import { NavBadge } from "../../features/notifications/components/NavBadge";
import { navKeyFromPath } from "../../features/notifications/utils";
import { cn } from "../../lib/cn";
import { isNavActive } from "./navUtils";

type SidebarFlyoutProps = {
  title: string;
  items: NavItem[];
  pathname: string;
  navBadges: Record<string, number>;
  translateLabel: (key: string) => string;
  anchorEl: HTMLElement | null;
  onNavigate?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function SidebarFlyout({
  title,
  items,
  pathname,
  navBadges,
  translateLabel,
  anchorEl,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: SidebarFlyoutProps) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!anchorEl) {
      setPos(null);
      return;
    }
    const update = () => {
      const r = anchorEl.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      setPos({
        top: r.top,
        left: rtl ? r.left - 8 : r.right + 8,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorEl]);

  if (!pos || typeof document === "undefined") return null;

  const rtl = document.documentElement.dir === "rtl";

  return createPortal(
    <div
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: pos.top,
        left: rtl ? undefined : pos.left,
        right: rtl ? window.innerWidth - pos.left : undefined,
        transform: rtl ? "translateX(-100%)" : undefined,
      }}
      className="z-[80] min-w-[13rem] overflow-hidden rounded-2xl border border-white/10 bg-[#11101d] py-2 shadow-[0_16px_40px_rgb(0,0,0,0.45)]"
    >
      <p className="truncate px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <ul className="space-y-0.5 px-1.5">
        {items.map((item) => {
          const active = isNavActive(pathname, item.to);
          const Icon = item.icon;
          const badge = navBadges[navKeyFromPath(item.to) || ""] || 0;
          return (
            <li key={item.to}>
              <Link
                role="menuitem"
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">{translateLabel(item.labelKey)}</span>
                <NavBadge count={badge} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body
  );
}
