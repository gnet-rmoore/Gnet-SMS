import { useAuthStore } from "../store/authStore";

/** Best “go home” target for error-page CTAs. */
export function resolveErrorHomePath(opts: {
  accessToken: string | null | undefined;
  role?: string | null;
  schoolSlug?: string | null;
}): string {
  if (!opts.accessToken) return "/";
  if (opts.role === "SUPER_ADMIN") return "/super-admin";
  if (opts.schoolSlug) return `/${opts.schoolSlug}/dashboard`;
  return "/";
}

export function useErrorHomePath(): string {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const schoolSlug = useAuthStore((s) => s.school?.slug);
  return resolveErrorHomePath({ accessToken, role, schoolSlug });
}
