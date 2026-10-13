/**
 * Comms notification email helpers (no DB).
 * Run: npm run test:notification-email
 */
import {
  appBaseUrl,
  buildNotificationEmail,
  escapeHtml,
} from "../services/comms/src/services/notificationEmailService.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const prevAppUrl = process.env.APP_URL;
process.env.APP_URL = "http://localhost:8080/";

assert(escapeHtml(`a & b <c> "d"`) === "a &amp; b &lt;c&gt; &quot;d&quot;", "escapeHtml");
assert(appBaseUrl() === "http://localhost:8080", "appBaseUrl trims trailing slash");

const built = buildNotificationEmail({
  title: "Fee reminder",
  body: "Your fee is due",
  href: "/fees",
});
assert(built.subject === "Fee reminder", "buildNotificationEmail subject");
assert(built.text.includes("http://localhost:8080/fees"), "buildNotificationEmail text link");
assert(built.html.includes("Your fee is due"), "buildNotificationEmail html body");
assert(built.html.includes("View in SMS"), "buildNotificationEmail html CTA");

process.env.APP_URL = prevAppUrl;

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll notification-email tests passed.");
