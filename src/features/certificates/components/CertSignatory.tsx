import React from "react";
import type { CertificateSignatory } from "../types";
import { getOfficialSignatureUrl } from "../../../lib/userSignature";

/** Signature column for graduation certificate templates. */
export function CertSignatory({ sig }: { sig: CertificateSignatory }) {
  const url = getOfficialSignatureUrl({ signatureUrl: sig.signatureUrl });
  return (
    <div className="sig">
      <div className="sig-image-slot">
        {url ? <img src={url} alt="" className="sig-image" /> : null}
      </div>
      <div className="sig-line" />
      <div className="sig-name">{sig.name || "\u00a0"}</div>
      <div className="sig-title">{sig.title}</div>
    </div>
  );
}
