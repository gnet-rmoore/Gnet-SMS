import prisma from "../lib/prisma";
import {
  CAPABILITY_CATALOG,
  DEFAULT_ROLE_CAPABILITIES,
  LOCKED_KEYS_FOR_SCHOOL_ADMIN,
  isKnownCapability,
  mergeCapabilities,
  type CapabilityOverride,
} from "../lib/capabilities";
import { SCHOOL_ASSIGNABLE_ROLES, isSchoolAssignableRole } from "../lib/roleChange";

export const capabilityService = {
  catalog() {
    return CAPABILITY_CATALOG;
  },

  async overridesForSchool(schoolId: string, role?: string): Promise<CapabilityOverride[]> {
    const rows = await prisma.schoolRoleCapabilityOverride.findMany({
      where: {
        schoolId,
        ...(role ? { role } : {}),
      },
      select: { capabilityKey: true, allowed: true },
    });
    return rows.map((r) => ({
      capabilityKey: r.capabilityKey,
      allowed: r.allowed,
    }));
  },

  async resolveEffective(schoolId: string | null | undefined, role: string): Promise<string[]> {
    if (!role || role === "SUPER_ADMIN") {
      return CAPABILITY_CATALOG.map((c) => c.key);
    }
    if (!schoolId) {
      return mergeCapabilities(role, []);
    }
    const rows = await prisma.schoolRoleCapabilityOverride.findMany({
      where: { schoolId, role },
      select: { capabilityKey: true, allowed: true },
    });
    return mergeCapabilities(role, rows);
  },

  async getMatrix(schoolId: string) {
    const rows = await prisma.schoolRoleCapabilityOverride.findMany({
      where: { schoolId },
      select: { role: true, capabilityKey: true, allowed: true, updatedAt: true, updatedById: true },
    });
    const byRole = new Map<string, CapabilityOverride[]>();
    for (const r of rows) {
      const list = byRole.get(r.role) || [];
      list.push({ capabilityKey: r.capabilityKey, allowed: r.allowed });
      byRole.set(r.role, list);
    }

    const roles: Record<
      string,
      {
        defaults: string[];
        overrides: CapabilityOverride[];
        effective: string[];
      }
    > = {};

    for (const role of SCHOOL_ASSIGNABLE_ROLES) {
      const overrides = byRole.get(role) || [];
      roles[role] = {
        defaults: [...(DEFAULT_ROLE_CAPABILITIES[role] || [])],
        overrides,
        effective: mergeCapabilities(role, overrides),
      };
    }

    return {
      catalog: CAPABILITY_CATALOG,
      lockedKeysForSchoolAdmin: [...LOCKED_KEYS_FOR_SCHOOL_ADMIN],
      roles,
    };
  },

  /**
   * Replace all overrides for one role with the provided set.
   * Pass empty array to reset to platform defaults.
   */
  async setRoleOverrides(
    schoolId: string,
    role: string,
    overrides: CapabilityOverride[],
    actorUserId: string
  ) {
    if (!isSchoolAssignableRole(role)) {
      throw Object.assign(new Error(`Invalid role: ${role}`), { status: 400 });
    }

    const cleaned: CapabilityOverride[] = [];
    const seen = new Set<string>();
    for (const o of overrides) {
      const key = String(o?.capabilityKey || "").trim();
      if (!key || seen.has(key)) continue;
      if (!isKnownCapability(key)) {
        throw Object.assign(new Error(`Unknown capability: ${key}`), { status: 400 });
      }
      if (role === "SCHOOL_ADMIN" && LOCKED_KEYS_FOR_SCHOOL_ADMIN.includes(key) && !o.allowed) {
        throw Object.assign(
          new Error(`Cannot remove locked capability "${key}" from School Admin`),
          { status: 400 }
        );
      }
      seen.add(key);
      cleaned.push({ capabilityKey: key, allowed: Boolean(o.allowed) });
    }

    // Drop no-ops (same as default)
    const defaults = new Set(DEFAULT_ROLE_CAPABILITIES[role] || []);
    const meaningful = cleaned.filter((o) => {
      const inDefault = defaults.has(o.capabilityKey);
      return o.allowed ? !inDefault : inDefault;
    });

    await prisma.$transaction(async (tx) => {
      await tx.schoolRoleCapabilityOverride.deleteMany({ where: { schoolId, role } });
      if (meaningful.length === 0) return;
      await tx.schoolRoleCapabilityOverride.createMany({
        data: meaningful.map((o) => ({
          schoolId,
          role,
          capabilityKey: o.capabilityKey,
          allowed: o.allowed,
          updatedById: actorUserId,
        })),
      });
    });

    return this.getMatrix(schoolId);
  },
};
