/**
 * MinIO/S3 helper for receipt PDFs (mirrors lifecycle admissions storage).
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET || "sms-receipts";
const REGION = process.env.S3_REGION || "us-east-1";
const ENDPOINT = process.env.S3_ENDPOINT;
const FORCE_PATH = process.env.S3_FORCE_PATH_STYLE !== "false";

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
      console.warn("[receipt-storage] createBucket:", err.message);
    }
  }
  bucketReady = true;
}

export async function putReceiptPdf(opts: {
  schoolId: string;
  receiptId: string;
  pdf: Buffer;
}): Promise<{ storageKey: string; fileUrl: string }> {
  const storageKey = `receipts/${opts.schoolId}/${opts.receiptId}.pdf`;
  const s3 = getClient();
  if (!s3) {
    return { storageKey, fileUrl: `local://${storageKey}` };
  }
  await ensureBucket(s3);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      Body: opts.pdf,
      ContentType: "application/pdf",
    })
  );
  const publicBase = process.env.S3_PUBLIC_URL || ENDPOINT || "";
  const fileUrl = publicBase
    ? `${publicBase.replace(/\/$/, "")}/${BUCKET}/${storageKey}`
    : `s3://${BUCKET}/${storageKey}`;
  return { storageKey, fileUrl };
}

export async function getReceiptPdfSignedUrl(storageKey: string, expiresIn = 600): Promise<string | null> {
  const s3 = getClient();
  if (!s3 || storageKey.startsWith("local://")) return null;
  await ensureBucket(s3);
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }),
    { expiresIn }
  );
}

export async function getReceiptPdfObject(storageKey: string): Promise<Buffer | null> {
  const s3 = getClient();
  if (!s3 || storageKey.startsWith("local://")) return null;
  await ensureBucket(s3);
  const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }));
  if (!out.Body) return null;
  const bytes = await out.Body.transformToByteArray();
  return Buffer.from(bytes);
}
