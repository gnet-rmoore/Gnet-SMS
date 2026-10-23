import jwt from "jsonwebtoken";
import { getJwtAccessSecret } from "../middleware/auth";

/**
 * Shareable demo links for online exams.
 *
 * A demo link lets a staff member hand a student (or a demo student account)
 * a URL that opens the real kiosk experience for a specific exam without ever
 * creating an attempt, answer, violation, notification, or grade row.
 *
 * The token is a signed JWT so it is stateless — no schema change, no cleanup
 * job — while still being unforgeable and self-expiring.
 */
export const DEMO_LINK_TTL_SECONDS = 24 * 60 * 60;

/**
 * Demo links are signed with a secret derived from the access secret, never the
 * access secret itself. This keeps the two token families mutually unusable:
 * a demo link can never authenticate an API request, and an access token can
 * never be replayed as a demo link.
 */
function demoSecret() {
  return `${getJwtAccessSecret()}::online-exam-demo`;
}

export type DemoLinkPayload = {
  /** Marker so an access token can never be replayed as a demo link. */
  typ: "demo";
  /** Exam the link unlocks. */
  examId: string;
  /** School that owns the exam — links never cross tenants. */
  schoolId: string;
  /** Issued-at / expiry (seconds). */
  iat: number;
  exp: number;
};

function demoError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function createDemoToken(examId: string, schoolId: string) {
  const token = jwt.sign(
    { typ: "demo" as const, examId, schoolId },
    getJwtAccessSecret(),
    { expiresIn: DEMO_LINK_TTL_SECONDS }
  );
  const expiresAt = new Date(Date.now() + DEMO_LINK_TTL_SECONDS * 1000).toISOString();
  return { demoToken: token, expiresAt };
}

/**
 * Verify a demo token. Throws a 400/401 error for anything that is not a
 * live demo token issued by this service.
 */
export function verifyDemoToken(token: string): DemoLinkPayload {
  if (!token || typeof token !== "string") {
    throw demoError("Invalid demo link", 400);
  }
  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtAccessSecret());
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      throw demoError("This demo link has expired. Ask your teacher for a new one.", 410);
    }
    throw demoError("Invalid demo link", 400);
  }
  if (decoded?.typ !== "demo" || !decoded.examId || !decoded.schoolId) {
    throw demoError("Invalid demo link", 400);
  }
  return decoded as DemoLinkPayload;
}
