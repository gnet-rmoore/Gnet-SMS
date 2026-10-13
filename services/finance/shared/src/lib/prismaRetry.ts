import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Wraps a PrismaClient so that transient "pool closed" / "connection not
 * available" failures (e.g. during a postgres restart) are retried with a
 * short jittered backoff before being surfaced to callers.
 *
 * - Model delegate operations (findMany, create, update, ...) are retried on
 *   transient errors.
 * - Top-level `$queryRaw` / `$executeRaw` wrappers are retried too.
 * - Interactive `$transaction(cb)` is NOT touched — transparently retrying an
 *   interactive callback can re-run side effects, so we leave transaction-level
 *   retry to the caller.
 * - Batch `$transaction([...])` works: model calls are lazy thenables that
 *   expose the original raw PrismaPromise (Prisma requires every array element
 *   to be a genuine PrismaPromise), so the proxy unwraps them back for the
 *   transaction. Single-await callers still get retry-on-transient-error.
 */

/** Prisma model delegate operation names we retry. */
const MODEL_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findManyAndThrow",
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** Top-level client wrappers we retry (raw SQL). */
const RAW_OPS = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"]);

const RETRYABLE_MSG = /(pool closed|connection pool|connection not available|can't reach database|timed out|database system is (shutting down|in recovery|starting up)|server has closed the connection|socket closed|ECONNREFUSED|ECONNRESET|ETIMEDOUT|kind: Closed)/i;

const RETRYABLE_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Timeout connecting
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
  "P2024", // Connection pool timeout
]);

const DEFAULT_ATTEMPTS = 3;
const BASE_DELAY_MS = 150;

/**
 * Marker property on lazy thenables that carries the original raw (unwrapped)
 * PrismaPromise from the first delegate invocation. Batch `$transaction([...])`
 * unwraps these back into genuine PrismaPromise instances for the transaction.
 */
const RAW_OP = "__prismaRawOp";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full-jitter backoff so concurrent retries don't pile onto the DB at once. */
function backoffDelay(attempt: number): number {
  const cap = BASE_DELAY_MS * 2 ** attempt;
  return Math.floor(Math.random() * cap);
}

function isTransientDbError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (RETRYABLE_CODES.has(err.code)) return true;
    return RETRYABLE_MSG.test(err.message);
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return RETRYABLE_MSG.test(err.message);
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    return RETRYABLE_MSG.test(err.message);
  }
  if (err instanceof Error) {
    return RETRYABLE_MSG.test(err.message);
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransientDbError(err) || attempt >= DEFAULT_ATTEMPTS) {
        throw err;
      }
      await sleep(backoffDelay(attempt));
      attempt += 1;
    }
  }
}

/**
 * Restore raw PrismaPromise instances for batch-array `$transaction([...])`.
 * Plain values (already-resolved records, raw PrismaPromises, ...) pass through.
 */
function unwrapTxItems(items: unknown[]): unknown[] {
  return items.map((item: any) =>
    item && typeof item === "object" && item[RAW_OP] !== undefined ? item[RAW_OP] : item
  );
}

/**
 * Lazy thenable: the (retried) DB call is not started until the value is first
 * awaited or chained. The original raw PrismaPromise from the delegate is kept
 * under `RAW_OP` so batch `$transaction` can run it inside the transaction
 * instead of a standalone, already-executed operation.
 */
function lazyTxAwareThenable(
  promiseFactory: () => Promise<unknown>,
  rawPromise: unknown
): any {
  let started = false;
  let active: Promise<unknown> | null = null;
  const start = (): Promise<unknown> => {
    if (!started) {
      started = true;
      active = withRetry(promiseFactory);
    }
    return active as Promise<unknown>;
  };
  return {
    [RAW_OP]: rawPromise,
    then(
      onFulfilled?: ((value: unknown) => unknown) | null,
      onRejected?: ((reason: unknown) => unknown) | null
    ) {
      return start().then(onFulfilled, onRejected);
    },
    catch(onRejected?: ((reason: unknown) => unknown) | null) {
      return start().catch(onRejected);
    },
    finally(onFinally?: (() => void) | null) {
      return start().finally(onFinally);
    },
    get [Symbol.toStringTag]() {
      return "Promise";
    },
  };
}

function wrapModelMethod(delegate: any, methodKey: string) {
  const original: any = Reflect.get(delegate, methodKey);
  return (...args: unknown[]) => {
    const rawPromise = Reflect.apply(original, delegate, args) as any;
    return lazyTxAwareThenable(
      () => Reflect.apply(original, delegate, args) as Promise<unknown>,
      rawPromise
    );
  };
}

/** Wrap an individual model delegate object (e.g. `client.user`). */
function wrapDelegate(delegate: unknown): Record<string, unknown> {
  return new Proxy(delegate as Record<string, unknown>, {
    get: (target, prop, receiver) => {
      if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
      if (!MODEL_OPS.has(prop)) return Reflect.get(target, prop, receiver);
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return wrapModelMethod(target, prop);
    },
  });
}

function wrapPrismaClientGet(client: PrismaClient, prop: PropertyKey, _receiver: any) {
  if (typeof prop === "symbol") return Reflect.get(client, prop);
  const value = Reflect.get(client, prop);
  if (prop === "$transaction") {
    if (typeof value !== "function") return value;
    const original = value;
    return (...args: any[]) => {
      // Batch form: restore raw PrismaPromise instances before handing off,
      // so Prisma's instanceof validation passes and ops run inside the txn.
      if (Array.isArray(args[0])) {
        return Reflect.apply(original, client, [unwrapTxItems(args[0]), ...args.slice(1)]);
      }
      return Reflect.apply(original, client, args);
    };
  }
  if (typeof prop === "string" && RAW_OPS.has(prop)) {
    if (typeof value !== "function") return value;
    const original = value;
    return (...args: unknown[]) =>
      withRetry(() => Reflect.apply(original, client, args) as Promise<unknown>);
  }
  // Model delegates are plain objects on the client (e.g. `client.ptaOrganization`).
  if (value && typeof value === "object") {
    return wrapDelegate(value);
  }
  return value;
}

export function retryingPrisma<T extends PrismaClient>(client: T): T {
  return new Proxy(client, {
    get(_target, prop, receiver) {
      return wrapPrismaClientGet(client, prop, receiver);
    },
  }) as T;
}

export { withRetry };