/**
 * Classify sign-in failures into friendly, user-facing cases.
 *
 * The login page should never surface raw system text (status codes, "Internal
 * server error", gateway HTML, …). Instead it classifies the failure into a
 * `LoginErrorSignal`, which `LoginErrorAlert` renders as plain-language copy
 * (title / message / next step) in the active locale.
 */

export type LoginErrorCase =
  | "invalid"
  | "form"
  | "notVerified"
  | "inactive"
  | "forbidden"
  | "rateLimited"
  | "down"
  | "notFound"
  | "maintenance"
  | "offline"
  | "warming"
  | "mfa"
  | "mfaEnroll"
  | "noSchool"
  | "code"
  | "generic";

export type LoginErrorSignal = {
  case: LoginErrorCase;
  /** Backend error code, kept for the `code` case so it can be translated on render. */
  code?: string | null;
};

export type LoginErrorInput = {
  status?: number | null;
  code?: string | null;
  kind?: "network" | "warming" | "bad-response" | "no-school";
  mfa?: boolean;
};

/** Backend codes that map to a dedicated, tailored screen. */
const KNOWN_CODE_CASES: Record<string, LoginErrorCase> = {
  INVALID_CREDENTIALS: "invalid",
  EMAIL_NOT_VERIFIED: "notVerified",
  ACCOUNT_INACTIVE: "inactive",
  FORBIDDEN: "forbidden",
  RATE_LIMITED: "rateLimited",
  MAINTENANCE_MODE: "maintenance",
  MFA_ENROLLMENT_REQUIRED: "mfaEnroll",
  VALIDATION: "form",
  USE_SUPER_ADMIN_LOGIN: "code",
};

export function classifyLoginError(input: LoginErrorInput): LoginErrorSignal {
  const { status = null, code = null, kind, mfa = false } = input;

  if (kind === "network") return { case: "offline" };
  if (kind === "warming") return { case: "warming" };
  if (kind === "no-school") return { case: "noSchool" };
  if (kind === "bad-response") return { case: status === 404 ? "notFound" : "down" };

  if (code) {
    const mapped = KNOWN_CODE_CASES[code];
    if (mapped) return { case: mapped, code };
  }

  if (status === 429) return { case: "rateLimited" };
  if (status !== null && status >= 500) return { case: "down" };
  if (status === 404) return { case: "notFound" };
  if (mfa && (status === 400 || status === 401)) return { case: "mfa" };
  if (status === 401) return { case: "invalid" };
  if (status === 400) return { case: "form" };
  if (status === 403) return { case: "inactive" };

  if (code) return { case: "code", code };
  return { case: "generic" };
}

/** Attach a pre-classified signal to a throwable so `catch` can recover it intact. */
export function loginErrorSignal(signal: LoginErrorSignal): Error {
  return Object.assign(new Error("login_error"), { loginError: signal });
}

function isSignal(value: unknown): value is LoginErrorSignal {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as LoginErrorSignal).case === "string"
  );
}

/**
 * Recover a signal from anything thrown during the sign-in flow: our own
 * carried signal, an error carrying a status/code, a network failure, or an
 * otherwise-unknown error.
 */
export function extractLoginErrorSignal(
  err: unknown,
  opts: { mfa?: boolean } = {}
): LoginErrorSignal {
  if (err && typeof err === "object") {
    const carried = (err as { loginError?: unknown }).loginError;
    if (isSignal(carried)) return carried;

    const e = err as { status?: unknown; code?: unknown; kind?: unknown };
    if (
      typeof e.status === "number" ||
      typeof e.code === "string" ||
      e.kind === "network" ||
      e.kind === "warming" ||
      e.kind === "bad-response" ||
      e.kind === "no-school"
    ) {
      return classifyLoginError({
        status: typeof e.status === "number" ? e.status : null,
        code: typeof e.code === "string" ? e.code : null,
        kind: e.kind as LoginErrorInput["kind"],
        mfa: opts.mfa,
      });
    }
  }

  if (err instanceof TypeError) return { case: "offline" };
  return { case: "generic" };
}
