import React from "react";
import { cn } from "../../lib/cn";

type SidebarBrandProps = {
  collapsed: boolean;
  logoUrl?: string | null;
  title: string;
  subtitle: string;
  letter: string;
};

export function SidebarBrand({ collapsed, logoUrl, title, subtitle, letter }: SidebarBrandProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 border-b border-white/10",
        collapsed ? "justify-center px-2 py-5" : "px-5 py-5"
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={subtitle}
          className="h-10 w-10 shrink-0 rounded-xl object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-950/40">
          {letter}
        </div>
      )}
      {!collapsed ? (
        <div className="min-w-0">
          <h1 className="truncate font-bold leading-tight text-white">{title}</h1>
          <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">
            {subtitle}
          </p>
        </div>
      ) : null}
    </div>
  );
}
