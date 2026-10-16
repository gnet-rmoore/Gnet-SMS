/**
 * Run `worker` over `items` with a bounded number of concurrent executions.
 * Lightweight alternative to p-limit (avoids an extra runtime dependency).
 * Never rejects: returns settled results so callers can inspect failures.
 */
export async function mapLimit<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const limit = Math.max(1, Math.floor(concurrency) || 1);
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        const value = await worker(items[i], i);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  const runners: Promise<void>[] = [];
  const n = Math.min(limit, items.length);
  for (let i = 0; i < n; i += 1) runners.push(run());
  await Promise.all(runners);
  return results;
}
