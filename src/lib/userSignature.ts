/**
 * Official signature helpers for document generation (PDF / grade sheets / letters).
 * Signature is stored on Identity User.signatureUrl as a PNG/JPEG data URL.
 */

export type SignatureUserRef = {
  signatureUrl?: string | null;
  name?: string | null;
};

/** Returns the data URL if the user has a saved official signature. */
export function getOfficialSignatureUrl(
  user?: SignatureUserRef | null
): string | null {
  const url = user?.signatureUrl?.trim();
  if (!url) return null;
  if (!url.startsWith("data:image/")) return null;
  return url;
}

/** True when a document renderer should show a signature image instead of a blank line. */
export function hasOfficialSignature(user?: SignatureUserRef | null): boolean {
  return Boolean(getOfficialSignatureUrl(user));
}
