import React, { useRef, useState } from "react";
import { Camera, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "../../../components/UserAvatar";
import { compressProfileImage, validateProfileImageFile } from "../../../lib/profileImage";
import { cn } from "../../../lib/cn";

type Props = {
  name?: string | null;
  photoUrl?: string | null;
  onChange: (photoUrl: string | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export function StaffPhotoField({
  name,
  photoUrl,
  onChange,
  onError,
  disabled = false,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const validation = validateProfileImageFile(file);
    if (validation) {
      onError?.(validation);
      return;
    }
    setBusy(true);
    try {
      onChange(await compressProfileImage(file));
    } catch (err: unknown) {
      onError?.(
        err instanceof Error ? err.message : t("pages:staff.photo.processFailed")
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const interactive = !disabled && !busy;

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "relative shrink-0 rounded-[28px]",
          dragOver ? "ring-4 ring-indigo-400 ring-offset-2 ring-offset-white" : ""
        )}
        onDragOver={(e) => {
          if (!interactive) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name || t("pages:staff.photo.alt")}
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-[28px] object-cover border border-slate-200 shadow-sm"
          />
        ) : (
          <UserAvatar
            userId={name || "new-staff"}
            name={name}
            photoUrl={null}
            size="xl"
            rounded="3xl"
            preferSessionPhoto={false}
            className="!w-20 !h-20"
          />
        )}
        <button
          type="button"
          disabled={!interactive}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1.5 -end-1.5 p-2 rounded-xl text-white shadow-lg border border-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60"
          title={t("pages:staff.photo.change")}
        >
          {busy ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>
        {photoUrl ? (
          <button
            type="button"
            disabled={!interactive}
            onClick={() => onChange(null)}
            className="absolute -bottom-1.5 -start-1.5 p-2 rounded-xl shadow-lg border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-60"
            title={t("pages:staff.photo.remove")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <div className="min-w-0 space-y-1">
        <p className="text-sm font-bold text-slate-900">{t("pages:staff.photo.title")}</p>
        <p className="text-xs text-slate-500 font-medium">{t("pages:staff.photo.hint")}</p>
        <button
          type="button"
          disabled={!interactive}
          onClick={() => inputRef.current?.click()}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
        >
          {photoUrl ? t("pages:staff.photo.change") : t("pages:staff.photo.upload")}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={!interactive}
        onChange={handleFileChange}
      />
    </div>
  );
}
