import { EventEmitter } from "node:events";

export type LiveExamEvent =
  | { type: "attempt.started"; payload: { examId: string; attemptId: string; studentId: string; startedAt: Date } }
  | { type: "attempt.answered"; payload: { examId: string; attemptId: string; answeredCount: number } }
  | { type: "attempt.violation"; payload: { examId: string; attemptId: string; violationCount: number; detail?: string } }
  | { type: "attempt.submitted"; payload: { examId: string; attemptId: string; studentId: string; submittedAt: Date; autoSubmitted: boolean } };

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export function emitLiveExamEvent(event: LiveExamEvent) {
  emitter.emit("event", event);
}

export function onLiveExamEvent(
  examId: string,
  handler: (event: LiveExamEvent) => void
): () => void {
  const wrapper = (event: LiveExamEvent) => {
    if (
      (event.type === "attempt.started" && event.payload.examId === examId) ||
      (event.type === "attempt.answered" && event.payload.examId === examId) ||
      (event.type === "attempt.violation" && event.payload.examId === examId) ||
      (event.type === "attempt.submitted" && event.payload.examId === examId)
    ) {
      handler(event);
    }
  };
  emitter.on("event", wrapper);
  return () => emitter.off("event", wrapper);
}