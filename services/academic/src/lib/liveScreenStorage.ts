/**
 * Object storage for consent-gated proctor screen frames (Phase 3).
 * Mirrors examPaperStorage.ts: reuses the same S3 bucket but under a
 * `proctor-frames/` key prefix, and degrades to a no-op when S3 is unset.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { proctorFrameStorageKey } from "./onlineExamScreen";

const BUCKET = process.env.S3_BUCKET || "sms-exam-papers";
const REGION = process.env.S3_REGION || "us-east-1";
const ENDPOINT = process.env.S3_ENDPOINT;
const FORCE_PATH = process.env.S3_FORCE_PATH_STYLE !== "false";
const FRAME_CONTENT_TYPE = "image/jpeg";

let client: S3Client | null = null;
let bucketReady = false;

function getClient(): S3Client | null {
  if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    return null;
  }
  if (!client) {
    client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT || undefined,
      forcePathStyle: FORCE_PATH,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export function proctorScreenStorageEnabled(): boolean {
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
      console.warn("[proctor-frame-storage] createBucket:", err.message);
    }
  }
  bucketReady = true;
}

export function assertScreenFrameMime(mimeType: string) {
  if (mimeType && mimeType !== FRAME_CONTENT_TYPE) {
    const err: any = new Error("Only JPEG screen frames are accepted");
    err.status = 400;
    throw err;
  }
}

export type ProctorFrameUpload = {
  uploadUrl: string;
  storageKey: string;
  contentType: string;
  expiresIn: number;
};

export async function createProctorFrameUploadUrl(opts: {
  schoolId: string;
  examId: string;
  attemptId: string;
  at?: Date;
  mimeType?: string;
}): Promise<ProctorFrameUpload> {
  assertScreenFrameMime(opts.mimeType || FRAME_CONTENT_TYPE);
  const storageKey = proctorFrameStorageKey({
    schoolId: opts.schoolId,
    examId: opts.examId,
    attemptId: opts.attemptId,
    at: opts.at || new Date(),
    ext: "jpg",
  });
  const expiresIn = 300;
  const s3 = getClient();
  if (!s3) {
    return { uploadUrl: "", storageKey, contentType: FRAME_CONTENT_TYPE, expiresIn };
  }

  await ensureBucket(s3);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: FRAME_CONTENT_TYPE,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { uploadUrl, storageKey, contentType: FRAME_CONTENT_TYPE, expiresIn };
}

export async function createProctorFrameDownloadUrl(
  storageKey: string,
  expiresIn = 300
): Promise<string | null> {
  const s3 = getClient();
  if (!s3 || !storageKey) return null;
  await ensureBucket(s3);
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteProctorFrameObject(storageKey: string): Promise<void> {
  const s3 = getClient();
  if (!s3 || !storageKey) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
  } catch (err: any) {
    console.warn("[proctor-frame-storage] delete:", err.message);
  }
}
