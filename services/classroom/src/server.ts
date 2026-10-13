import "dotenv/config";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import app from "./app";

const PORT = Number(process.env.PORT) || 3014;

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
    console.warn("[classroom] JWT_ACCESS_SECRET not set — using insecure dev fallback");
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
  const corsOrigin = getCorsOrigin();
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
    handshakeTimeout: 10_000,
  });

  if (process.env.REDIS_URL) {
    try {
      const { createAdapter } = await import("@socket.io/redis-adapter");
      const { default: Redis } = await import("ioredis");
      const pubClient = new Redis(process.env.REDIS_URL);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log("[classroom] Socket.IO Redis adapter enabled");
    } catch (err: any) {
      console.warn("[classroom] Socket.IO Redis adapter unavailable:", err.message);
    }
  } else {
    console.warn("[classroom] REDIS_URL unset — Socket.IO single-node only");
  }

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];
    if (!token) {
      return next(new Error("Authentication required"));
    }
    const auth = verifySocketToken(token);
    if (!auth) {
      return next(new Error("Invalid or expired token"));
    }
    (socket as AuthenticatedSocket).data = {
      userId: auth.userId,
      userRole: auth.role,
      schoolId: auth.schoolId,
    };
    next();
  });

  io.on("connection", (socket) => {
    const authed = socket as AuthenticatedSocket;
    console.log("[classroom] connected:", socket.id, "user:", authed.data.userId);

    socket.on("join-classroom", (classroomId: string) => {
      if (!classroomId) return;
      socket.join(`classroom:${classroomId}`);
      console.log(`[classroom] ${authed.data.userId} (${socket.id}) joined classroom:${classroomId}`);
    });

    socket.on("leave-classroom", (classroomId: string) => {
      if (!classroomId) return;
      socket.leave(`classroom:${classroomId}`);
    });

    socket.on("disconnect", () => {
      console.log("[classroom] disconnected:", socket.id, "user:", authed.data.userId);
    });
  });

  const { setClassroomIo } = await import("./lib/socketEvents");
  setClassroomIo(io);

  httpServer.listen(PORT, () => {
    console.log(`[classroom] listening on :${PORT} (HTTP + Socket.IO)`);
  });
}

main().catch((err) => {
  console.error("[classroom] fatal:", err);
  process.exit(1);
});
