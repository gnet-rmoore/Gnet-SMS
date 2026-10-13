/**
 * BullMQ (Redis Streams) producer/consumer wrappers over the typed event
 * catalog in `events.ts` (roadmap §5). One BullMQ queue per event name, so a
 * consumer only ever has to subscribe to the events it actually cares about.
 */

import { Queue, Worker, type Job } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";
import type { DomainEvent, EventName, EventPayloadMap } from "./events";

/** BullMQ requires this on the ioredis connection it manages. */
const REDIS_CONNECTION_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: null,
};

export interface EventBus {
  /** Underlying ioredis connection shared by every queue created from this bus. */
  readonly connection: IORedis;
  /** Get (or lazily create) the BullMQ queue backing a given event name. */
  getQueue<E extends EventName>(name: E): Queue<DomainEvent<E>>;
  /** Close every queue created from this bus and the underlying connection. */
  close(): Promise<void>;
}

/**
 * Create an event bus bound to a Redis instance. Each distinct event name
 * gets its own BullMQ `Queue` (created lazily on first use), all sharing one
 * underlying Redis connection.
 */
export function createEventBus(redisUrl: string): EventBus {
  // Pass URL string to BullMQ so it owns the ioredis instance (avoids duplicate
  // ioredis type versions between root and bullmq's nested dependency).
  const connection = new IORedis(redisUrl, REDIS_CONNECTION_OPTIONS);
  const queues = new Map<string, Queue>();

  function getQueue<E extends EventName>(name: E): Queue<DomainEvent<E>> {
    let queue = queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection });
      queues.set(name, queue);
    }
    return queue as Queue<DomainEvent<E>>;
  }

  return {
    connection,
    getQueue,
    async close() {
      await Promise.all(Array.from(queues.values()).map((queue) => queue.close()));
      await connection.quit();
    },
  };
}

let defaultBus: EventBus | undefined;

/** Lazily create (and memoize) a process-wide bus from `process.env.REDIS_URL`. */
function getDefaultBus(): EventBus {
  if (!defaultBus) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL is not set; cannot publish/consume events.");
    }
    defaultBus = createEventBus(redisUrl);
  }
  return defaultBus;
}

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: 1000,
  // Keep failed jobs around (bounded) instead of discarding them, so the
  // Redis-backed "failed" set on each queue doubles as a basic dead-letter
  // store that can be inspected/replayed later.
  removeOnFail: 5000,
};

/**
 * Publish a domain event onto its queue. Uses the shared default bus (built
 * from `REDIS_URL`) unless an explicit `bus` is passed — e.g. for tests or a
 * service that already created one via `createEventBus`.
 */
export async function publishEvent<E extends EventName>(
  name: E,
  payload: EventPayloadMap[E],
  bus: EventBus = getDefaultBus()
): Promise<string> {
  const event: DomainEvent<E> = {
    name,
    payload,
    occurredAt: new Date().toISOString(),
  };
  const job = await bus.getQueue(name).add(name, event, DEFAULT_JOB_OPTIONS);
  return job.id ?? "";
}

export interface CreateWorkerOptions {
  /** Redis connection URL. Defaults to `process.env.REDIS_URL`. */
  redisUrl?: string;
  /** Number of jobs this worker processes concurrently. Default: 5. */
  concurrency?: number;
  /**
   * Called once a job has exhausted all retry attempts — the natural
   * dead-letter hook (e.g. write to a `failed_events` table, page on-call,
   * forward to a monitoring sink).
   */
  onDeadLetter?: (event: DomainEvent<EventName>, error: Error) => void | Promise<void>;
}

/**
 * Create a BullMQ worker that consumes every job published for a given
 * event name and hands the typed payload to `handler`. Failures are logged
 * and retried per `DEFAULT_JOB_OPTIONS`; once a job exhausts its attempts it
 * is logged as dead-lettered and `onDeadLetter` (if provided) is invoked.
 */
export function createWorker<E extends EventName>(
  name: E,
  handler: (payload: EventPayloadMap[E], event: DomainEvent<E>) => Promise<void> | void,
  options: CreateWorkerOptions = {}
): Worker<DomainEvent<E>> {
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set; cannot start worker.");
  }
  const workerConnection = new IORedis(redisUrl, REDIS_CONNECTION_OPTIONS);
  const worker = new Worker<DomainEvent<E>>(
    name,
    async (job: Job<DomainEvent<E>>) => {
      await handler(job.data.payload, job.data);
    },
    { connection: workerConnection, concurrency: options.concurrency ?? 5 }
  );

  worker.on("failed", (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 1;
    console.error(
      `[event-bus] "${name}" job ${job?.id} failed (attempt ${attemptsMade}/${maxAttempts}): ${err.message}`
    );

    if (job && attemptsMade >= maxAttempts) {
      console.error(`[event-bus] DEAD-LETTER "${name}" job ${job.id}:`, JSON.stringify(job.data));
      void options.onDeadLetter?.(job.data, err);
    }
  });

  worker.on("error", (err) => {
    console.error(`[event-bus] "${name}" worker error:`, err);
  });

  return worker;
}
