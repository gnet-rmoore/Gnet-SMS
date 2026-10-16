/**
 * Super Admin database maintenance: server-side pg_dump backups and VACUUM ANALYZE.
 *
 * Requires PostgreSQL client tools (pg_dump, psql) on PATH and an admin connection
 * string in DATABASE_MAINTENANCE_URL (the cluster role that spans all schemas).
 *
 * Backups are written to BACKUPS_DIR (persistent volume) and, when S3/MinIO creds
 * are configured, also uploaded off-box so data survives a server crash.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  parseDatabaseUrl,
  buildPgArgs,
  buildPgEnv,
  backupFileName,
  isValidBackupName,
  pruneOldest,
  buildOptimizeSql,
  summarizeMaintenanceStatus,
  type ParsedDatabaseUrl,
  type MaintenanceStatus,
} from "../domain/dbMaintenance";

const BACKUPS_DIR = process.env.BACKUPS_DIR || path.join(process.cwd(), "backups");
const RETENTION = Number(process.env.BACKUP_RETENTION || 7);
const S3_BUCKET = process.env.S3_BACKUP_BUCKET || process.env.S3_BUCKET || "sms-backups";
const S3_PREFIX = "database-backups/";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_FORCE_PATH = process.env.S3_FORCE_PATH_STYLE !== "false";
const COMMAND_TIMEOUT_MS = Number(process.env.DB_MAINTENANCE_TIMEOUT_MS || 15 * 60 * 1000);

export type BackupRecord = {
  name: string;
  bytes: number;
  size: string;
  createdAt: string;
};

export type BackupResult = {
  name: string;
  bytes: number;
  size: string;
  createdAt: string;
  uploadedToCloud: boolean;
};

function maintenanceUrl(): string {
  const url = process.env.DATABASE_MAINTENANCE_URL || "";
  if (!url) {
    throw Object.assign(
      new Error("DATABASE_MAINTENANCE_URL is not configured on the identity service"),
      { status: 503, code: "MAINTENANCE_DB_NOT_CONFIGURED" }
    );
  }
  return url;
}

function parsedMaintenanceUrl(): ParsedDatabaseUrl {
  const parsed = parseDatabaseUrl(maintenanceUrl());
  if (!parsed) {
    throw Object.assign(new Error("DATABASE_MAINTENANCE_URL is not a valid Postgres URL"), {
      status: 503,
      code: "MAINTENANCE_DB_INVALID",
    });
  }
  return parsed;
}

function s3Client(): S3Client | null {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT || undefined,
    forcePathStyle: S3_FORCE_PATH,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function s3Key(name: string): string {
  return `${S3_PREFIX}${name}`;
}

async function ensureDir() {
  await fsp.mkdir(BACKUPS_DIR, { recursive: true });
}

function runCommand(
  cmd: string,
  args: string[],
  env: Record<string, string>
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...env },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        reject(
          Object.assign(new Error(`${cmd} timed out after ${COMMAND_TIMEOUT_MS}ms`), {
            status: 504,
            code: "MAINTENANCE_TIMEOUT",
          })
        );
      }
    }, COMMAND_TIMEOUT_MS);

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        Object.assign(new Error(`Failed to run ${cmd}: ${err.message}`), {
          status: 500,
          code: "MAINTENANCE_TOOL_MISSING",
        })
      );
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

async function uploadToCloud(filePath: string, name: string): Promise<boolean> {
  const s3 = s3Client();
  if (!s3) return false;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key(name),
        Body: fs.createReadStream(filePath),
        ContentType: "application/sql",
      })
    );
    return true;
  } catch (err: any) {
    console.warn("[dbMaintenance] backup upload failed:", err?.message || err);
    return false;
  }
}

async function listLocalNames(): Promise<string[]> {
  try {
    const entries = await fsp.readdir(BACKUPS_DIR);
    return entries.filter(isValidBackupName);
  } catch {
    return [];
  }
}

async function pruneLocal() {
  const names = await listLocalNames();
  const overflow = pruneOldest(names, RETENTION);
  await Promise.all(
    overflow.map((name) => fsp.unlink(path.join(BACKUPS_DIR, name)).catch(() => undefined))
  );
  return overflow;
}

async function pruneCloud(names: string[]) {
  const s3 = s3Client();
  if (!s3 || names.length === 0) return;
  await Promise.all(
    names.map((name) =>
      s3
        .send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key(name) }))
        .catch(() => undefined)
    )
  );
}

async function toolAvailable(cmd: string): Promise<boolean> {
  try {
    const { code } = await runCommand(cmd, ["--version"], {});
    return code === 0;
  } catch {
    return false;
  }
}

/** `pg_dump` / `psql` presence changes only on deploys — cache for 60s. */
const TOOL_CACHE_MS = 60_000;
let toolCache: { at: number; pgDump: boolean; psql: boolean } | null = null;

async function toolsAvailable(): Promise<{ pgDump: boolean; psql: boolean }> {
  if (toolCache && Date.now() - toolCache.at < TOOL_CACHE_MS) {
    return { pgDump: toolCache.pgDump, psql: toolCache.psql };
  }
  const [pgDump, psql] = await Promise.all([toolAvailable("pg_dump"), toolAvailable("psql")]);
  toolCache = { at: Date.now(), pgDump, psql };
  return { pgDump, psql };
}

export const dbMaintenance = {
  /** Readiness report for the Database tab (no side effects). */
  async status(): Promise<MaintenanceStatus> {
    const rawUrl = process.env.DATABASE_MAINTENANCE_URL || "";
    const tools = await toolsAvailable();
    return summarizeMaintenanceStatus({
      urlConfigured: rawUrl.trim() !== "",
      urlValid: parseDatabaseUrl(rawUrl) !== null,
      pgDumpAvailable: tools.pgDump,
      psqlAvailable: tools.psql,
      s3Configured: Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
      backupsDir: BACKUPS_DIR,
      retention: RETENTION,
    });
  },

  /** Run pg_dump, persist locally, upload off-box, then apply retention. */
  async runBackup(): Promise<BackupResult> {
    const parsed = parsedMaintenanceUrl();
    await ensureDir();
    const now = new Date();
    const name = backupFileName(now);
    const filePath = path.join(BACKUPS_DIR, name);

    const args = [
      ...buildPgArgs(parsed),
      "--no-owner",
      "--no-privileges",
      "--format=plain",
      `--file=${filePath}`,
    ];
    const { code, stderr } = await runCommand("pg_dump", args, buildPgEnv(parsed));
    if (code !== 0) {
      await fsp.unlink(filePath).catch(() => undefined);
      throw Object.assign(new Error(`pg_dump failed: ${stderr.slice(0, 500) || "unknown error"}`), {
        status: 500,
        code: "BACKUP_FAILED",
      });
    }

    const stat = await fsp.stat(filePath);
    const uploadedToCloud = await uploadToCloud(filePath, name);
    const overflow = await pruneLocal();
    await pruneCloud(overflow);

    return {
      name,
      bytes: stat.size,
      size: stat.size.toString(),
      createdAt: stat.mtime.toISOString(),
      uploadedToCloud,
    };
  },

  async listBackups(): Promise<BackupRecord[]> {
    await ensureDir();
    const names = await listLocalNames();
    const records = await Promise.all(
      names.map(async (name) => {
        const stat = await fsp.stat(path.join(BACKUPS_DIR, name));
        return { name, bytes: stat.size, size: String(stat.size), createdAt: stat.mtime.toISOString() };
      })
    );
    return records.sort((a, b) => b.name.localeCompare(a.name));
  },

  /** Absolute path for a validated backup name, or throw 400. */
  backupPath(name: string): string {
    if (!isValidBackupName(name)) {
      throw Object.assign(new Error("Invalid backup name"), {
        status: 400,
        code: "INVALID_BACKUP_NAME",
      });
    }
    return path.join(BACKUPS_DIR, name);
  },

  async deleteBackup(name: string): Promise<void> {
    const filePath = this.backupPath(name);
    const exists = await fsp
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      throw Object.assign(new Error("Backup not found"), {
        status: 404,
        code: "BACKUP_NOT_FOUND",
      });
    }
    await fsp.unlink(filePath);
    const s3 = s3Client();
    if (s3) {
      await s3
        .send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key(name) }))
        .catch(() => undefined);
    }
  },

  /** Presigned cloud URL for a backup when the local copy is gone. */
  async cloudDownloadUrl(name: string): Promise<string | null> {
    if (!isValidBackupName(name)) return null;
    const s3 = s3Client();
    if (!s3) return null;
    try {
      return await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key(name) }),
        { expiresIn: 900 }
      );
    } catch {
      return null;
    }
  },

  /** VACUUM (ANALYZE) every table across every schema of the database. */
  async runOptimize(): Promise<{ durationMs: number; output: string }> {
    const parsed = parsedMaintenanceUrl();
    const started = Date.now();
    const { code, stderr } = await runCommand(
      "psql",
      [...buildPgArgs(parsed), "-c", buildOptimizeSql()],
      buildPgEnv(parsed)
    );
    const durationMs = Date.now() - started;
    if (code !== 0) {
      throw Object.assign(new Error(`VACUUM failed: ${stderr.slice(0, 500) || "unknown error"}`), {
        status: 500,
        code: "OPTIMIZE_FAILED",
      });
    }
    return { durationMs, output: "VACUUM (ANALYZE) completed" };
  },
};
