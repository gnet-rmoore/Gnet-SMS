# @sms/event-bus

Shared event catalog and BullMQ producer/consumer wrappers over Redis Streams.

**Event catalog:** `user.*`, `school.updated`, `exam.results-released`, `attendance.recorded`, `fee.*`, `leave-request.*` — see `src/events.ts` and roadmap §5.

**Bus:** `src/bus.ts` — one BullMQ `Queue` per event name, backed by a shared `ioredis` connection.

```ts
import { createEventBus, publishEvent, createWorker } from "@sms/event-bus/bus";
import { EventNames } from "@sms/event-bus";

// Producer (e.g. Identity & Platform after creating a user)
await publishEvent(EventNames.UserCreated, { id, name, role, schoolId });

// Consumer (e.g. Communications & Documents)
createWorker(EventNames.AttendanceRecorded, async (payload) => {
  // send absence notification...
});

// Or manage your own bus/connection explicitly instead of relying on
// process.env.REDIS_URL:
const bus = createEventBus(process.env.REDIS_URL!);
await publishEvent(EventNames.FeeCollected, { feeId, studentId, amount, dueDate }, bus);
```

Failed jobs retry up to 3 times with exponential backoff; once a job exhausts
its attempts it's logged as `DEAD-LETTER` (and, if provided, `onDeadLetter`
is invoked) while remaining in the queue's failed set for inspection/replay.

**Status:** Producer/consumer wrappers implemented; no schema registry or replay tooling yet.
