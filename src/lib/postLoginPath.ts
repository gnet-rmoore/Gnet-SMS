import type { AuthUser } from "../store/authStore";

type SchoolLike = { slug?: string; status?: string } | null | undefined;

/** Where to send the user immediately after a successful sign-in. */
export function getPostLoginPath(user: AuthUser, school?: SchoolLike): string {
  if (user.mustChangePassword) return "/change-password-required";
  if (user.role === "SUPER_ADMIN") return "/super-admin";
  if (school?.slug) return `/${school.slug}/dashboard`;
  return "/login";
}
