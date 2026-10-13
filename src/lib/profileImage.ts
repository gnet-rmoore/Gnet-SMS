/**
 * Client-side profile photo helpers — resize/compress before storing as data URL.
 * Keeps Identity payloads and auth persist storage reasonable.
 */

const MAX_EDGE = 512;
const JPEG_QUALITY = 0.85;
const MAX_BYTES = 900_000; // ~900KB after base64

export function validateProfileImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Choose an image file (JPEG, PNG, or WebP)";
  }
  if (file.size > 8 * 1024 * 1024) {
    return "Image must be under 8MB";
  }
  return null;
}

/** Load a File into an HTMLImageElement. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/**
 * Center-crop to square and resize to MAX_EDGE, export as JPEG data URL.
 */
export async function compressProfileImage(file: File): Promise<string> {
  const err = validateProfileImageFile(file);
  if (err) throw new Error(err);

  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = MAX_EDGE;
  canvas.height = MAX_EDGE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, MAX_EDGE, MAX_EDGE);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_EDGE, MAX_EDGE);

  let quality = JPEG_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_BYTES && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_BYTES * 1.2) {
    throw new Error("Image is still too large after compression — try another photo");
  }
  return dataUrl;
}

export function initialsFromName(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}
