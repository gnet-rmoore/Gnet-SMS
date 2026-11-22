import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import {
  compressProfileImage,
  profileImageErrorCodeFromMessage,
  profileImageValidationCode,
} from "../lib/profileImage";
import {
  canStaffEditStudentPhoto,
  invalidateUserPhotoQueries,
  persistUserPhoto,
} from "../lib/persistUserPhoto";
import { useAuthStore } from "../store/authStore";
import { cn } from "../lib/cn";
import { confirmAction } from "../lib/swal";

type Size = "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  md: "!h-16 !w-16",
  lg: "!h-24 !w-24",
  xl: "!h-32 !w-32",
};

export type StudentPhotoEditorProps = {
  userId: string;
  name?: string | null;
  photoUrl?: string | null;
  /** When omitted, derived from signed-in staff role. */
  canEdit?: boolean;
  size?: Size;
  /** Light surfaces vs dark hero headers */
  variant?: "light" | "dark";
  /** Overlay icon buttons or labeled actions below the preview. */
  presentation?: "overlay" | "stacked";
  confirmRemoval?: boolean;
  className?: string;
  onPhotoChange?: (photoUrl: string | null) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
};

export function StudentPhotoEditor({
  userId,
  name,
  photoUrl,
  canEdit: canEditProp,
  size = "lg",
  variant = "light",
  presentation = "overlay",
  confirmRemoval = false,
  className,
  onPhotoChange,
  onError,
  onSuccess,
}: StudentPhotoEditorProps) {
  const { t } = useTranslation(["pages", "common"]);
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditProp ?? canStaffEditStudentPhoto(role);

  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayPhoto = preview ?? photoUrl ?? null;
  const isDark = variant === "dark";
  const stacked = presentation === "stacked";

  const notifyError = (message: string) => {
    setError(message);
    onError?.(message);
  };

  const notifySuccess = (message: string) => {
    setError(null);
    onSuccess?.(message);
  };

  const savePhoto = async (next: string | null) => {
    setBusy(true);
    try {
      const saved = await persistUserPhoto(userId, next);
      invalidateUserPhotoQueries(queryClient);
      setPreview(null);
      onPhotoChange?.(saved);
      notifySuccess(saved ? t("studentPhoto.updated") : t("studentPhoto.removed"));
    } catch (err: unknown) {
      setPreview(null);
      const message =
        err instanceof Error ? err.message : t("studentPhoto.updateFailed");
      notifyError(message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processFile = async (file: File) => {
    const validationCode = profileImageValidationCode(file);
    if (validationCode) {
      notifyError(t(`studentPhoto.${validationCode}`));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await compressProfileImage(file);
      setPreview(dataUrl);
      await savePhoto(dataUrl);
    } catch (err: unknown) {
      const code = err instanceof Error ? profileImageErrorCodeFromMessage(err.message) : null;
      notifyError(code ? t(`studentPhoto.${code}`) : t("studentPhoto.processFailed"));
      setBusy(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (!canEdit || busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleRemove = async () => {
    if (confirmRemoval) {
      const confirmed = await confirmAction({
        title: t("studentPhoto.removeTitle"),
        text: t("studentPhoto.removeText"),
        confirmText: t("common:remove"),
        danger: true,
      });
      if (!confirmed) return;
    }
    await savePhoto(null);
  };

  const input = canEdit ? (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="hidden"
      onChange={handleFileChange}
    />
  ) : null;

  const previewNode = (
    <div
      className={cn(
        "relative rounded-[32px]",
        canEdit && dragOver
          ? isDark
            ? "ring-4 ring-indigo-400 ring-offset-2 ring-offset-slate-900"
            : "ring-4 ring-indigo-400 ring-offset-2 ring-offset-white"
          : ""
      )}
      onDragOver={
        canEdit
          ? (event) => {
              event.preventDefault();
              setDragOver(true);
            }
          : undefined
      }
      onDragLeave={canEdit ? () => setDragOver(false) : undefined}
      onDrop={canEdit ? handleDrop : undefined}
    >
      {displayPhoto ? (
        <img
          src={displayPhoto}
          alt={name || t("studentPhoto.alt")}
          referrerPolicy="no-referrer"
          className={cn(
            "rounded-[32px] object-cover border shadow-lg",
            SIZE_CLASS[size],
            isDark ? "border-white/10" : "border-slate-200"
          )}
        />
      ) : (
        <UserAvatar
          userId={userId}
          name={name}
          photoUrl={null}
          size={size === "md" ? "lg" : "xl"}
          rounded="3xl"
          preferSessionPhoto={false}
          className={cn(SIZE_CLASS[size])}
        />
      )}
      {busy ? (
        <div className="absolute inset-0 grid place-items-center rounded-[32px] bg-slate-950/45 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : null}
    </div>
  );

  if (stacked) {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        {previewNode}
        {canEdit ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50"
              >
                <ImagePlus className="h-4 w-4" />
                {t("studentPhoto.upload")}
              </button>
              {displayPhoto ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRemove()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("studentPhoto.remove")}
                </button>
              ) : null}
            </div>
            {input}
            <p
              className={cn(
                "max-w-[18rem] text-center text-xs font-medium leading-relaxed",
                isDark ? "text-slate-400" : "text-slate-500"
              )}
            >
              {t("studentPhoto.hint")}
            </p>
          </>
        ) : null}
        {error ? (
          <p role="alert" className="text-center text-xs font-semibold text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      {previewNode}
      {canEdit ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "absolute -bottom-1.5 -right-1.5 grid h-10 w-10 place-items-center rounded-xl text-white shadow-lg border transition-colors disabled:opacity-60",
              isDark
                ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-400/30"
                : "bg-indigo-600 hover:bg-indigo-700 border-indigo-500/20"
            )}
            title={t("studentPhoto.change")}
            aria-label={t("studentPhoto.change")}
          >
            <Camera className="h-4 w-4" />
          </button>
          {displayPhoto ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRemove()}
              className={cn(
                "absolute -bottom-1.5 -left-1.5 grid h-10 w-10 place-items-center rounded-xl shadow-lg border transition-colors disabled:opacity-60",
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  : "bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200"
              )}
              title={t("studentPhoto.remove")}
              aria-label={t("studentPhoto.remove")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          {input}
          <p
            className={cn(
              "mt-2 text-center text-xs font-medium max-w-[8.5rem]",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {t("studentPhoto.hint")}
          </p>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-center text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
