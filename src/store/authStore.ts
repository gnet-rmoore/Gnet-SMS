import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  platformRole?: string | null;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  dob?: string | null;
  preferredLocale?: string | null;
  /** When true, user must set a new password before using the app. */
  mustChangePassword?: boolean;
}

interface School {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  address?: string | null;
  country?: string;
  timezone: string;
  defaultLocale?: string;
  gradeSheetTemplate?: string;
  reportCardTemplate?: string;
  certificateTemplate?: string;
  certificateDefaults?: {
    sig1Name?: string;
    sig1Title?: string;
    sig2Name?: string;
    sig2Title?: string;
    sig1UserId?: string;
    sig2UserId?: string;
  } | null;
  documentSignatories?: Record<string, { userId?: string } | string> | string | null;
  brandColor?: string;
  /** Set when School Admin marks setup complete (Identity). */
  onboardingComplete?: boolean;
  status?: string;
  trialEndsAt?: string | null;
  gradebookConfig?: string | null;
  payrollAttendanceRules?: {
    enabled?: boolean;
    graceMinutes?: number;
    deductionPerMissingDay?: number;
    deductionPerLate?: number;
    blockNonInstructionalRollCall?: boolean;
    publishRollCallToCalendar?: boolean;
  };
  securityPolicy?: {
    passwordMinLength?: number;
    requireStrongPassword?: boolean;
    sessionIdleMinutes?: number;
    forcePasswordChangeDays?: number;
  };
  guideRequired?: boolean;
  receiptTemplate?: string;
  receiptTemplates?: Record<string, string> | string | null;
}

type ImpersonationMeta = {
  reason: string;
  expiresAt: string;
  targetName: string;
};

type SessionSnapshot = {
  user: AuthUser;
  accessToken: string;
  school: School | null;
  capabilities: string[] | null;
  entitlements: string[] | null;
  quotas: QuotaShape | null;
};

export type QuotaShape = {
  maxStudents: number | null;
  maxStaff: number | null;
  maxStorageMb: number | null;
};

interface AuthState {
  user: AuthUser | null;
  school: School | null;
  accessToken: string | null;
  capabilities: string[] | null;
  entitlements: string[] | null;
  quotas: QuotaShape | null;
  impersonation: ImpersonationMeta | null;
  setAuth: (
    user: AuthUser,
    accessToken: string,
    school?: School | null,
    capabilities?: string[] | null,
    entitlements?: string[] | null,
    quotas?: QuotaShape | null
  ) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  setCapabilities: (capabilities: string[] | null) => void;
  setEntitlements: (entitlements: string[] | null, quotas?: QuotaShape | null) => void;
  setSchool: (school: School) => void;
  beginImpersonation: (payload: {
    accessToken: string;
    user: AuthUser;
    school: School;
    capabilities?: string[] | null;
    entitlements?: string[] | null;
    quotas?: QuotaShape | null;
    reason: string;
    expiresAt: string;
  }) => void;
  endImpersonation: () => void;
  logout: () => void;
}

const BACKUP_KEY = "sms-sa-session-backup";

export function partializeAuthState(state: AuthState) {
  const user = state.user
    ? (() => {
        const { photoUrl: _p, signatureUrl: _s, ...rest } = state.user;
        return rest;
      })()
    : null;
  return {
    user,
    school: state.school,
    accessToken: state.accessToken,
    capabilities: state.capabilities,
    entitlements: state.entitlements,
    quotas: state.quotas,
    impersonation: state.impersonation,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      school: null,
      accessToken: null,
      capabilities: null,
      entitlements: null,
      quotas: null,
      impersonation: null,
      setAuth: (user, accessToken, school, capabilities, entitlements, quotas) =>
        set((state) => ({
          user,
          accessToken,
          school: school === undefined ? state.school : school,
          capabilities:
            capabilities === undefined ? state.capabilities : capabilities,
          entitlements:
            entitlements === undefined ? state.entitlements : entitlements,
          quotas: quotas === undefined ? state.quotas : quotas,
        })),
      updateUser: (patch) =>
        set((state) => {
          if (!state.user) return state;
          return { user: { ...state.user, ...patch } };
        }),
      setCapabilities: (capabilities) => set({ capabilities }),
      setEntitlements: (entitlements, quotas) =>
        set((state) => ({
          entitlements,
          quotas: quotas === undefined ? state.quotas : quotas,
        })),
      setSchool: (school) => set({ school }),
      beginImpersonation: (payload) => {
        const cur = get();
        if (cur.user && cur.accessToken) {
          const backup: SessionSnapshot = {
            user: cur.user,
            accessToken: cur.accessToken,
            school: cur.school,
            capabilities: cur.capabilities,
            entitlements: cur.entitlements,
            quotas: cur.quotas,
          };
          try {
            sessionStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
          } catch {
            /* ignore */
          }
        }
        set({
          user: payload.user,
          accessToken: payload.accessToken,
          school: payload.school,
          capabilities: payload.capabilities ?? null,
          entitlements: payload.entitlements ?? null,
          quotas: payload.quotas ?? null,
          impersonation: {
            reason: payload.reason,
            expiresAt: payload.expiresAt,
            targetName: payload.user.name,
          },
        });
      },
      endImpersonation: () => {
        try {
          const raw = sessionStorage.getItem(BACKUP_KEY);
          sessionStorage.removeItem(BACKUP_KEY);
          if (raw) {
            const backup = JSON.parse(raw) as SessionSnapshot;
            void fetch("/api/super-admin/impersonation/end", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${backup.accessToken}`,
                "Content-Type": "application/json",
              },
            }).catch(() => undefined);
            set({
              user: backup.user,
              accessToken: backup.accessToken,
              school: backup.school,
              capabilities: backup.capabilities,
              entitlements: backup.entitlements,
              quotas: backup.quotas,
              impersonation: null,
            });
            return;
          }
        } catch {
          /* fall through */
        }
        set({ user: null, accessToken: null, school: null, capabilities: null, entitlements: null, quotas: null, impersonation: null });
      },
      logout: () => {
        try {
          sessionStorage.removeItem(BACKUP_KEY);
        } catch {
          /* ignore */
        }
        const token = get().accessToken;
        if (token) {
          void fetch("/api/auth/logout", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => undefined);
        }
        set({
          user: null,
          accessToken: null,
          school: null,
          capabilities: null,
          impersonation: null,
        });
      },
    }),
    {
      name: "sms-auth-storage",
      partialize: partializeAuthState,
    }
  )
);
