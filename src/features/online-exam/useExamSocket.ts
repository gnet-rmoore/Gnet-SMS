import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "../../store/authStore";

export type ExamSocketEvent = { type: string; payload: Record<string, any> };

type ExamSocketOptions = {
  /** Subscribe as a proctor to the exam's live feed (staff). */
  examId?: string | undefined;
  /** Subscribe as the student to their own attempt (warnings/extensions). */
  attemptId?: string | undefined;
  /** Receives the live connection state (connected / reconnecting / down). */
  onStatus?: (status: ExamSocketStatus) => void;
};

export type ExamSocketStatus = "connected" | "reconnecting" | "disconnected";

/**
 * Connect to the academic exam realtime feed (Socket.IO, path `/exam-socket`).
 * Proctors subscribe by exam; students subscribe by attempt.
 */
export function useExamSocket(
  { examId, attemptId, onStatus }: ExamSocketOptions,
  onEvent: (event: ExamSocketEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!examId && !attemptId) return;
    const token = useAuthStore.getState().accessToken;
    const socket: Socket = io({
      path: "/exam-socket",
      transports: ["websocket", "polling"],
      auth: { token },
    });

    const subscribe = () => {
      if (examId) socket.emit("exam:subscribe", examId);
      if (attemptId) socket.emit("attempt:subscribe", attemptId);
    };

    socket.on("connect", () => {
      onStatusRef.current?.("connected");
      subscribe();
    });
    socket.on("disconnect", () => onStatusRef.current?.("disconnected"));
    socket.io.on("reconnect_attempt", () => onStatusRef.current?.("reconnecting"));
    // Re-subscribe after a reconnection.
    socket.io.on("reconnect", subscribe);

    socket.on("exam-event", (payload) => onEventRef.current(payload));

    return () => {
      if (examId) socket.emit("exam:unsubscribe", examId);
      if (attemptId) socket.emit("attempt:unsubscribe", attemptId);
      socket.disconnect();
    };
  }, [examId, attemptId]);
}
