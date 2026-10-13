import { apiFetch, expectStatus } from "./http.ts";
import { FIXTURES, type SeededRole } from "./fixtures.ts";

export type AuthSession = {
  accessToken: string;
  user: { id: string; email: string; role: string; name?: string };
  school: { id: string; slug: string; name?: string } | null;
  capabilities?: string[];
};

const cache = new Map<string, AuthSession>();

export async function loginAs(role: SeededRole): Promise<AuthSession> {
  const cached = cache.get(role);
  if (cached) return cached;

  const creds = FIXTURES.users[role];
  if (role === "superAdmin") {
    const res = await apiFetch("/api/super-admin/auth/login", {
      method: "POST",
      body: { email: creds.email, password: FIXTURES.password },
    });
    expectStatus(res, 200, `super-admin login ${creds.email}`);
    const data = res.json as AuthSession;
    if (!data?.accessToken) throw new Error("super-admin login missing accessToken");
    cache.set(role, data);
    return data;
  }

  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    body: { email: creds.email, password: FIXTURES.password },
  });
  expectStatus(res, 200, `login ${creds.email}`);
  const data = res.json as AuthSession;
  if (!data?.accessToken) throw new Error(`login missing accessToken for ${creds.email}`);
  if (!data.school?.id) throw new Error(`login missing school for ${creds.email}`);
  cache.set(role, data);
  return data;
}

export function clearAuthCache() {
  cache.clear();
}
