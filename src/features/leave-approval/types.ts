export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveStaff {
  id: string;
  name: string;
  role: string;
  email?: string;
  photoUrl?: string | null;
}

export interface LeaveRequest {
  id: string;
  schoolId: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus | string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: LeaveStaff | null;
  approver?: LeaveStaff | null;
}
