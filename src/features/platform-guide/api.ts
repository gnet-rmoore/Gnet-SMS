import { api } from "../../services/api";
import type { GuideProgress, GuideStepStatus } from "./catalog";

export type GuideMeta = {
  under13: boolean;
  guideRequired: boolean;
  dob: string | null;
};

export type GuideApiResponse = {
  trackId: string | null;
  progress: GuideProgress | null;
  meta?: GuideMeta;
};

export type GuideStatsResponse = {
  schoolId: string;
  guideRequired: boolean;
  totals: {
    users: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    dismissed: number;
  };
  byRole: Array<{
    role: string;
    trackId: string | null;
    users: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    dismissed: number;
    percentComplete: number;
  }>;
};

export async function fetchGuideProgress(): Promise<GuideApiResponse> {
  return api.get("/api/users/me/guide");
}

export async function patchGuideProgress(body: {
  status?: GuideProgress["status"];
  activeStepId?: string | null;
  restart?: boolean;
  markStep?: { id: string; status: GuideStepStatus };
  steps?: Record<string, GuideStepStatus>;
  dismissedAt?: string | null;
  completedAt?: string | null;
  sendWelcomeTip?: boolean;
}): Promise<GuideApiResponse> {
  return api.patch("/api/users/me/guide", body);
}

export async function fetchGuideStats(schoolId: string): Promise<GuideStatsResponse> {
  return api.get(`/api/schools/${schoolId}/guide-stats`);
}
