import prisma from "../lib/prisma";
import {
  defaultPrefsForSchool,
  isKnownEventKey,
  normalizeCustomEventKey,
  type NotificationPref,
} from "../lib/notificationPrefs";

type PrefInput = {
  eventKey: string;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  label?: string | null;
  description?: string | null;
};

function toPref(
  eventKey: string,
  emailEnabled: boolean,
  inAppEnabled: boolean,
  label?: string | null,
  description?: string | null
): NotificationPref {
  const isCustom = !isKnownEventKey(eventKey);
  return {
    eventKey,
    emailEnabled,
    inAppEnabled,
    label: label ?? null,
    description: description ?? null,
    isCustom,
  };
}

export const notificationPreferenceService = {
  async listForSchool(schoolId: string): Promise<NotificationPref[]> {
    const rows = await prisma.schoolNotificationPreference.findMany({
      where: { schoolId },
    });
    const byKey = new Map(rows.map((r) => [r.eventKey, r]));

    const system = defaultPrefsForSchool().map((d) => {
      const row = byKey.get(d.eventKey);
      return toPref(
        d.eventKey,
        row ? row.emailEnabled : d.emailEnabled,
        row ? row.inAppEnabled : d.inAppEnabled,
        row?.label,
        row?.description
      );
    });

    const custom = rows
      .filter((r) => !isKnownEventKey(r.eventKey))
      .sort((a, b) => a.eventKey.localeCompare(b.eventKey))
      .map((r) =>
        toPref(r.eventKey, r.emailEnabled, r.inAppEnabled, r.label, r.description)
      );

    return [...system, ...custom];
  },

  /** Missing row = enabled (safe default for existing schools). */
  async isEnabled(
    schoolId: string,
    eventKey: string,
    channel: "email" | "inApp" = "email"
  ): Promise<boolean> {
    const row = await prisma.schoolNotificationPreference.findUnique({
      where: { schoolId_eventKey: { schoolId, eventKey } },
    });
    if (!row) return true;
    return channel === "email" ? row.emailEnabled : row.inAppEnabled;
  },

  async upsertMany(schoolId: string, prefs: PrefInput[]): Promise<NotificationPref[]> {
    for (const pref of prefs) {
      const rawKey = String(pref.eventKey || "").trim();
      if (!rawKey) continue;

      const isSystem = isKnownEventKey(rawKey);
      const eventKey = isSystem ? rawKey : normalizeCustomEventKey(rawKey);
      if (!eventKey) {
        throw new Error(
          `Invalid notification category key "${rawKey}". Use letters, numbers, and underscores (e.g. BUS_DELAY).`
        );
      }
      if (!isSystem) {
        const label = String(pref.label || "").trim();
        if (!label) {
          throw new Error(`Custom category ${eventKey} needs a label`);
        }
      }

      const label =
        pref.label !== undefined && pref.label !== null
          ? String(pref.label).trim() || null
          : undefined;
      const description =
        pref.description !== undefined && pref.description !== null
          ? String(pref.description).trim() || null
          : undefined;

      await prisma.schoolNotificationPreference.upsert({
        where: {
          schoolId_eventKey: { schoolId, eventKey },
        },
        create: {
          schoolId,
          eventKey,
          emailEnabled: pref.emailEnabled !== false,
          inAppEnabled: pref.inAppEnabled !== false,
          label: !isSystem ? String(pref.label || "").trim() : label ?? null,
          description: description ?? null,
        },
        update: {
          ...(pref.emailEnabled !== undefined
            ? { emailEnabled: Boolean(pref.emailEnabled) }
            : {}),
          ...(pref.inAppEnabled !== undefined
            ? { inAppEnabled: Boolean(pref.inAppEnabled) }
            : {}),
          ...(label !== undefined ? { label } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      });
    }
    return this.listForSchool(schoolId);
  },

  async removeCustom(schoolId: string, eventKeys: string[]): Promise<NotificationPref[]> {
    const keys = eventKeys
      .map((k) => normalizeCustomEventKey(String(k || "")) || String(k || "").trim())
      .filter((k) => k && !isKnownEventKey(k));
    if (keys.length) {
      await prisma.schoolNotificationPreference.deleteMany({
        where: { schoolId, eventKey: { in: keys } },
      });
    }
    return this.listForSchool(schoolId);
  },
};
