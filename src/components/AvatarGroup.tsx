import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserAvatar } from "./UserAvatar";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface AvatarGroupItem {
  id: string;
  name: string;
  photoUrl?: string | null;
  email?: string | null;
  role?: string | null;
}

interface AvatarGroupProps {
  items: AvatarGroupItem[];
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  items = [],
  max = 3,
  size = "sm",
  className,
}) => {
  const uniqueItems = React.useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (!item || !item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [items]);

  if (uniqueItems.length === 0) return null;

  const displayItems = uniqueItems.slice(0, max);
  const remainingCount = uniqueItems.length - max;

  return (
    <div className={cn("flex items-center", className)}>
      <div
        className={cn("flex overflow-hidden", {
          "-space-x-1.5": size === "xs",
          "-space-x-2.5": size === "sm",
          "-space-x-3": size === "md",
          "-space-x-3.5": size === "lg",
        })}
      >
        {displayItems.map((item) => (
          <div key={item.id} className="relative group cursor-pointer">
            <UserAvatar
              userId={item.id}
              name={item.name}
              photoUrl={item.photoUrl}
              size={size}
              className="ring-2 ring-white transition-transform hover:scale-110 hover:z-10"
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
              <div className="bg-slate-900 text-white text-xs font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-lg leading-tight">
                {item.name}
                {item.role && (
                  <span className="opacity-75 font-normal ml-1">({item.role})</span>
                )}
              </div>
              <div className="w-2 h-1 bg-slate-900 transform rotate-45 -mt-0.5" />
            </div>
          </div>
        ))}

        {remainingCount > 0 && (
          <div className="relative group">
            <div
              className={cn(
                "inline-flex items-center justify-center rounded-full ring-2 ring-white bg-slate-100 text-slate-600 font-extrabold shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] cursor-pointer hover:bg-slate-200 transition-colors",
                size === "xs" && "w-6 h-6 text-[9px]",
                size === "sm" && "w-8 h-8 text-xs",
                size === "md" && "w-10 h-10 text-sm",
                size === "lg" && "w-12 h-12 text-base"
              )}
            >
              +{remainingCount}
            </div>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
              <div className="bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-lg whitespace-nowrap shadow-lg flex flex-col gap-0.5 max-h-32 overflow-y-auto leading-tight">
                {uniqueItems.slice(max).map((item) => (
                  <span key={item.id}>• {item.name}</span>
                ))}
              </div>
              <div className="w-2 h-1 bg-slate-900 transform rotate-45 -mt-0.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
