import React, { useRef, useState } from "react";
import { Camera, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "./UserAvatar";
import { compressProfileImage, validateProfileImageFile } from "../lib/profileImage";
import {
  canStaffEditStudentPhoto,
  invalidateUserPhotoQueries,
  persistUserPhoto,
} from "../lib/persistUserPhoto";
import { useAuthStore } from "../store/authStore";
import { cn } from "../lib/cn";

type Size = "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  md: "!w-16 !h-16",
  lg: "!w-24 !h-24",
  xl: "!w-32 !h-32",
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
  className,
  onPhotoChange,
  onError,
  onSuccess,
}: StudentPhotoEditorProps) {
  const { t } = useTranslation("pages");
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditProp ?? canStaffEditStudentPhoto(role);

  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayPhoto = preview ?? photoUrl ?? null;

  const notifyError = (message: string) => {
    onError?.(message);
  };

  const notifySuccess = (message: string) => {
    onSuccess?.(message);
  };

  const savePhoto = async (next: string | null) => {
    setBusy(true);
    try {
      const saved = await persistUserPhoto(userId, next);
      invalidateUserPhotoQueries(queryClient);
      setPreview(null);
      onPhotoChange?.(saved);
      notifySuccess(
        saved ? t("studentPhoto.updated") : t("studentPhoto.removed")
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("studentPhoto.updateFailed");
      notifyError(message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processFile = async (file: File) => {
    const validation = validateProfileImageFile(file);
    if (validation) {
      notifyError(validation);
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressProfileImage(file);
      setPreview(dataUrl);
      await savePhoto(dataUrl);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("studentPhoto.processFailed");
      notifyError(message);
      setBusy(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit || busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const isDark = variant === "dark";

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "relative rounded-[28px]",
          canEdit && dragOver
            ? isDark
              ? "ring-4 ring-indigo-400 ring-offset-2 ring-offset-slate-900"
              : "ring-4 ring-indigo-400 ring-offset-2 ring-offset-white"
            : ""
        )}
        onDragOver={
          canEdit
            ? (e) => {
                e.preventDefault();
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
              "rounded-[28px] object-cover border shadow-lg",
              SIZE_CLASS[size],
              isDark ? "border-white/10" : "border-slate-200"
            )}
          />
        ) : (
          <UserAvatar
            userId={userId}
            name={name}
            photoUrl={null}
            size={size === "md" ? "lg" : size === "lg" ? "xl" : "xl"}
            rounded="3xl"
            preferSessionPhoto={false}
            className={cn(SIZE_CLASS[size])}
          />
        )}

        {canEdit ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "absolute -bottom-1.5 -right-1.5 p-2 rounded-xl text-white shadow-lg border transition-colors disabled:opacity-60",
                isDark
                  ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-400/30"
                  : "bg-indigo-600 hover:bg-indigo-700 border-indigo-500/20"
              )}
              title={t("studentPhoto.change")}
            >
              {busy ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            {displayPhoto ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void savePhoto(null)}
                className={cn(
                  "absolute -bottom-1.5 -left-1.5 p-2 rounded-xl shadow-lg border transition-colors disabled:opacity-60",
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    : "bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200"
                )}
                title={t("studentPhoto.remove")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {canEdit ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
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
    </div>
  );
}
