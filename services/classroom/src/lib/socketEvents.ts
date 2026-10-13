import type { Server } from "socket.io";

let io: Server | null = null;

export function setClassroomIo(server: Server) {
  io = server;
}

export function emitClassroomEvent(
  classroomId: string,
  event: "post.created" | "post.updated" | "submission.updated" | "comment.created" | "comment.deleted",
  payload: Record<string, unknown>
) {
  if (!io || !classroomId) return;
  io.to(`classroom:${classroomId}`).emit(event, { classroomId, ...payload });
}
