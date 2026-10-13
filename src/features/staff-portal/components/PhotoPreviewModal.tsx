import React from "react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";

export type PhotoPreviewModalProps = {
  previewPhoto: { url: string; title: string };
  setPreviewPhoto: (photo: { url: string; title: string } | null) => void;
};

/** Presentational extract for captured attendance photo preview. */
export function PhotoPreviewModal({
  previewPhoto,
  setPreviewPhoto,
}: PhotoPreviewModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <FeatureModalShell
      title={previewPhoto.title}
      subtitle={t("staffPortal.attendance.photoSubtitle")}
      onClose={() => setPreviewPhoto(null)}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            {t("common:close")}
          </button>
        </div>
      }
    >
      <div className="p-6 bg-slate-950 flex justify-center">
        <img
          src={previewPhoto.url}
          alt={previewPhoto.title}
          className="rounded-2xl max-w-full border border-slate-800 object-contain"
        />
      </div>
    </FeatureModalShell>
  );
}
