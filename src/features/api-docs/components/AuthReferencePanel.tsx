import React, { useState } from "react";
import { Check, Copy, Globe, Key, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SMS_SHADOW_SURFACE } from "../../../components/ui";
import { cn } from "../../../lib/cn";

type Props = {
  schoolId: string;
  apiAccess: boolean;
};

export function AuthReferencePanel({ schoolId, apiAccess }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const tenantPrefix = schoolId ? `/api/schools/${schoolId}` : "/api/schools/:schoolId";

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const shell = cn("rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white", SMS_SHADOW_SURFACE);

  return (
    <section className={cn(shell, "p-4 sm:p-6 space-y-5")}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          {t("apiDocs.authPanel.eyebrow")}
        </p>
        <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 mt-1">
          {t("apiDocs.authPanel.title")}
        </h2>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t("apiDocs.authPanel.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-extrabold text-slate-900">{t("apiDocs.baseUrl")}</p>
          </div>
          <code className="block text-xs font-mono text-slate-700 break-all">{baseUrl}</code>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t("apiDocs.authPanel.tenantPrefix")}{" "}
            <code className="font-mono text-slate-700">{tenantPrefix}</code>
          </p>
          <button
            type="button"
            onClick={() => void copyText(`${baseUrl}${tenantPrefix}`, "base")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            {copied === "base" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {t("apiDocs.copyExample")}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-extrabold text-slate-900">{t("apiDocs.authTitle")}</p>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <li>{t("apiDocs.authApiKey")}</li>
            <li>{t("apiDocs.authStaff")}</li>
          </ul>
          {!apiAccess ? (
            <p className="text-xs text-amber-800 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
              {t("apiDocs.apiAccessRequired")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          <p className="text-sm font-extrabold text-slate-900">{t("apiDocs.authPanel.conventionsTitle")}</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
          <li className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">{t("apiDocs.authPanel.pagination")}</li>
          <li className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">{t("apiDocs.authPanel.readOnly")}</li>
          <li className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">{t("apiDocs.authPanel.json")}</li>
          <li className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">{t("apiDocs.authPanel.scoping")}</li>
        </ul>
        <p className="text-xs text-slate-500 pt-1">{t("apiDocs.readOnlyNote")}</p>
      </div>
    </section>
  );
}
