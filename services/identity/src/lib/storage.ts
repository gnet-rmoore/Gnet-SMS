import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET || "sms-school-assets";
const REGION = process.env.S3_REGION || "us-east-1";
const ENDPOINT = process.env.S3_ENDPOINT; // e.g. http://minio:9000
const PUBLIC_BASE = (process.env.S3_PUBLIC_URL || ENDPOINT || "").replace(/\/$/, "");
const FORCE_PATH = process.env.S3_FORCE_PATH_STYLE !== "false";

let internalClient: S3Client | null = null;
let bucketReady = false;

function credentials() {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey };
}

function getClient(): S3Client | null {
  const creds = credentials();
  if (!creds) return null;
  if (!internalClient) {
    internalClient = new S3Client({
      region: REGION,
      endpoint: ENDPOINT || undefined,
      forcePathStyle: FORCE_PATH,
      credentials: creds,
    });
  }
  return internalClient;
}

/** Sign for the browser-reachable host (S3_PUBLIC_URL), not internal minio DNS. */
function getBrowserSigningClient(): S3Client | null {
  const creds = credentials();
  if (!creds || !PUBLIC_BASE) return null;
  return new S3Client({
    region: REGION,
    endpoint: PUBLIC_BASE,
    forcePathStyle: FORCE_PATH,
    credentials: creds,
  });
}

async function ensureBucket(s3: S3Client) {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    } catch (err: any) {
      console.warn("[storage] createBucket:", err?.message || err);
    }
  }
  bucketReady = true;
}

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function normalizeImageMime(value: string | undefined) {
  const mime = String(value || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.includes(mime)) {
    const err: any = new Error(`Image type not allowed: ${mime}`);
    err.status = 400;
    err.code = "INVALID_MIME";
    throw err;
  }
  return mime;
}

function backgroundStorageKey(schoolId: string, fileName: string, mime: string) {
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "gif";
  const safeName = String(fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || `background.${ext}`;
  return `admissions/${schoolId}/background/${Date.now()}-${safeName}`;
}

function storageUnavailable() {
  const err: any = new Error("File storage is not configured");
  err.status = 503;
  err.code = "STORAGE_UNAVAILABLE";
  return err;
}

/** Presigned PUT for a school-admission background image. */
export async function createBackgroundUploadUrl(opts: {
  schoolId: string;
  fileName: string;
  mimeType: string;
}): Promise<{ uploadUrl: string; fileUrl: string }> {
  const mime = normalizeImageMime(opts.mimeType);
  const storageKey = backgroundStorageKey(opts.schoolId, opts.fileName, mime);
  const expiresIn = 900;

  const s3 = getClient();
  if (!s3) {
    return { uploadUrl: "", fileUrl: `local://${storageKey}` };
  }

  await ensureBucket(s3);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: mime,
  });
  const signingClient = getBrowserSigningClient() || s3;
  const uploadUrl = await getSignedUrl(signingClient, command, { expiresIn });
  const fileUrl = PUBLIC_BASE ? `${PUBLIC_BASE}/${BUCKET}/${storageKey}` : `s3://${BUCKET}/${storageKey}`;

  return { uploadUrl, fileUrl };
}

/** Server-side upload used when the browser cannot reach the storage host. */
export async function putBackgroundObject(opts: {
  schoolId: string;
  fileName: string;
  mimeType: string;
  body: Buffer;
}): Promise<{ storageKey: string }> {
  const mime = normalizeImageMime(opts.mimeType);
  const s3 = getClient();
  if (!s3) throw storageUnavailable();

  await ensureBucket(s3);
  const storageKey = backgroundStorageKey(opts.schoolId, opts.fileName, mime);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      ContentType: mime,
      Body: opts.body,
    })
  );
  return { storageKey };
}

export async function getBackgroundObject(storageKey: string): Promise<{
  body: Buffer;
  contentType: string;
}> {
  const s3 = getClient();
  if (!s3) throw storageUnavailable();

  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }));
    if (!result.Body) {
      const err: any = new Error("Background image not found");
      err.status = 404;
      throw err;
    }
    const bytes = await result.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: result.ContentType || "application/octet-stream",
    };
  } catch (err: any) {
    if (err?.status) throw err;
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      const notFound: any = new Error("Background image not found");
      notFound.status = 404;
      throw notFound;
    }
    throw err;
  }
}
