import prisma from "../lib/prisma";
import { assertDocumentStorageQuota, resolveFileSizeBytes } from "../lib/quotaEnforcement";
import { getIdentityUsersByIds } from "../lib/identityClient";

const ALLOWED_CATEGORIES = [
  "POLICY",
  "FORM",
  "TEACHING_MATERIAL",
  "HR",
  "ACADEMIC",
  "OTHER",
] as const;

function parseAccessRoles(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => typeof r === "string") : [];
  } catch {
    return [];
  }
}

async function withUploader(docs: Array<Record<string, any>>) {
  const ids = docs.map((d) => d.uploadedBy as string).filter(Boolean);
  const users = await getIdentityUsersByIds(ids);
  return docs.map((d) => {
    const accessRoles = parseAccessRoles(d.accessRoles);
    const user = users.get(d.uploadedBy);
    return {
      ...d,
      accessRoles,
      uploader: user
        ? { id: user.id, name: user.name, role: user.role }
        : { id: d.uploadedBy, name: "School staff", role: undefined },
    };
  });
}

export const documentService = {
  ALLOWED_CATEGORIES,

  async getDocuments(schoolId: string, role?: string) {
    const documents = await prisma.schoolDocument.findMany({
      where: {
        schoolId,
        ...(role ? { accessRoles: { contains: `"${role}"` } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return withUploader(documents);
  },

  async createDocument(data: {
    schoolId: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileType: string;
    category: string;
    accessRoles: string[];
    uploadedBy: string;
    fileSizeBytes?: number | null;
  }) {
    const title = data.title?.trim();
    if (!title) {
      const err: any = new Error("Title is required");
      err.status = 400;
      throw err;
    }
    if (!data.fileUrl?.trim()) {
      const err: any = new Error("File URL is required");
      err.status = 400;
      throw err;
    }
    if (!Array.isArray(data.accessRoles) || data.accessRoles.length === 0) {
      const err: any = new Error("Select at least one access role");
      err.status = 400;
      throw err;
    }
    const category = (data.category || "OTHER").toUpperCase();
    if (!ALLOWED_CATEGORIES.includes(category as any)) {
      const err: any = new Error(`Invalid category: ${category}`);
      err.status = 400;
      throw err;
    }

    const fileSizeBytes = resolveFileSizeBytes(data.fileUrl, data.fileSizeBytes);
    await assertDocumentStorageQuota(data.schoolId, fileSizeBytes);

    const document = await prisma.schoolDocument.create({
      data: {
        schoolId: data.schoolId,
        title,
        description: data.description?.trim() || null,
        fileUrl: data.fileUrl.trim(),
        fileType: (data.fileType || "pdf").toLowerCase().slice(0, 32),
        category,
        accessRoles: JSON.stringify(data.accessRoles),
        uploadedBy: data.uploadedBy,
        fileSizeBytes,
      },
    });

    const [enriched] = await withUploader([document]);
    return enriched;
  },

  async updateDocument(id: string, data: any) {
    const existing = await prisma.schoolDocument.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error("Document not found");
      err.status = 404;
      throw err;
    }

    const updateData: Record<string, any> = {};
    if (data.title !== undefined) {
      const title = String(data.title).trim();
      if (!title) {
        const err: any = new Error("Title is required");
        err.status = 400;
        throw err;
      }
      updateData.title = title;
    }
    if (data.description !== undefined) {
      updateData.description = String(data.description).trim() || null;
    }
    if (data.fileUrl !== undefined) {
      const fileUrl = String(data.fileUrl).trim();
      if (!fileUrl) {
        const err: any = new Error("File URL is required");
        err.status = 400;
        throw err;
      }
      updateData.fileUrl = fileUrl;
    }
    if (data.fileType !== undefined) {
      updateData.fileType = String(data.fileType).toLowerCase().slice(0, 32);
    }
    if (data.category !== undefined) {
      const category = String(data.category).toUpperCase();
      if (!ALLOWED_CATEGORIES.includes(category as any)) {
        const err: any = new Error(`Invalid category: ${category}`);
        err.status = 400;
        throw err;
      }
      updateData.category = category;
    }
    if (data.accessRoles !== undefined) {
      if (!Array.isArray(data.accessRoles) || data.accessRoles.length === 0) {
        const err: any = new Error("Select at least one access role");
        err.status = 400;
        throw err;
      }
      updateData.accessRoles = JSON.stringify(data.accessRoles);
    }

    if (data.fileUrl !== undefined) {
      const fileSizeBytes = resolveFileSizeBytes(String(data.fileUrl), data.fileSizeBytes);
      await assertDocumentStorageQuota(existing.schoolId, fileSizeBytes, id);
      updateData.fileSizeBytes = fileSizeBytes;
    }

    const document = await prisma.schoolDocument.update({
      where: { id },
      data: updateData,
    });

    const [enriched] = await withUploader([document]);
    return enriched;
  },

  async deleteDocument(id: string) {
    return prisma.schoolDocument.delete({ where: { id } });
  },
};
