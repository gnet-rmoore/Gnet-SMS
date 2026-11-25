import fs from "node:fs";
import path from "node:path";
import prisma from "../src/lib/prisma";
import { parentAccessService } from "../src/services/parentAccessService";

async function main() {
  const regenerateAll = process.argv.includes("--regenerate-all");
  const csvArg = process.argv.find((arg) => arg.startsWith("--csv="));
  const result = await parentAccessService.backfill(regenerateAll);
  if (csvArg) {
    const csvPath = path.resolve(csvArg.slice("--csv=".length));
    const rows = [
      "userId,name,email,schoolSlug,accessCode",
      ...result.distribution.map((row) =>
        [row.userId, "", "", row.schoolSlug, row.accessCode]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    fs.writeFileSync(csvPath, `${rows.join("\n")}\n`, { mode: 0o600 });
    console.log(`[parent-access] generated ${result.distribution.length} codes to ${csvPath}`);
  } else {
    console.log(`[parent-access] ensured ${result.created} parent access code(s)`);
  }
}

main()
  .catch((err) => {
    console.error("[parent-access] backfill failed:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
