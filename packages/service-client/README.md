# @sms/service-client

Shared HTTP client for synchronous service-to-service calls.

**Implemented:** per-attempt timeout (`AbortController`) and retry-with-jitter
(exponential full-jitter backoff) on transient failures — HTTP `429`/`502`/`503`
and network-level errors (timeout, connection reset, DNS failure) — up to
`maxAttempts` (default `3`) total attempts. See `MICROSERVICES_ROADMAP.md` §5.

**Planned:** circuit breaker, short-lived service JWT signing.

```ts
import { getJson, postJson, serviceFetch, ServiceClientError } from "@sms/service-client";

const user = await getJson<{ id: string }>(`${IDENTITY_URL}/api/users/${id}`);

await postJson(`${STAFF_URL}/api/leave-requests`, { staffId, from, to }, {
  timeoutMs: 3000,
  maxAttempts: 3,
});
```

**Status:** Timeout + retry-with-jitter implemented; no circuit breaker or service-JWT signing yet.
