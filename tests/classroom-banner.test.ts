/**
 * Classroom banner upload configuration and UX contracts.
 * Run: npx tsx tests/classroom-banner.test.ts
 */
import { readFileSync } from "fs";
import path from "path";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const api = read("src/features/classroom-workspace/api.ts");
const page = read("src/features/classroom-workspace/RoomPage.tsx");
const storage = read("services/classroom/src/lib/storage.ts");

console.log("=========================================");
console.log(" CLASSROOM BANNER TESTS");
console.log("=========================================\n");

assert(api.includes("guessMime"), "client normalizes image MIME types");
assert(
  api.includes('"Image storage is not configured with a browser-reachable URL."'),
  "client rejects non-browser-reachable storage URLs"
);
assert(
  api.includes("Image storage must use HTTPS when the school portal uses HTTPS."),
  "client rejects mixed-content uploads"
);
assert(
  api.includes("Could not connect to image storage."),
  "network failures are translated into an actionable message"
);
assert(api.includes("request.upload.onprogress"), "upload exposes progress");
assert(
  page.includes('const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])'),
  "banner validates image type before presigning"
);
assert(page.includes("file.size > 5 * 1024 * 1024"), "banner validates image size before presigning");
assert(page.includes("setBannerUploadProgress"), "banner shows upload progress");
assert(
  page.includes("setBannerPreviewError") && page.includes("banner.previewFailed"),
  "banner shows a preview error when the uploaded image cannot load"
);
assert(storage.includes("S3_PUBLIC_URL"), "server signs against the public storage endpoint");
assert(
  storage.includes("File storage credentials are not configured."),
  "server returns a clear error when credentials are missing"
);

const envKeys = [
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_URL",
] as const;
const saved = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
for (const key of envKeys) delete process.env[key];

try {
  const { createClassroomUploadUrl } = await import(
    "../services/classroom/src/lib/storage.ts"
  );
  let message = "";
  try {
    await createClassroomUploadUrl({
      schoolId: "school-1",
      classroomId: "class-1",
      fileName: "banner.png",
      mimeType: "image/png",
    });
  } catch (error: any) {
    message = String(error?.message || "");
  }
  assert(
    /storage credentials are not configured/i.test(message),
    "presign fails fast with a configuration error when storage is unset"
  );
} finally {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All classroom banner tests passed");
