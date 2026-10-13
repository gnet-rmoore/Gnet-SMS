import "dotenv/config";
import app from "./app";
import { startCommsWorkers } from "./workers/eventWorkers";

const PORT = Number(process.env.PORT) || 3017;

app.listen(PORT, () => {
  console.log(`[comms] listening on :${PORT}`);
  if (process.env.REDIS_URL) {
    try {
      startCommsWorkers(process.env.REDIS_URL);
    } catch (err: any) {
      console.warn("[comms] workers not started:", err.message);
    }
  } else {
    console.warn("[comms] REDIS_URL unset — event workers disabled");
  }
});
