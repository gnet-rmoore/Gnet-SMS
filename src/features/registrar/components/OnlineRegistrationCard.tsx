import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Link2,
  Plus,
  QrCode,
  RefreshCw,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import {
  registrarApi,
  type AdmissionEntranceSlotPayload,
  type AdmissionPolicyPayload,
} from "../api";

type Props = {
  onMessage?: (msg: string, kind?: "success" | "error") => void;
};

const BACKGROUND_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024;
const WEEKDAYS = [
  { value: 0, short: "Sun" },
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
];

type EntranceDraft = {
  entranceSchedulingEnabled: boolean;
  entranceAvailableFrom: string;
  entranceAvailableTo: string;
  entranceAvailableWeekdays: number[];
  entranceAvailabilityNote: string;
  entranceBookingDeadline: string;
  entranceRescheduleCutoffHours: number;
  entranceSlots: AdmissionEntranceSlotPayload[];
};

const pad = (value: number) => String(value).padStart(2, "0");

function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function draftFromPolicy(policy: AdmissionPolicyPayload): EntranceDraft {
  return {
    entranceSchedulingEnabled: Boolean(policy.entranceSchedulingEnabled),
    entranceAvailableFrom: policy.entranceAvailableFrom || "",
    entranceAvailableTo: policy.entranceAvailableTo || "",
    entranceAvailableWeekdays: Array.isArray(policy.entranceAvailableWeekdays)
      ? policy.entranceAvailableWeekdays
      : [1, 2, 3, 4, 5],
    entranceAvailabilityNote: policy.entranceAvailabilityNote || "",
    entranceBookingDeadline: toDateTimeLocal(policy.entranceBookingDeadline),
    entranceRescheduleCutoffHours: Number(policy.entranceRescheduleCutoffHours ?? 24),
    entranceSlots: Array.isArray(policy.entranceSlots) ? policy.entranceSlots : [],
  };
}

function emptySlot(): AdmissionEntranceSlotPayload {
  return {
    id: globalThis.crypto?.randomUUID?.() || `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startAt: "",
    endAt: "",
    capacity: 10,
    location: "",
    instructions: "",
  };
}

function validateEntranceDraft(draft: EntranceDraft): "" | "RANGE" | "WEEKDAYS" | "SLOT" | "OUTSIDE" | "PAST" {
  if (draft.entranceAvailableFrom && draft.entranceAvailableTo) {
    if (draft.entranceAvailableTo < draft.entranceAvailableFrom) return "RANGE";
  }
  if (draft.entranceAvailableWeekdays.length === 0) return "WEEKDAYS";
  for (const slot of draft.entranceSlots) {
    const start = new Date(slot.startAt);
    const end = new Date(slot.endAt);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end.getTime() <= start.getTime() ||
      !Number.isFinite(Number(slot.capacity)) ||
      Number(slot.capacity) < 1
    ) {
      return "SLOT";
    }
    const date = String(slot.startAt).slice(0, 10);
    if (
      (draft.entranceAvailableFrom && date < draft.entranceAvailableFrom) ||
      (draft.entranceAvailableTo && date > draft.entranceAvailableTo) ||
      !draft.entranceAvailableWeekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay())
    ) {
      return "OUTSIDE";
    }
    if (start.getTime() <= Date.now()) return "PAST";
  }
  return "";
}

export function OnlineRegistrationCard({ onMessage }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const school = useAuthStore((s) => s.school);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const initialPolicy: AdmissionPolicyPayload = {
    publicApplyEnabled: true,
    returningApplyEnabled: true,
    requireEntranceFee: false,
    requiredDocTypes: [],
    requireClassroomOnEnroll: false,
    entranceFeeAmount: 0,
    applyBackgroundUrl: "",
    entranceSchedulingEnabled: false,
    entranceSlots: [],
    entranceBookingDeadline: null,
    entranceRescheduleCutoffHours: 24,
    entranceAvailableFrom: null,
    entranceAvailableTo: null,
    entranceAvailableWeekdays: [1, 2, 3, 4, 5],
    entranceAvailabilityNote: null,
  };
  const [policy, setPolicy] = useState<AdmissionPolicyPayload>(initialPolicy);
  const [entranceDraft, setEntranceDraft] = useState<EntranceDraft>(() => draftFromPolicy(initialPolicy));

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
      if (row?.admissionPolicy) {
        setPolicy(row.admissionPolicy);
        setEntranceDraft(draftFromPolicy(row.admissionPolicy));
      }
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
      if (row?.admissionPolicy) {
        setPolicy(row.admissionPolicy);
        setEntranceDraft(draftFromPolicy(row.admissionPolicy));
      }
      onMessage?.(t("admissions.onlineRegistration.toast.saved"));
    } catch (e: any) {
      setPolicy(previous);
      onMessage?.(e?.message || t("admissions.onlineRegistration.toast.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const saveEntrance = async () => {
    if (saving) return;
    const problem = validateEntranceDraft(entranceDraft);
    if (problem) {
      const messages: Record<Exclude<typeof problem, "">, string> = {
        RANGE: t("admissions.onlineRegistration.entrance.invalidRange", "End date must be on or after start date."),
        WEEKDAYS: t("admissions.onlineRegistration.entrance.invalidWeekdays", "Choose at least one available weekday."),
        SLOT: t("admissions.onlineRegistration.entrance.invalidSlot", "Every slot needs a start, end, and capacity of at least 1."),
        OUTSIDE: t(
          "admissions.onlineRegistration.entrance.outsideRange",
          "A slot falls outside the available date range or chosen weekdays."
        ),
        PAST: t("admissions.onlineRegistration.entrance.pastSlot", "A slot is in the past. Remove or update it."),
      };
      onMessage?.(messages[problem], "error");
      return;
    }
    await savePatch({
      entranceSchedulingEnabled: entranceDraft.entranceSchedulingEnabled,
      entranceAvailableFrom: entranceDraft.entranceAvailableFrom || null,
      entranceAvailableTo: entranceDraft.entranceAvailableTo || null,
      entranceAvailableWeekdays: entranceDraft.entranceAvailableWeekdays,
      entranceAvailabilityNote: entranceDraft.entranceAvailabilityNote.trim() || null,
      entranceBookingDeadline: fromDateTimeLocal(entranceDraft.entranceBookingDeadline) || null,
      entranceRescheduleCutoffHours: Number(entranceDraft.entranceRescheduleCutoffHours) || 0,
      entranceSlots: entranceDraft.entranceSlots.map((slot) => ({
        ...slot,
        startAt: fromDateTimeLocal(slot.startAt) || slot.startAt,
        endAt: fromDateTimeLocal(slot.endAt) || slot.endAt,
        capacity: Number(slot.capacity),
        location: String(slot.location || "").trim(),
        instructions: String(slot.instructions || "").trim(),
      })),
    });
  };

  const toggleWeekday = (value: number) => {
    setEntranceDraft((prev) => {
      const next = prev.entranceAvailableWeekdays.includes(value)
        ? prev.entranceAvailableWeekdays.filter((day) => day !== value)
        : [...prev.entranceAvailableWeekdays, value];
      return { ...prev, entranceAvailableWeekdays: next.sort((a, b) => a - b) };
    });
  };

  const updateSlot = (id: string, patch: Partial<AdmissionEntranceSlotPayload>) => {
    setEntranceDraft((prev) => ({
      ...prev,
      entranceSlots: prev.entranceSlots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)),
    }));
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
      let fileUrl = "";
      try {
        const presign = await registrarApi.presignAdmissionBackground(school.id, {
          fileName: file.name,
          mimeType: file.type,
        });
        if (presign?.uploadUrl && presign?.fileUrl) {
          const put = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (put.ok) fileUrl = presign.fileUrl;
        }
      } catch {
        fileUrl = "";
      }
      if (!fileUrl) {
        const uploaded = await registrarApi.uploadAdmissionBackground(school.id, file);
        if (!uploaded?.fileUrl) {
          throw new Error(t("admissions.onlineRegistration.background.storageUnavailable"));
        }
        fileUrl = uploaded.fileUrl;
      }
      await savePatch({ applyBackgroundUrl: fileUrl });
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

          <section className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {t("admissions.onlineRegistration.entrance.title", "Entrance scheduling")}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {t(
                      "admissions.onlineRegistration.entrance.hint",
                      "Set the date range, allowed weekdays, and time slots families may choose from."
                    )}
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={entranceDraft.entranceSchedulingEnabled}
                  disabled={saving}
                  onChange={(e) =>
                    setEntranceDraft((prev) => ({ ...prev, entranceSchedulingEnabled: e.target.checked }))
                  }
                />
                {t("admissions.onlineRegistration.entrance.enabled", "Enabled")}
              </label>
            </div>

            <div
              className={`space-y-4 ${
                entranceDraft.entranceSchedulingEnabled ? "" : "opacity-60 pointer-events-none"
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-slate-600">
                    {t("admissions.onlineRegistration.entrance.availableFrom", "Available from")}
                  </span>
                  <input
                    type="date"
                    value={entranceDraft.entranceAvailableFrom}
                    disabled={saving}
                    onChange={(e) =>
                      setEntranceDraft((prev) => ({ ...prev, entranceAvailableFrom: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-slate-600">
                    {t("admissions.onlineRegistration.entrance.availableTo", "Available until")}
                  </span>
                  <input
                    type="date"
                    value={entranceDraft.entranceAvailableTo}
                    disabled={saving}
                    onChange={(e) =>
                      setEntranceDraft((prev) => ({ ...prev, entranceAvailableTo: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-slate-600">
                    {t("admissions.onlineRegistration.entrance.bookingDeadline", "Booking deadline")}
                  </span>
                  <input
                    type="datetime-local"
                    value={entranceDraft.entranceBookingDeadline}
                    disabled={saving}
                    onChange={(e) =>
                      setEntranceDraft((prev) => ({ ...prev, entranceBookingDeadline: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-slate-600">
                    {t("admissions.onlineRegistration.entrance.cutoffHours", "Reschedule cutoff (hours)")}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={entranceDraft.entranceRescheduleCutoffHours}
                    disabled={saving}
                    onChange={(e) =>
                      setEntranceDraft((prev) => ({
                        ...prev,
                        entranceRescheduleCutoffHours: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600">
                  {t("admissions.onlineRegistration.entrance.allowedWeekdays", "Allowed weekdays")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const checked = entranceDraft.entranceAvailableWeekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        disabled={saving}
                        onClick={() => toggleWeekday(day.value)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                          checked
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        {t(`admissions.onlineRegistration.entrance.weekday.${day.short}`, day.short)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="block text-xs font-bold text-slate-600">
                  {t("admissions.onlineRegistration.entrance.note", "Message shown to families")}
                </span>
                <textarea
                  rows={2}
                  value={entranceDraft.entranceAvailabilityNote}
                  disabled={saving}
                  placeholder={t(
                    "admissions.onlineRegistration.entrance.notePlaceholder",
                    "Entrance interviews are held Monday–Friday during the dates above."
                  )}
                  onChange={(e) =>
                    setEntranceDraft((prev) => ({ ...prev, entranceAvailabilityNote: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    {t("admissions.onlineRegistration.entrance.slots", "Entrance time slots")}
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setEntranceDraft((prev) => ({ ...prev, entranceSlots: [...prev.entranceSlots, emptySlot()] }))
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("admissions.onlineRegistration.entrance.addSlot", "Add slot")}
                  </button>
                </div>
                {entranceDraft.entranceSlots.length === 0 ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-500">
                    {t(
                      "admissions.onlineRegistration.entrance.noSlots",
                      "No slots yet — add at least one date and time."
                    )}
                  </p>
                ) : null}
                <div className="space-y-3">
                  {entranceDraft.entranceSlots.map((slot, index) => (
                    <div key={slot.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">
                          {t("admissions.onlineRegistration.entrance.slotNumber", "Slot {{n}}", { n: index + 1 })}
                        </p>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            setEntranceDraft((prev) => ({
                              ...prev,
                              entranceSlots: prev.entranceSlots.filter((item) => item.id !== slot.id),
                            }))
                          }
                          className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("admissions.onlineRegistration.entrance.removeSlot", "Remove")}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <input
                          type="datetime-local"
                          value={toDateTimeLocal(slot.startAt)}
                          disabled={saving}
                          onChange={(e) => updateSlot(slot.id, { startAt: fromDateTimeLocal(e.target.value) })}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                          aria-label={t("admissions.onlineRegistration.entrance.start", "Start")}
                        />
                        <input
                          type="datetime-local"
                          value={toDateTimeLocal(slot.endAt)}
                          disabled={saving}
                          onChange={(e) => updateSlot(slot.id, { endAt: fromDateTimeLocal(e.target.value) })}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                          aria-label={t("admissions.onlineRegistration.entrance.end", "End")}
                        />
                        <input
                          type="number"
                          min="1"
                          value={slot.capacity}
                          disabled={saving}
                          onChange={(e) => updateSlot(slot.id, { capacity: Number(e.target.value) })}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                          aria-label={t("admissions.onlineRegistration.entrance.capacity", "Capacity")}
                        />
                        <input
                          type="text"
                          value={slot.location || ""}
                          disabled={saving}
                          onChange={(e) => updateSlot(slot.id, { location: e.target.value })}
                          placeholder={t("admissions.onlineRegistration.entrance.location", "Location")}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                        />
                      </div>
                      <input
                        type="text"
                        value={slot.instructions || ""}
                        disabled={saving}
                        onChange={(e) => updateSlot(slot.id, { instructions: e.target.value })}
                        placeholder={t("admissions.onlineRegistration.entrance.instructions", "Instructions (optional)")}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEntrance()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Settings2 className="w-4 h-4" />
                {saving
                  ? t("admissions.onlineRegistration.entrance.saving", "Saving…")
                  : t("admissions.onlineRegistration.entrance.save", "Save entrance settings")}
              </button>
            </div>
          </section>

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
