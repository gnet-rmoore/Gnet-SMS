import { api } from "../../services/api";

export type SchoolUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  photoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SchoolUsersPayload = {
  total: number;
  limit: number;
  offset: number;
  users: SchoolUserRow[];
};

export type RoleAuditRow = {
  id: string;
  schoolId: string;
  targetUserId: string;
  actorUserId: string;
  fromRole: string;
  toRole: string;
  createdAt: string;
  targetName?: string | null;
  targetEmail?: string | null;
  actorName?: string | null;
};

export type CapabilityDef = {
  key: string;
  label: string;
  category: string;
  lockedForSchoolAdmin?: boolean;
};

export type CapabilityOverride = {
  capabilityKey: string;
  allowed: boolean;
};

export type RoleCapabilityMatrix = {
  catalog: CapabilityDef[];
  lockedKeysForSchoolAdmin: string[];
  roles: Record<
    string,
    {
      defaults: string[];
      overrides: CapabilityOverride[];
      effective: string[];
    }
  >;
};

export type AuthSessionPayload = {
  accessToken: string;
  user: SchoolUserRow & { mustChangePassword?: boolean };
  school: unknown;
  capabilities: string[];
  entitlements?: string[] | null;
  quotas?: { maxStudents: number | null; maxStaff: number | null; maxStorageMb: number | null } | null;
};

export const roleAccessApi = {
  listUsers: (schoolId: string, params?: { q?: string; role?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.role) qs.set("role", params.role);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : "";
    return api.get(`/api/schools/${schoolId}/users${suffix}`) as Promise<SchoolUsersPayload>;
  },

  changeRole: (userId: string, role: string) =>
    api.patch(`/api/users/${userId}/role`, { role }) as Promise<SchoolUserRow>,

  listAudit: (schoolId: string, limit = 40) =>
    api.get(`/api/schools/${schoolId}/role-audit?limit=${limit}`) as Promise<RoleAuditRow[]>,

  getCapabilityMatrix: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/role-capabilities`) as Promise<RoleCapabilityMatrix>,

  saveRoleCapabilities: (schoolId: string, role: string, overrides: CapabilityOverride[]) =>
    api.put(`/api/schools/${schoolId}/role-capabilities/${encodeURIComponent(role)}`, {
      overrides,
    }) as Promise<RoleCapabilityMatrix>,

  refreshSession: () => api.get(`/api/auth/me`) as Promise<AuthSessionPayload>,
};
