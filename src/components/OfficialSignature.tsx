import React from "react";
import { getOfficialSignatureUrl } from "../lib/userSignature";

type Props = {
  /** Role / title under the line */
  label: string;
  /** Display name above the title (optional) */
  name?: string | null;
  /** data:image/... URL or null for blank line */
  signatureUrl?: string | null;
  className?: string;
  /** Compact print layouts (report cards) */
  compact?: boolean;
};

/**
 * Official signature block for print documents.
 * Shows the image when present; otherwise a blank line (never invents a signature).
 */
export function OfficialSignature({
  label,
  name,
  signatureUrl,
  className = "",
  compact = false,
}: Props) {
  const url = getOfficialSignatureUrl({ signatureUrl });
  const imgH = compact ? "h-10" : "h-14";

  return (
    <div className={`text-center ${className}`}>
      <div
        className={`flex flex-col items-center justify-end ${
          compact ? "min-h-[2.75rem]" : "min-h-[3.5rem]"
        }`}
      >
        {url ? (
          <img
            src={url}
            alt=""
            className={`${imgH} max-w-[90%] object-contain object-bottom`}
          />
        ) : (
          <div className={imgH} aria-hidden />
        )}
      </div>
      <div
        className={`border-t border-slate-800 ${
          compact ? "pt-1 mt-0.5" : "pt-1.5 mt-1"
        }`}
      >
        {name?.trim() ? (
          <p
            className={`font-bold text-slate-900 truncate ${
              compact ? "text-[10px]" : "text-xs"
            }`}
          >
            {name.trim()}
          </p>
        ) : null}
        <p
          className={`font-bold uppercase tracking-[0.14em] text-slate-500 ${
            compact ? "text-[9px]" : "text-[10px]"
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
