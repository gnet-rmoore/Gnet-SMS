import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Join a classroom Socket.IO room (proxied via nginx /socket.io/ → classroom).
 * Calls onEvent for post/submission/comment realtime updates.
 */
export function useClassroomSocket(
  classroomId: string | undefined,
  onEvent: (event: string, payload: unknown) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!classroomId) return;
    const socket: Socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join-classroom", classroomId);
    });

    const events = [
      "post.created",
      "post.updated",
      "submission.updated",
      "comment.created",
      "comment.deleted",
    ] as const;

    for (const ev of events) {
      socket.on(ev, (payload) => onEventRef.current(ev, payload));
    }

    return () => {
      socket.emit("leave-classroom", classroomId);
      socket.disconnect();
    };
  }, [classroomId]);
}
