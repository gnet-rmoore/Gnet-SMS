import React from "react";
import { getOfficialSignatureUrl } from "../../../lib/userSignature";

/** Shared gradesheet signature column. */
export function GradeSheetSig({
  role,
  name,
  signatureUrl,
}: {
  role: string;
  name?: string | null;
  signatureUrl?: string | null;
}) {
  const url = getOfficialSignatureUrl({ signatureUrl });
  return (
    <div className="sig-line">
      <div className="sig-image-slot">
        {url ? <img src={url} alt="" className="sig-image" /> : null}
      </div>
      {name?.trim() ? <div className="sig-name">{name.trim()}</div> : null}
      <div className="role">{role}</div>
    </div>
  );
}
