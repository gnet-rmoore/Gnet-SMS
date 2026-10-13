/**
 * Signature image helpers — upload compress + canvas export as PNG data URL.
 * Stored on Identity User.signatureUrl (same pattern as photoUrl).
 */

const MAX_W = 600;
const MAX_H = 200;
const MAX_BYTES = 400_000;

export function validateSignatureImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Choose an image file (PNG or JPEG preferred)";
  }
  if (file.size > 5 * 1024 * 1024) {
    return "Signature image must be under 5MB";
  }
  return null;
}

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

/** Fit image into a wide signature box on transparent canvas → PNG data URL. */
export async function compressSignatureImage(file: File): Promise<string> {
  const err = validateSignatureImageFile(file);
  if (err) throw new Error(err);

  const img = await loadImage(file);
  const scale = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = MAX_W;
  canvas.height = MAX_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process signature");

  ctx.clearRect(0, 0, MAX_W, MAX_H);
  const dx = (MAX_W - w) / 2;
  const dy = (MAX_H - h) / 2;
  ctx.drawImage(img, dx, dy, w, h);

  const dataUrl = canvas.toDataURL("image/png");
  if (dataUrl.length > MAX_BYTES * 1.5) {
    throw new Error("Signature image is still too large — try a simpler scan");
  }
  return dataUrl;
}

/** Export a drawing canvas as trimmed PNG data URL (transparent bg). */
export function exportSignatureCanvas(source: HTMLCanvasElement): string | null {
  const ctx = source.getContext("2d");
  if (!ctx) return null;
  const { width, height } = source;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;

  const out = document.createElement("canvas");
  out.width = Math.min(MAX_W, tw);
  out.height = Math.min(MAX_H, th);
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.drawImage(source, minX, minY, tw, th, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
