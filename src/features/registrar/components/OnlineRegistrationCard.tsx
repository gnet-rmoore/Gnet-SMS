import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink, Globe, Link2, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { registrarApi, type AdmissionPolicyPayload } from "../api";

type Props = {
  onMessage?: (msg: string, kind?: "success" | "error") => void;
};

export function OnlineRegistrationCard({ onMessage }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const school = useAuthStore((s) => s.school);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [policy, setPolicy] = useState<AdmissionPolicyPayload>({
    publicApplyEnabled: true,
    returningApplyEnabled: true,
    requireEntranceFee: false,
    requiredDocTypes: [],
    requireClassroomOnEnroll: false,
    entranceFeeAmount: 0,
  });

  const publicUrl =
    typeof window !== "undefined" && school?.slug
      ? `${window.location.origin}/apply/${school.slug}`
      : school?.slug
        ? `/apply/${school.slug}`
        : "";

  const load = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const row = await registrarApi.getAdmissionPolicy(school.id);
      if (row?.admissionPolicy) setPolicy(row.admissionPolicy);
    } catch (e: any) {
      onMessage?.(e?.message || t("admissions.onlineRegistration.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.id]);

  const savePatch = async (patch: Partial<AdmissionPolicyPayload>) => {
    if (!school?.id) return;
    setSaving(true);
    const previous = policy;
    setPolicy((p) => ({ ...p, ...patch }));
    try {
      const row = await registrarApi.updateAdmissionPolicy(school.id, patch);
      if (row?.admissionPolicy) setPolicy(row.admissionPolicy);
      onMessage?.(t("admissions.onlineRegistration.toast.saved"));
    } catch (e: any) {
      setPolicy(previous);
      onMessage?.(e?.message || t("admissions.onlineRegistration.toast.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      onMessage?.(t("admissions.onlineRegistration.toast.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onMessage?.(t("admissions.onlineRegistration.toast.copyFailed"), "error");
    }
  };

  return (
    <section className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("admissions.onlineRegistration.title")}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1 max-w-xl">
              {t("admissions.onlineRegistration.subtitle")}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={loading || saving}
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          {t("common:refresh")}
        </button>
      </div>

      {loading ? (
        <div className="h-24 rounded-2xl bg-slate-50 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={policy.publicApplyEnabled}
                disabled={saving}
                onChange={(e) => void savePatch({ publicApplyEnabled: e.target.checked })}
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">{t("admissions.onlineRegistration.acceptOnline")}</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {t("admissions.onlineRegistration.acceptOnlineHint", { slug: school?.slug || "…" })}
                </span>
              </span>
            </label>
            <label
              className={`flex items-start gap-3 rounded-2xl border border-slate-100 p-4 ${
                policy.publicApplyEnabled
                  ? "bg-slate-50/60 cursor-pointer"
                  : "bg-slate-50 opacity-60 cursor-not-allowed"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={policy.returningApplyEnabled}
                disabled={saving || !policy.publicApplyEnabled}
                onChange={(e) => void savePatch({ returningApplyEnabled: e.target.checked })}
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  {t("admissions.onlineRegistration.allowReturning")}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {t("admissions.onlineRegistration.allowReturningHint")}
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Link2 className="w-4 h-4" />
              {t("admissions.onlineRegistration.publicUrl")}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={publicUrl}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-800"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  disabled={!policy.publicApplyEnabled}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t("common:copied") : t("admissions.onlineRegistration.copyLink")}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 ${
                    !policy.publicApplyEnabled ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  {t("common:view")}
                </a>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">{t("admissions.onlineRegistration.shareHint")}</p>
          </div>
        </>
      )}
    </section>
  );
}
