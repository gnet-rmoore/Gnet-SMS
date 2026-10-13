import { api } from "../../services/api";

export type MyCampusSummary = {
  studentId: string;
  studentName?: string | null;
  transport: {
    enabled: boolean;
    data: {
      routeName: string;
      status: string;
      assignedStop: { name: string; pickupTime: string | null } | null;
      stops: { name: string; pickupTime: string | null; sortOrder: number }[];
      vehicle: { plateNumber: string; model: string } | null;
    } | null;
  };
  library: {
    enabled: boolean;
    data: {
      loans: Array<{
        id: string;
        title: string;
        status: string;
        dueAt: string;
        loanedAt: string;
      }>;
    };
  };
  clinic: {
    enabled: boolean;
    data: {
      healthProfile: {
        bloodType?: string | null;
        allergies?: string | null;
        emergencyContact?: string | null;
      } | null;
      recentVisits: Array<{
        id: string;
        visitDate: string;
        reason: string;
        disposition: string;
        parentNotified: boolean;
      }>;
    };
  };
  hostel: {
    enabled: boolean;
    data: {
      building: string;
      room: string;
      checkIn: string;
    } | null;
  };
};

export const myCampusApi = {
  fetchSummary(schoolId: string, studentId?: string) {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return api.get(`/api/schools/${schoolId}/my-campus${qs}`) as Promise<MyCampusSummary>;
  },
};
