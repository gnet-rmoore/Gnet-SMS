import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

const BUCKET = process.env.S3_BUCKET || "sms-admissions";
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

/** Server-side client (Docker DNS: http://minio:9000). */
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

export function storageEnabled(): boolean {
  return Boolean(getClient());
}

async function ensureBucket(s3: S3Client) {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    } catch (err: any) {
      // BucketAlreadyOwnedByYou etc.
      console.warn("[storage] createBucket:", err.message);
    }
  }
  bucketReady = true;
}

export type PresignResult = {
  uploadUrl: string;
  fileUrl: string;
  storageKey: string;
  expiresIn: number;
  scanStatus: "PENDING_SCAN";
};

/**
 * Create a presigned PUT URL for an admission document.
 * When S3 is unset, returns a data-url placeholder workflow (client posts base64 via confirm).
 */
export async function createAdmissionUploadUrl(opts: {
  schoolId: string;
  applicationId: string;
  docType: string;
  fileName: string;
  mimeType: string;
}): Promise<PresignResult> {
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storageKey = `admissions/${opts.schoolId}/${opts.applicationId}/${opts.docType}/${Date.now()}-${safeName}`;
  const expiresIn = 900;
  const s3 = getClient();

  if (!s3) {
    // Dev fallback: client will POST content to confirm endpoint as data URL.
    return {
      uploadUrl: "",
      fileUrl: `local://${storageKey}`,
      storageKey,
      expiresIn,
      scanStatus: "PENDING_SCAN",
    };
  }

  await ensureBucket(s3);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: opts.mimeType || "application/octet-stream",
  });
  const signingClient = getBrowserSigningClient() || s3;
  const uploadUrl = await getSignedUrl(signingClient, command, { expiresIn });
  const fileUrl = PUBLIC_BASE
    ? `${PUBLIC_BASE}/${BUCKET}/${storageKey}`
    : `s3://${BUCKET}/${storageKey}`;

  return { uploadUrl, fileUrl, storageKey, expiresIn, scanStatus: "PENDING_SCAN" };
}

/** Async virus scan — ClamAV when CLAMAV_URL set; dev fallback CLEAN unless fail-closed. */
export async function runVirusScan(storageKey: string): Promise<"CLEAN" | "INFECTED"> {
  if (process.env.VIRUS_SCAN_FORCE_INFECTED === "true") return "INFECTED";

  const clamUrl = process.env.CLAMAV_URL?.trim();
  if (!clamUrl) return "CLEAN";

  const failOpen = process.env.VIRUS_SCAN_FAIL_OPEN !== "false";

  try {
    const res = await fetch(`${clamUrl.replace(/\/$/, "")}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: storageKey }),
    });
    if (!res.ok) {
      console.warn("[storage] ClamAV scan HTTP error:", res.status);
      if (!failOpen) {
        const err: any = new Error("Virus scan unavailable — upload blocked");
        err.status = 503;
        err.code = "SCAN_UNAVAILABLE";
        throw err;
      }
      return "CLEAN";
    }
    const data = (await res.json()) as { status?: string; result?: string };
    const verdict = String(data.status || data.result || "").toUpperCase();
    return verdict === "INFECTED" || verdict === "FOUND" ? "INFECTED" : "CLEAN";
  } catch (err: any) {
    if (err?.code === "SCAN_UNAVAILABLE") throw err;
    console.warn("[storage] ClamAV scan failed:", err?.message || err);
    if (!failOpen) {
      const blocked: any = new Error("Virus scan unavailable — upload blocked");
      blocked.status = 503;
      blocked.code = "SCAN_UNAVAILABLE";
      throw blocked;
    }
    return "CLEAN";
  }
}

/** @deprecated Use runVirusScan */
export async function runVirusScanStub(storageKey: string): Promise<"CLEAN" | "INFECTED"> {
  return runVirusScan(storageKey);
}

export function assertAllowedMime(mimeType: string) {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  if (!allowed.includes(mimeType)) {
    const err: any = new Error(`MIME type not allowed: ${mimeType}`);
    err.status = 400;
    err.code = "INVALID_MIME";
    throw err;
  }
}

export function newObjectId(): string {
  return crypto.randomBytes(8).toString("hex");
}
