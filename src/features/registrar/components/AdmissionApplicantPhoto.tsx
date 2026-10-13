import React, { useRef, useState } from "react";
import { Camera, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";
import { UserAvatar } from "../../../components/UserAvatar";
import { compressProfileImage, validateProfileImageFile } from "../../../lib/profileImage";
import { cn } from "../../../lib/cn";

export type AdmissionApplicantPhotoProps = {
  studentName: string;
  linkedUserId?: string | null;
  linkedPhotoUrl?: string | null;
  pendingPhotoUrl?: string | null;
  onPendingPhotoChange: (photoUrl: string | null) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
};

function PendingApplicantPhoto({
  studentName,
  pendingPhotoUrl,
  onPendingPhotoChange,
  onError,
  onSuccess,
}: Omit<AdmissionApplicantPhotoProps, "linkedUserId" | "linkedPhotoUrl">) {
  const { t } = useTranslation("pages");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const displayPhoto = preview ?? pendingPhotoUrl ?? null;

  const processFile = async (file: File) => {
    const validation = validateProfileImageFile(file);
    if (validation) {
      onError?.(validation);
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressProfileImage(file);
      setPreview(dataUrl);
      onPendingPhotoChange(dataUrl);
      onSuccess?.(t("admissions.review.profilePhotoPendingSaved"));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("studentPhoto.processFailed");
      onError?.(message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onPendingPhotoChange(null);
    onSuccess?.(t("studentPhoto.removed"));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center sm:items-start">
      <div className="relative shrink-0">
        {displayPhoto ? (
          <img
            src={displayPhoto}
            alt={studentName}
            referrerPolicy="no-referrer"
            className="!w-24 !h-24 rounded-[28px] object-cover border border-slate-200 shadow-lg"
          />
        ) : (
          <UserAvatar
            name={studentName}
            photoUrl={null}
            size="xl"
            rounded="3xl"
            className="!w-24 !h-24"
          />
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl text-white shadow-lg border bg-indigo-600 hover:bg-indigo-700 border-indigo-500/20 transition-colors disabled:opacity-60"
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
            onClick={handleRemove}
            className="absolute -bottom-1.5 -left-1.5 p-2 rounded-xl shadow-lg border bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 transition-colors disabled:opacity-60"
            title={t("studentPhoto.remove")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="mt-2 text-center sm:text-left text-xs font-medium text-slate-500 max-w-[11rem]">
        {t("admissions.review.profilePhotoPendingHint")}
      </p>
    </div>
  );
}

export function AdmissionApplicantPhoto({
  studentName,
  linkedUserId,
  linkedPhotoUrl,
  pendingPhotoUrl,
  onPendingPhotoChange,
  onError,
  onSuccess,
}: AdmissionApplicantPhotoProps) {
  const { t } = useTranslation("pages");

  return (
    <div className={cn("pb-1")}>
      <p className="text-slate-500 text-xs font-bold mb-3">
        {t("admissions.review.profilePhoto")}
      </p>
      {linkedUserId ? (
        <StudentPhotoEditor
          userId={linkedUserId}
          name={studentName}
          photoUrl={linkedPhotoUrl}
          size="lg"
          onError={onError}
          onSuccess={onSuccess}
        />
      ) : (
        <PendingApplicantPhoto
          studentName={studentName}
          pendingPhotoUrl={pendingPhotoUrl}
          onPendingPhotoChange={onPendingPhotoChange}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}
