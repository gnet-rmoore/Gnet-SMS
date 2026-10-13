import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertAllowedMime } from "./storageMime";

export { normalizeMime, assertAllowedMime } from "./storageMime";

const BUCKET = process.env.S3_BUCKET || "sms-classroom";
const REGION = process.env.S3_REGION || "us-east-1";
const ENDPOINT = process.env.S3_ENDPOINT;
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
function getInternalClient(): S3Client | null {
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

/**
 * Client whose endpoint matches what the browser will call (S3_PUBLIC_URL).
 * Used only for signing — no network hop required. Signing with the internal
 * host (minio:9000) makes browser PUTs fail DNS / Host signature checks.
 */
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
  return Boolean(getInternalClient());
}

async function ensureBucket(s3: S3Client) {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    } catch (err: any) {
      console.warn("[classroom-storage] createBucket:", err.message);
    }
  }
  bucketReady = true;
}

export type ClassroomPresignResult = {
  uploadUrl: string;
  fileUrl: string;
  storageKey: string;
  expiresIn: number;
};

export async function createClassroomUploadUrl(opts: {
  schoolId: string;
  classroomId: string;
  fileName: string;
  mimeType: string;
}): Promise<ClassroomPresignResult> {
  const mimeType = assertAllowedMime(opts.mimeType, opts.fileName);
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storageKey = `classroom/${opts.schoolId}/${opts.classroomId}/${Date.now()}-${safeName}`;
  const expiresIn = 900;
  const s3 = getInternalClient();

  if (!s3) {
    return {
      uploadUrl: "",
      fileUrl: `local://${storageKey}`,
      storageKey,
      expiresIn,
    };
  }

  await ensureBucket(s3);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: mimeType,
  });

  const signingClient = getBrowserSigningClient() || s3;
  const uploadUrl = await getSignedUrl(signingClient, command, { expiresIn });
  const fileUrl = PUBLIC_BASE
    ? `${PUBLIC_BASE}/${BUCKET}/${storageKey}`
    : `s3://${BUCKET}/${storageKey}`;

  return { uploadUrl, fileUrl, storageKey, expiresIn };
}
