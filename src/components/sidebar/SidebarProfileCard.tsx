import React from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "../UserAvatar";
import { staffRoleLabel } from "../../constants/roles";

type SidebarProfileCardProps = {
  collapsed: boolean;
  userId?: string;
  name?: string;
  photoUrl?: string | null;
  role?: string | null;
  profileTo: string;
  onLogout: () => void;
};

export function SidebarProfileCard({
  collapsed,
  userId,
  name,
  photoUrl,
  role,
  profileTo,
  onLogout,
}: SidebarProfileCardProps) {
  const { t } = useTranslation(["common", "roles"]);
  const roleLabel = role
    ? t(role, { ns: "roles", defaultValue: staffRoleLabel(role) })
    : "";

  if (collapsed) {
    return (
      <div className="shrink-0 border-t border-white/10 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-2">
          <Link
            to={profileTo}
            title={name || t("myProfile")}
            className="rounded-xl p-1 transition-colors hover:bg-white/10"
          >
            <UserAvatar userId={userId} name={name} photoUrl={photoUrl} size="sm" />
          </Link>
          <button
            type="button"
            onClick={onLogout}
            title={t("logout")}
            aria-label={t("logout")}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
        <Link
          to={profileTo}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-0.5 transition-colors hover:bg-white/5"
        >
          <UserAvatar userId={userId} name={name} photoUrl={photoUrl} size="sm" />
          <div className="min-w-0 text-start">
            <p className="truncate text-sm font-bold text-white">{name}</p>
            <p className="truncate text-xs font-medium text-slate-400">{roleLabel}</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          title={t("logout")}
          aria-label={t("logout")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
