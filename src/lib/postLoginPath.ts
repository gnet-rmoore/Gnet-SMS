import type { AuthUser } from "../store/authStore";

type SchoolLike = { slug?: string; status?: string } | null | undefined;

const CODE_AUTH_METHODS = new Set(["ACCESS_CODE", "PHONE_OTP"]);

export function requiresPasswordChange(user: AuthUser): boolean {
  if (!user.mustChangePassword) return false;
  const authMethod = String(user.authMethod || "PASSWORD").toUpperCase();
  return !CODE_AUTH_METHODS.has(authMethod);
}

/** Where to send the user immediately after a successful sign-in. */
export function getPostLoginPath(user: AuthUser, school?: SchoolLike): string {
  if (requiresPasswordChange(user)) return "/change-password-required";
  if (user.role === "SUPER_ADMIN") return "/super-admin";
  if (school?.slug) return `/${school.slug}/dashboard`;
  return "/login";
}
