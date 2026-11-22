import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";
import { UserAvatar } from "../../../components/UserAvatar";
import {
  compressProfileImage,
  profileImageErrorCodeFromMessage,
  profileImageValidationCode,
} from "../../../lib/profileImage";
import { cn } from "../../../lib/cn";

export type AdmissionApplicantPhotoProps = {
  studentName: string;
  linkedUserId?: string | null;
  linkedPhotoUrl?: string | null;
  pendingPhotoUrl?: string | null;
  onPendingPhotoChange: (photoUrl: string | null) => void;
  onLinkedPhotoChange?: (photoUrl: string | null) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  presentation?: "compact" | "stacked";
  size?: "lg" | "xl";
  confirmRemoval?: boolean;
};

const SIZE_CLASS = {
  lg: "!h-24 !w-24",
  xl: "!h-32 !w-32",
} as const;

function PendingApplicantPhoto({
  studentName,
  pendingPhotoUrl,
  onPendingPhotoChange,
  onError,
  onSuccess,
  presentation = "compact",
  size = "lg",
}: Omit<AdmissionApplicantPhotoProps, "linkedUserId" | "linkedPhotoUrl" | "onLinkedPhotoChange" | "confirmRemoval">) {
  const { t } = useTranslation(["pages", "common"]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingPhotoUrl) setPreview(null);
  }, [pendingPhotoUrl]);

  const displayPhoto = preview ?? pendingPhotoUrl ?? null;
  const stacked = presentation === "stacked";

  const processFile = async (file: File) => {
    const validationCode = profileImageValidationCode(file);
    if (validationCode) {
      const message = t(`studentPhoto.${validationCode}`);
      setError(message);
      onError?.(message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await compressProfileImage(file);
      setPreview(dataUrl);
      onPendingPhotoChange(dataUrl);
      onSuccess?.(t("admissions.review.profilePhotoPendingSaved"));
    } catch (err: unknown) {
      const code = err instanceof Error ? profileImageErrorCodeFromMessage(err.message) : null;
      const message = code ? t(`studentPhoto.${code}`) : t("studentPhoto.processFailed");
      setError(message);
      onError?.(message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const removePhoto = () => {
    setPreview(null);
    setError(null);
    onPendingPhotoChange(null);
    onSuccess?.(t("studentPhoto.removed"));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewNode = (
    <div
      className={cn(
        "relative shrink-0 rounded-[32px] transition",
        dragOver && "ring-4 ring-indigo-400 ring-offset-2 ring-offset-white"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {displayPhoto ? (
        <img
          src={displayPhoto}
          alt={studentName || t("studentPhoto.alt")}
          referrerPolicy="no-referrer"
          className={cn("rounded-[32px] border border-slate-200 object-cover shadow-lg", SIZE_CLASS[size])}
        />
      ) : (
        <UserAvatar
          name={studentName}
          photoUrl={null}
          size="xl"
          rounded="3xl"
          preferSessionPhoto={false}
          className={cn(SIZE_CLASS[size], "text-3xl")}
        />
      )}
      {busy ? (
        <div className="absolute inset-0 grid place-items-center rounded-[32px] bg-slate-950/45 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : null}
    </div>
  );

  const actions = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50"
      >
        <ImagePlus className="h-4 w-4" />
        {displayPhoto ? t("studentPhoto.change") : t("studentPhoto.upload")}
      </button>
      {displayPhoto ? (
        <button
          type="button"
          disabled={busy}
          onClick={removePhoto}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {t("studentPhoto.remove")}
        </button>
      ) : null}
    </div>
  );

  const hint = (
    <div className="max-w-[20rem] space-y-1 text-center">
      <p className="text-xs font-medium leading-relaxed text-slate-500">
        {t("admissions.review.profilePhotoPendingHint")}
      </p>
      <p className="text-[11px] font-medium leading-relaxed text-slate-400">
        {t("studentPhoto.requirements")}
      </p>
    </div>
  );

  if (stacked) {
    return (
      <div className="flex flex-col items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        {previewNode}
        {actions}
        {hint}
        {error ? (
          <p role="alert" className="text-center text-xs font-semibold text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="relative">
        {previewNode}
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-1.5 -right-1.5 grid h-10 w-10 place-items-center rounded-xl border border-indigo-500/20 bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-60"
          title={t("studentPhoto.change")}
          aria-label={t("studentPhoto.change")}
        >
          <UploadCloud className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3">{actions}</div>
      <div className="mt-2">{hint}</div>
      {error ? (
        <p role="alert" className="mt-1 text-center text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdmissionApplicantPhoto({
  studentName,
  linkedUserId,
  linkedPhotoUrl,
  pendingPhotoUrl,
  onPendingPhotoChange,
  onLinkedPhotoChange,
  onError,
  onSuccess,
  presentation = "compact",
  size = "lg",
  confirmRemoval = false,
}: AdmissionApplicantPhotoProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <div className="space-y-2">
      {linkedUserId ? (
        <>
          <p className="text-center text-xs font-semibold text-slate-500">
            {t("studentPhoto.updatesExisting")}
          </p>
          <StudentPhotoEditor
            userId={linkedUserId}
            name={studentName}
            photoUrl={linkedPhotoUrl}
            size={size}
            presentation={presentation === "stacked" ? "stacked" : "overlay"}
            confirmRemoval={confirmRemoval}
            onPhotoChange={onLinkedPhotoChange}
            onError={onError}
            onSuccess={onSuccess}
          />
        </>
      ) : (
        <PendingApplicantPhoto
          studentName={studentName}
          pendingPhotoUrl={pendingPhotoUrl}
          onPendingPhotoChange={onPendingPhotoChange}
          onError={onError}
          onSuccess={onSuccess}
          presentation={presentation}
          size={size}
        />
      )}
    </div>
  );
}
