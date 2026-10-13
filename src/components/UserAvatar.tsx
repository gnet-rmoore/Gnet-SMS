import React from "react";
import { useAuthStore } from "../store/authStore";
import { initialsFromName } from "../lib/profileImage";
import { cn } from "../lib/cn";
import { resolveAvatarPhotoUrl } from "../lib/avatarPhoto";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, string> = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-28 h-28 text-3xl",
};

const FALLBACK = [
  "bg-indigo-600 text-white",
  "bg-emerald-600 text-white",
  "bg-sky-600 text-white",
  "bg-violet-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
];

function colorForId(id?: string | null) {
  if (!id) return FALLBACK[0];
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return FALLBACK[sum % FALLBACK.length];
}

export type UserAvatarProps = {
  userId?: string | null;
  name?: string | null;
  /** Explicit photo; when userId matches session, auth-store photo wins (including cleared). */
  photoUrl?: string | null;
  size?: Size;
  className?: string;
  rounded?: "full" | "2xl" | "3xl";
  /** Prefer live session photo for the signed-in user (default true). */
  preferSessionPhoto?: boolean;
};

/**
 * Consistent avatar. When `userId` matches the signed-in user, uses auth-store
 * `photoUrl` (even when null) so profile updates appear everywhere without refetch.
 */
export function UserAvatar({
  userId,
  name,
  photoUrl,
  size = "md",
  className,
  rounded = "full",
  preferSessionPhoto = true,
}: UserAvatarProps) {
  const session = useAuthStore((s) => s.user);
  const resolvedPhoto = resolveAvatarPhotoUrl({
    userId,
    photoUrl,
    sessionUserId: session?.id,
    sessionPhotoUrl: session?.photoUrl,
    preferSessionPhoto,
  });

  const displayName = name || (userId && session?.id === userId ? session?.name : null) || "";
  const radius =
    rounded === "full" ? "rounded-full" : rounded === "3xl" ? "rounded-[32px]" : "rounded-2xl";

  if (resolvedPhoto) {
    return (
      <img
        src={resolvedPhoto}
        alt={displayName || "User"}
        referrerPolicy="no-referrer"
        className={cn(
          SIZE[size],
          radius,
          "object-cover shrink-0 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        SIZE[size],
        radius,
        "inline-flex items-center justify-center font-extrabold shrink-0 border border-white/20",
        colorForId(userId),
        className
      )}
      aria-hidden={!displayName}
      title={displayName || undefined}
    >
      {initialsFromName(displayName)}
    </div>
  );
}
