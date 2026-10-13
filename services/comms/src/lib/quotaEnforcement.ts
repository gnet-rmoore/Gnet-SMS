import prisma from "./prisma";
import { bytesFromFileUrl, getSchoolQuotas } from "./storageQuota";

export async function sumSchoolDocumentBytes(schoolId: string, excludeId?: string) {
  const rows = await prisma.schoolDocument.findMany({
    where: { schoolId, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { fileSizeBytes: true },
  });
  return rows.reduce((sum, row) => sum + (row.fileSizeBytes || 0), 0);
}

export async function assertDocumentStorageQuota(
  schoolId: string,
  incomingBytes: number,
  excludeDocumentId?: string
) {
  const quotas = await getSchoolQuotas(schoolId);
  if (!quotas?.maxStorageMb) return;
  const limitBytes = quotas.maxStorageMb * 1024 * 1024;
  const used = await sumSchoolDocumentBytes(schoolId, excludeDocumentId);
  if (used + incomingBytes > limitBytes) {
    const usedMb = (used / (1024 * 1024)).toFixed(1);
    throw Object.assign(
      new Error(
        `Document storage limit reached (${quotas.maxStorageMb} MB plan cap, ~${usedMb} MB used). Remove files or upgrade your plan.`
      ),
      {
        status: 403,
        code: "QUOTA_EXCEEDED",
        quota: "maxStorageMb",
        limit: quotas.maxStorageMb,
        usedBytes: used,
      }
    );
  }
}

export function resolveFileSizeBytes(fileUrl: string, explicit?: number | null) {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 0) {
    return Math.floor(explicit);
  }
  return bytesFromFileUrl(fileUrl);
}
