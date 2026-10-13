import React from "react";
import { formatBadgeCount } from "../utils";
import { cn } from "../../../lib/cn";

export function NavBadge({
  count,
  active,
}: {
  count?: number;
  active?: boolean;
}) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold font-mono flex items-center justify-center shrink-0",
        active
          ? "bg-white/20 text-white"
          : "bg-rose-500 text-white"
      )}
      aria-label={`${count} notifications`}
    >
      {formatBadgeCount(count)}
    </span>
  );
}
