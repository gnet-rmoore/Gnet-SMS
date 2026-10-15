import "dotenv/config";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import app from "./app";
import { onlineExamService } from "./services/onlineExamService";
import { attemptRoom, examRoom, emitLiveExamEvent, isProctorRole } from "./lib/liveExamEvents";

const PORT = Number(process.env.PORT) || 3015;

function getCorsOrigin(): boolean | string | string[] {
  const raw = process.env.APP_URL || process.env.CORS_ORIGIN;
  if (!raw) {
    if (process.env.NODE_ENV === "production") return false;
    return ["http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:8080"];
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_ACCESS_SECRET is required in production");
    }
    console.warn("[academic] JWT_ACCESS_SECRET not set — using insecure dev fallback");
    return "dev-only-insecure-secret-change-me";
  }
  return secret;
}

function getSuperAdminJwtSecret(): string {
  const secret = process.env.SUPER_ADMIN_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SUPER_ADMIN_JWT_SECRET is required in production");
    }
    return "dev-only-insecure-secret-change-me-super-admin";
  }
  return secret;
}

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    userRole: string;
    schoolId: string | null;
    attemptIds: Set<string>;
    studentId: string | null;
  };
}

function verifySocketToken(token: string): { userId: string; role: string; schoolId: string | null } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; role: string; schoolId?: string };
    return { userId: decoded.id, role: decoded.role, schoolId: decoded.schoolId ?? null };
  } catch {
    try {
      const decoded = jwt.verify(token, getSuperAdminJwtSecret()) as { id: string; role: string };
      if (decoded.role !== "SUPER_ADMIN") return null;
      return { userId: decoded.id, role: decoded.role, schoolId: null };
    } catch {
      return null;
    }
  }
}

async function main() {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    path: "/exam-socket",
    cors: { origin: getCorsOrigin(), methods: ["GET", "POST"] },
  });

  if (process.env.REDIS_URL) {
    try {
      const { createAdapter } = await import("@socket.io/redis-adapter");
      const { default: Redis } = await import("ioredis");
      const pubClient = new Redis(process.env.REDIS_URL);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log("[academic] Socket.IO Redis adapter enabled");
    } catch (err: any) {
      console.warn("[academic] Socket.IO Redis adapter unavailable:", err.message);
    }
  } else {
    console.warn("[academic] REDIS_URL unset — Socket.IO single-node only");
  }

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];
    if (!token) return next(new Error("Authentication required"));
    const auth = verifySocketToken(token);
    if (!auth) return next(new Error("Invalid or expired token"));
    (socket as AuthenticatedSocket).data = {
      userId: auth.userId,
      userRole: auth.role,
      schoolId: auth.schoolId,
      attemptIds: new Set<string>(),
      studentId: null,
    };
    next();
  });

  io.on("connection", (socket) => {
    const authed = socket as AuthenticatedSocket;

    // Proctors/admins subscribe to an exam's live feed (same-school only).
    socket.on("exam:subscribe", async (examId: string) => {
      if (!examId || !isProctorRole(authed.data.userRole)) return;
      if (authed.data.userRole !== "SUPER_ADMIN") {
        const exam = await onlineExamService.getExamAccess(examId);
        if (!exam || exam.schoolId !== authed.data.schoolId) return;
      }
      socket.join(examRoom(examId));
    });

    socket.on("exam:unsubscribe", (examId: string) => {
      if (!examId) return;
      socket.leave(examRoom(examId));
    });

    // Students subscribe to their own attempt so they receive warnings/extensions.
    // Proctors may subscribe to any attempt in their school.
    socket.on("attempt:subscribe", async (attemptId: string) => {
      if (!attemptId) return;
      const attempt = await onlineExamService.getAttemptAccess(attemptId);
      if (!attempt) return;
      const isOwner = attempt.studentId === authed.data.userId;
      const isSameSchoolProctor =
        isProctorRole(authed.data.userRole) &&
        (authed.data.userRole === "SUPER_ADMIN" || attempt.schoolId === authed.data.schoolId);
      if (!isOwner && !isSameSchoolProctor) return;

      socket.join(attemptRoom(attemptId));
      if (isOwner && !authed.data.attemptIds.has(attemptId)) {
        authed.data.attemptIds.add(attemptId);
        authed.data.studentId = authed.data.userId;
        // Notify proctors that this student is (re)connected.
        void onlineExamService
          .emitAttemptConnection(attemptId, "attempt.reconnected")
          .catch(() => undefined);
      }
    });

    socket.on("attempt:unsubscribe", (attemptId: string) => {
      if (!attemptId) return;
      authed.data.attemptIds.delete(attemptId);
      socket.leave(attemptRoom(attemptId));
    });

    socket.on("disconnect", () => {
      for (const attemptId of authed.data.attemptIds) {
        void onlineExamService
          .emitAttemptConnection(attemptId, "attempt.disconnected")
          .catch(() => undefined);
      }
    });
  });

  const { setExamIo } = await import("./lib/liveExamEvents");
  setExamIo(io);

  httpServer.listen(PORT, () => {
    console.log(`[academic] listening on :${PORT} (HTTP + Socket.IO)`);
  });

  // Reliable server-side auto-submit: finalize attempts whose deadline passed,
  // even if the student disconnected and never sent the submit request.
  const SWEEP_INTERVAL_MS = Number(process.env.EXAM_SWEEP_INTERVAL_MS) || 60_000;
  const sweepTimer = setInterval(async () => {
    try {
      const result = await onlineExamService.sweepExpiredAttempts();
      if (result.finalized > 0) {
        console.log(`[academic] exam sweep finalized ${result.finalized} expired attempt(s)`);
      }
      const frames = await onlineExamService.purgeExpiredProctorFrames();
      if (frames.purged > 0) {
        console.log(`[academic] purged ${frames.purged} expired proctor frame(s)`);
      }
    } catch (err: any) {
      console.error("[academic] exam sweep failed:", err?.message || err);
    }
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref?.();
}

main().catch((err) => {
  console.error("[academic] fatal:", err);
  process.exit(1);
});
