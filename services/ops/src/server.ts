import "dotenv/config";
import app from "./app";
import { initializeFacilitiesHistory } from "./services/logisticsService";

const PORT = Number(process.env.PORT) || 3012;

async function start() {
  await initializeFacilitiesHistory();
  app.listen(PORT, () => {
    console.log(`[ops] listening on :${PORT}`);
  });
}

void start().catch((error) => {
  console.error("[ops] failed to initialize facilities history:", error);
  process.exitCode = 1;
});
