import React from "react";
import { Link } from "react-router-dom";
import { NavBadge } from "../../features/notifications/components/NavBadge";
import { cn } from "../../lib/cn";

type SidebarLeafProps = {
  to: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: number;
  collapsed?: boolean;
  nested?: boolean;
  onNavigate?: () => void;
};

/** e.g. /demo/attendance → nav-attendance */
function guideIdFromTo(to: string): string | undefined {
  const parts = to.split("/").filter(Boolean);
  if (parts.length < 2) return undefined;
  return `nav-${parts.slice(1).join("-")}`;
}

export function SidebarLeaf({
  to,
  icon: Icon,
  label,
  active,
  badge,
  collapsed,
  nested,
  onNavigate,
}: SidebarLeafProps) {
  return (
    <Link
      to={to}
      data-guide-id={guideIdFromTo(to)}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex min-h-11 items-center rounded-xl text-sm transition-colors duration-200",
        collapsed ? "justify-center px-0" : "gap-3 px-3 py-2.5",
        nested && !collapsed && "ps-4",
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-white" : "text-slate-400 group-hover:text-white"
        )}
      />
      {!collapsed ? (
        <>
          <span className="truncate font-medium">{label}</span>
          <NavBadge count={badge} active={active} />
        </>
      ) : null}
      {collapsed && badge && badge > 0 ? (
        <span className="absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
      ) : null}
    </Link>
  );
}
