#!/usr/bin/env npx tsx
/**
 * One-time repair: reset assessments to follow the live school template.
 * Run: npx tsx scripts/migrate-gradebook-structure-custom.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE academic."ExamComponent"
    SET "gradebookStructureCustom" = false
    WHERE "gradebookStructureCustom" IS DISTINCT FROM true
       OR "gradebookStructureCustom" IS NULL
  `);

  console.log(`Reset gradebookStructureCustom on ${result} assessment row(s).`);
  console.log(
    "Re-save Settings → Grading → Structure (or POST …/sync-structure-template) per school."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
