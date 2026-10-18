import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Link2,
  QrCode,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { registrarApi, type AdmissionPolicyPayload } from "../api";

type Props = {
  onMessage?: (msg: string, kind?: "success" | "error") => void;
};

const BACKGROUND_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024;

export function OnlineRegistrationCard({ onMessage }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const school = useAuthStore((s) => s.school);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [policy, setPolicy] = useState<AdmissionPolicyPayload>({
    publicApplyEnabled: true,
    returningApplyEnabled: true,
    requireEntranceFee: false,
    requiredDocTypes: [],
    requireClassroomOnEnroll: false,
    entranceFeeAmount: 0,
    applyBackgroundUrl: "",
  });

  const publicUrl =
    typeof window !== "undefined" && school?.slug
      ? `${window.location.origin}/apply/${school.slug}`
      : school?.slug
        ? `/apply/${school.slug}`
        : "";

  const backgroundUrl = String(policy.applyBackgroundUrl || "").trim();

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

  // QR code for the public registration URL (generated client-side, downloadable PNG).
  useEffect(() => {
    let cancelled = false;
    if (!publicUrl) {
      setQrDataUrl("");
      return;
    }
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(publicUrl, {
          width: 720,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (e: any) {
        if (!cancelled) {
          setQrDataUrl("");
          onMessage?.(e?.message || t("admissions.onlineRegistration.qr.generateFailed"), "error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicUrl]);

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

  const handleBackgroundFile = async (file: File | undefined | null) => {
    if (!file || !school?.id) return;
    if (!BACKGROUND_MIME_TYPES.includes(file.type)) {
      onMessage?.(t("admissions.onlineRegistration.background.badType"), "error");
      return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      onMessage?.(t("admissions.onlineRegistration.background.tooLarge"), "error");
      return;
    }
    setUploadingBackground(true);
    try {
      const presign = await registrarApi.presignAdmissionBackground(school.id, {
        fileName: file.name,
        mimeType: file.type,
      });
      if (!presign?.uploadUrl || !presign?.fileUrl) {
        throw new Error(t("admissions.onlineRegistration.background.storageUnavailable"));
      }
      // Direct-to-storage upload (external signed URL — raw fetch, no auth header).
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(t("admissions.onlineRegistration.background.uploadFailed"));
      await savePatch({ applyBackgroundUrl: presign.fileUrl });
    } catch (e: any) {
      onMessage?.(e?.message || t("admissions.onlineRegistration.background.uploadFailed"), "error");
    } finally {
      setUploadingBackground(false);
    }
  };

  const removeBackground = async () => {
    if (!backgroundUrl || saving) return;
    await savePatch({ applyBackgroundUrl: "" });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    try {
      const anchor = document.createElement("a");
      anchor.href = qrDataUrl;
      anchor.download = `${school?.slug || "school"}-registration-qr.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      onMessage?.(t("admissions.onlineRegistration.qr.downloaded"));
    } catch {
      onMessage?.(t("admissions.onlineRegistration.qr.generateFailed"), "error");
    }
  };

  const bgLabel = t(
    backgroundUrl
      ? "admissions.onlineRegistration.background.replace"
      : "admissions.onlineRegistration.background.choose"
  );

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900">
                    {t("admissions.onlineRegistration.background.title")}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {t("admissions.onlineRegistration.background.hint", { slug: school?.slug || "…" })}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                {backgroundUrl ? (
                  <img
                    src={backgroundUrl}
                    alt=""
                    className="h-36 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <p className="text-xs font-semibold text-slate-500">
                      {t("admissions.onlineRegistration.background.default")}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold ${
                    uploadingBackground || saving ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {uploadingBackground
                    ? t("admissions.onlineRegistration.background.uploading")
                    : bgLabel}
                  <input
                    type="file"
                    accept={BACKGROUND_MIME_TYPES.join(",")}
                    className="sr-only"
                    disabled={uploadingBackground || saving}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      void handleBackgroundFile(file);
                    }}
                  />
                </label>
                {backgroundUrl ? (
                  <button
                    type="button"
                    onClick={() => void removeBackground()}
                    disabled={saving || uploadingBackground}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("common:remove")}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900">
                    {t("admissions.onlineRegistration.qr.title")}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {t("admissions.onlineRegistration.qr.hint")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-2">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt={t("admissions.onlineRegistration.qr.title")} className="h-28 w-28" />
                  ) : (
                    <div className="h-28 w-28 animate-pulse rounded bg-slate-100" />
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-bold text-slate-600 break-all font-mono">{publicUrl}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {t("admissions.onlineRegistration.qr.scanHint")}
                  </p>
                  <button
                    type="button"
                    onClick={downloadQr}
                    disabled={!qrDataUrl || !policy.publicApplyEnabled}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {t("admissions.onlineRegistration.qr.download")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
