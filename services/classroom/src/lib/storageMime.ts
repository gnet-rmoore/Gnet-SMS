/** Shared MIME helpers for classroom uploads (no AWS imports). */

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Normalize common browser MIME aliases before allow-list check. */
export function normalizeMime(mimeType: string, fileName?: string): string {
  let mime = (mimeType || "").trim().toLowerCase();
  if (mime === "image/jpg") mime = "image/jpeg";
  if (!mime || mime === "application/octet-stream") {
    const ext = (fileName || "").split(".").pop()?.toLowerCase();
    if (ext && EXT_MIME[ext]) mime = EXT_MIME[ext];
  }
  return mime || "application/octet-stream";
}

export function assertAllowedMime(mimeType: string, fileName?: string) {
  const mime = normalizeMime(mimeType, fileName);
  if (!ALLOWED_MIME.includes(mime)) {
    const err: any = new Error(`MIME type not allowed: ${mime}`);
    err.status = 400;
    throw err;
  }
  return mime;
}
