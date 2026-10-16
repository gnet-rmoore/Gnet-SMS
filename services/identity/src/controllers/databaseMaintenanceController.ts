import type { Request, Response } from "express";
import path from "node:path";
import { dbMaintenance } from "../lib/dbMaintenance";
import { platformOpsService } from "../services/platformOpsService";
import { logSystemEvent } from "../utils/logger";

function actorFromReq(req: Request) {
  const user = (req as any).user || {};
  return {
    id: String(user.id || ""),
    role: String(user.role || "SUPER_ADMIN"),
    schoolId: user.schoolId ?? null,
    platformRole: user.platformRole ?? null,
  };
}

function sendErr(res: Response, err: any, fallback: string) {
  res.status(err.status || 500).json({
    error: err.message || fallback,
    code: err.code,
  });
}

export const databaseMaintenanceController = {
  async getStatus(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "settings.manage");
      res.json(await dbMaintenance.status());
    } catch (err: any) {
      sendErr(res, err, "Failed to load database maintenance status");
    }
  },

  async createBackup(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "settings.manage");
      const backup = await dbMaintenance.runBackup();
      await logSystemEvent(
        "database_backup_created",
        "SETTINGS",
        `Database backup created: ${backup.name} (${backup.bytes} bytes)`,
        "WARNING",
        req,
        {
          category: "SETTINGS",
          entityType: "DatabaseBackup",
          entityId: backup.name,
          after: { name: backup.name, bytes: backup.bytes, uploadedToCloud: backup.uploadedToCloud },
          tags: ["database", "backup"],
        }
      );
      res.json({
        backup: { name: backup.name, bytes: backup.bytes, createdAt: backup.createdAt },
        uploadedToCloud: backup.uploadedToCloud,
      });
    } catch (err: any) {
      sendErr(res, err, "Failed to create database backup");
    }
  },

  async listBackups(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "settings.manage");
      const backups = await dbMaintenance.listBackups();
      res.json({ backups });
    } catch (err: any) {
      sendErr(res, err, "Failed to list database backups");
    }
  },

  async downloadBackup(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "settings.manage");
      const name = String(req.params.name);
      const filePath = dbMaintenance.backupPath(name);
      res.download(filePath, path.basename(name), async (err) => {
        if (!err) {
          await logSystemEvent(
            "database_backup_downloaded",
            "SETTINGS",
            `Database backup downloaded: ${name}`,
            "INFO",
            req,
            {
              category: "SETTINGS",
              entityType: "DatabaseBackup",
              entityId: name,
              tags: ["database", "backup", "download"],
            }
          );
          return;
        }
        const url = await dbMaintenance.cloudDownloadUrl(name);
        if (url && !res.headersSent) return res.redirect(url);
        if (!res.headersSent) sendErr(res, { status: 404 }, "Backup not found");
      });
    } catch (err: any) {
      sendErr(res, err, "Failed to download backup");
    }
  },

  async deleteBackup(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "settings.manage");
      const name = String(req.params.name);
      await dbMaintenance.deleteBackup(name);
      await logSystemEvent(
        "database_backup_deleted",
        "SETTINGS",
        `Database backup deleted: ${name}`,
        "WARNING",
        req,
        {
          category: "SETTINGS",
          entityType: "DatabaseBackup",
          entityId: name,
          before: { name },
          tags: ["database", "backup", "delete"],
        }
      );
      res.json({ success: true });
    } catch (err: any) {
      sendErr(res, err, "Failed to delete backup");
    }
  },

  async optimize(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "settings.manage");
      const result = await dbMaintenance.runOptimize();
      await logSystemEvent(
        "database_optimized",
        "SETTINGS",
        `Database VACUUM (ANALYZE) completed in ${result.durationMs}ms`,
        "WARNING",
        req,
        {
          category: "SETTINGS",
          entityType: "Database",
          entityId: "sms_db",
          after: { durationMs: result.durationMs },
          tags: ["database", "optimize", "vacuum"],
        }
      );
      res.json(result);
    } catch (err: any) {
      sendErr(res, err, "Failed to optimize database");
    }
  },
};
