/**
 * Comms event workers — BullMQ consumers (roadmap §5 / Phase 4).
 */
import { Worker } from "bullmq";
import type { RedisOptions } from "ioredis";

const EVENT_NAMES = [
  "attendance.recorded",
  "fee.collected",
  "fee.overdue",
  "leave-request.approved",
  "leave-request.rejected",
  "exam.results-released",
  "school.updated",
] as const;

function redisConnectionFromUrl(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    maxRetriesPerRequest: null,
  };
}

export function startCommsWorkers(redisUrl: string) {
  const connection = redisConnectionFromUrl(redisUrl);

  for (const name of EVENT_NAMES) {
    const worker = new Worker(
      name,
      async (job) => {
        console.log(`[comms-worker] ${name}`, job.data);
      },
      { connection, concurrency: 5 }
    );
    worker.on("failed", (job, err) => {
      console.error(`[comms-worker] ${name} failed:`, err.message, job?.id);
    });
  }

  console.log("[comms-worker] workers started");
}
