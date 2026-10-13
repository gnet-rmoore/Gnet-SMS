import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { QuickActionDef } from "../registry";
import { hasCapability, navCapabilityKey } from "../../../lib/capabilities";

export type QuickActionRowProps = {
  slug: string | undefined;
  actions: QuickActionDef[];
  capabilities: string[] | null | undefined;
};

/** Role quick actions filtered by session capabilities (same rules as sidebar). */
export function QuickActionRow({ slug, actions, capabilities }: QuickActionRowProps) {
  const { t } = useTranslation("pages");
  const navigate = useNavigate();

  const visible = actions.filter((a) => {
    if (!Array.isArray(capabilities)) return true;
    return hasCapability(capabilities, navCapabilityKey(a.path));
  });

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((action, i) => (
        <button
          key={`${action.path}-${action.labelKey}`}
          type="button"
          onClick={() => navigate(`/${slug}/${action.path}`)}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            i === visible.length - 1
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {t(action.labelKey)}
        </button>
      ))}
    </div>
  );
}
