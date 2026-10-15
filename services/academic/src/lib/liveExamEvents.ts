import { EventEmitter } from "node:events";
import type { Server } from "socket.io";

export type LiveExamEvent =
  | { type: "attempt.started"; payload: { examId: string; attemptId: string; studentId: string; startedAt: Date; attemptNumber?: number } }
  | { type: "attempt.answered"; payload: { examId: string; attemptId: string; answeredCount: number } }
  | { type: "attempt.violation"; payload: { examId: string; attemptId: string; violationCount: number; detail?: string } }
  | { type: "attempt.submitted"; payload: { examId: string; attemptId: string; studentId: string; submittedAt: Date; autoSubmitted: boolean } }
  | { type: "attempt.final"; payload: { examId: string; attemptId: string; studentId: string; finalAt: Date; autoSubmitted: boolean } }
  | { type: "attempt.disconnected"; payload: { examId: string; attemptId: string; studentId: string; at: Date } }
  | { type: "attempt.reconnected"; payload: { examId: string; attemptId: string; studentId: string; at: Date } }
  | { type: "attempt.warning"; payload: { examId: string; attemptId: string; message: string; at: Date } }
  | { type: "attempt.flagged"; payload: { examId: string; attemptId: string; flagged: boolean; note?: string } }
  | { type: "attempt.extended"; payload: { examId: string; attemptId: string; endsAt: Date; extraMinutes: number } }
  | { type: "attempt.force_submitted"; payload: { examId: string; attemptId: string; at: Date } }
  | { type: "screen.frame"; payload: { examId: string; attemptId: string; storageKey: string; capturedAt: Date } };

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

let io: Server | null = null;

/** Wire the Socket.IO server so events fan out to subscribed rooms. */
export function setExamIo(server: Server | null) {
  io = server;
}

export function examRoom(examId: string) {
  return `exam:${examId}`;
}

export function attemptRoom(attemptId: string) {
  return `attempt:${attemptId}`;
}

function examIdOf(event: LiveExamEvent): string | undefined {
  return (event.payload as { examId?: string }).examId;
}

function attemptIdOf(event: LiveExamEvent): string | undefined {
  return (event.payload as { attemptId?: string }).attemptId;
}

export function emitLiveExamEvent(event: LiveExamEvent) {
  emitter.emit("event", event);
  if (io) {
    const examId = examIdOf(event);
    if (examId) io.to(examRoom(examId)).emit("exam-event", event);
    const attemptId = attemptIdOf(event);
    if (attemptId) io.to(attemptRoom(attemptId)).emit("exam-event", event);
  }
}

export function onLiveExamEvent(
  examId: string,
  handler: (event: LiveExamEvent) => void
): () => void {
  const wrapper = (event: LiveExamEvent) => {
    if (examIdOf(event) === examId) handler(event);
  };
  emitter.on("event", wrapper);
  return () => emitter.off("event", wrapper);
}

/** Staff roles allowed to subscribe to an exam's live feed. */
export const PROCTOR_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"] as const;

export function isProctorRole(role: string): boolean {
  return (PROCTOR_ROLES as readonly string[]).includes(role);
}
