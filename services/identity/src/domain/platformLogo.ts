const MAX_PLATFORM_LOGO_BYTES = 1024 * 1024;
const PLATFORM_LOGO_DATA_URL =
  /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

export function parsePlatformLogoDataUrl(value: unknown): {
  dataUrl: string;
  mimeType: string;
  bytes: Buffer;
} | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw Object.assign(new Error("Platform logo must be an image file"), { status: 400 });
  }
  const match = PLATFORM_LOGO_DATA_URL.exec(value);
  if (!match) {
    throw Object.assign(
      new Error("Platform logo must be a PNG, JPEG, WebP, or GIF image"),
      { status: 400 }
    );
  }
  const bytes = Buffer.from(match[2], "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PLATFORM_LOGO_BYTES ||
    bytes.toString("base64") !== match[2]
  ) {
    throw Object.assign(new Error("Platform logo must be no larger than 1 MB"), {
      status: 400,
    });
  }
  return { dataUrl: value, mimeType: match[1], bytes };
}
