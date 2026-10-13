/** Pure helpers for admission file uploads (no AWS import). */

const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function assertAllowedMime(mimeType: string) {
  if (!ALLOWED.includes(mimeType)) {
    const err: any = new Error(`MIME type not allowed: ${mimeType}`);
    err.status = 400;
    err.code = "INVALID_MIME";
    throw err;
  }
}

export function storageConfigured(): boolean {
  return Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}
