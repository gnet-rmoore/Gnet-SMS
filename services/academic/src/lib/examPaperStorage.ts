import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET || "sms-exam-papers";
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

export function examPaperStorageEnabled(): boolean {
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
      console.warn("[exam-paper-storage] createBucket:", err.message);
    }
  }
  bucketReady = true;
}

export type ExamPaperPresignResult = {
  uploadUrl: string;
  fileUrl: string;
  storageKey: string;
  expiresIn: number;
};

export function assertExamPaperMime(mimeType: string) {
  if (mimeType !== "application/pdf") {
    const err: any = new Error("Only PDF files are allowed for exam papers");
    err.status = 400;
    throw err;
  }
}

export async function createExamPaperUploadUrl(opts: {
  schoolId: string;
  examId: string;
  fileName: string;
  mimeType: string;
}): Promise<ExamPaperPresignResult> {
  assertExamPaperMime(opts.mimeType || "application/pdf");
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storageKey = `exam-papers/${opts.schoolId}/${opts.examId}/${Date.now()}-${safeName}`;
  const expiresIn = 900;
  const s3 = getClient();

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
    ContentType: "application/pdf",
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  const publicBase = process.env.S3_PUBLIC_URL || ENDPOINT || "";
  const fileUrl = publicBase
    ? `${publicBase.replace(/\/$/, "")}/${BUCKET}/${storageKey}`
    : `s3://${BUCKET}/${storageKey}`;

  return { uploadUrl, fileUrl, storageKey, expiresIn };
}

export async function createExamPaperDownloadUrl(
  storageKey: string,
  expiresIn = 600
): Promise<string | null> {
  const s3 = getClient();
  if (!s3 || !storageKey) return null;
  await ensureBucket(s3);
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  return getSignedUrl(s3, command, { expiresIn });
}
