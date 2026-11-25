/**
 * Mail provider registry smoke tests.
 * Run: npm run test:email-providers
 */
import { readFileSync } from "node:fs";
import { consoleProvider } from "../services/identity/src/lib/mailProviders/console.ts";
import { MAIL_PROVIDERS, resolveMailProvider } from "../services/identity/src/lib/mailProviders/index.ts";
import { sendMail } from "../services/identity/src/lib/mailer.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const prev = process.env.EMAIL_PROVIDER;

assert(MAIL_PROVIDERS.length === 6, "six providers including console");
assert(MAIL_PROVIDERS.includes("smtp"), "includes smtp");
assert(MAIL_PROVIDERS.includes("sendgrid"), "includes sendgrid");
assert(MAIL_PROVIDERS.includes("ses"), "includes ses");
assert(MAIL_PROVIDERS.includes("mailgun"), "includes mailgun");
assert(MAIL_PROVIDERS.includes("resend"), "includes resend");

process.env.EMAIL_PROVIDER = "sendgrid";
assert(resolveMailProvider().name === "sendgrid", "resolves sendgrid");

process.env.EMAIL_PROVIDER = "unknown";
assert(resolveMailProvider().name === "console", "unknown falls back to console");

process.env.EMAIL_PROVIDER = "console";

const mailerSource = readFileSync(
  new URL("../services/identity/src/lib/mailer.ts", import.meta.url),
  "utf8"
);
assert(
  mailerSource.includes('msg.sensitive && provider.name === "console"'),
  "sensitive mail is not reported delivered through console"
);
assert(
  mailerSource.includes('provider.name === "console" || msg.sensitive'),
  "sensitive mail does not fall back to console"
);

const originalLog = console.log;
const logs: string[] = [];
console.log = (...args: unknown[]) => {
  logs.push(args.map((arg) => String(arg)).join(" "));
};
try {
  const direct = await consoleProvider.send({
    to: "parent@example.com",
    subject: "Access code",
    text: "Your code is 123456",
    sensitive: true,
  });
  const sensitive = await sendMail({
    to: "parent@example.com",
    subject: "Access code",
    text: "Your code is 654321",
    sensitive: true,
  });
  const plain = await sendMail({
    to: "parent@example.com",
    subject: "Notice",
    text: "plain body",
  });
  assert(direct.ok, "console provider accepts a sensitive message");
  assert(
    Boolean(logs[0]?.includes("[redacted sensitive email]")) && !logs[0]?.includes("123456"),
    "console provider redacts sensitive body"
  );
  assert(!sensitive.ok, "sendMail does not report sensitive console mail as delivered");
  assert(
    Boolean(logs[1]?.includes("[redacted sensitive email]")) && !logs[1]?.includes("654321"),
    "sendMail redacts sensitive body"
  );
  assert(plain.ok, "plain console mail still succeeds");
  assert(Boolean(logs[2]?.includes("plain body")), "plain console mail still logs body");
} finally {
  console.log = originalLog;
}

if (prev === undefined) delete process.env.EMAIL_PROVIDER;
else process.env.EMAIL_PROVIDER = prev;

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll email-providers tests passed.");
