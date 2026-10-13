/**
 * Typed event catalog for inter-service async messaging (roadmap §5).
 * Stub only — no BullMQ / Redis Streams wiring yet.
 */

// --- Event names ---

export const EventNames = {
  UserCreated: "user.created",
  UserUpdated: "user.updated",
  UserDeleted: "user.deleted",
  SchoolUpdated: "school.updated",
  ExamResultsReleased: "exam.results-released",
  AttendanceRecorded: "attendance.recorded",
  FeeCollected: "fee.collected",
  FeeOverdue: "fee.overdue",
  LeaveRequestApproved: "leave-request.approved",
  LeaveRequestRejected: "leave-request.rejected",
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];

// --- Payloads ---

/** Identity → Academic, Classroom, Staff, Finance */
export interface UserCreatedPayload {
  id: string;
  name: string;
  role: string;
  schoolId: string;
}

export type UserUpdatedPayload = UserCreatedPayload;

export type UserDeletedPayload = UserCreatedPayload;

/** Identity → all services (e.g. tenant suspended) */
export interface SchoolUpdatedPayload {
  schoolId: string;
  status: string;
}

/** Academic → Comms (report-card email/push) */
export interface ExamResultsReleasedPayload {
  examId: string;
  schoolId: string;
  classroomIds: string[];
}

/** Lifecycle → Comms (absence notification) */
export interface AttendanceRecordedPayload {
  studentId: string;
  status: string;
  date: string;
}

/** Finance → Comms (receipt / reminder) */
export interface FeeCollectedPayload {
  feeId: string;
  studentId: string;
  amount: number;
  dueDate: string;
}

export type FeeOverduePayload = FeeCollectedPayload;

/** Staff → Comms */
export interface LeaveRequestApprovedPayload {
  requestId: string;
  staffId: string;
  status: string;
}

export type LeaveRequestRejectedPayload = LeaveRequestApprovedPayload;

// --- Map event name → payload ---

export interface EventPayloadMap {
  "user.created": UserCreatedPayload;
  "user.updated": UserUpdatedPayload;
  "user.deleted": UserDeletedPayload;
  "school.updated": SchoolUpdatedPayload;
  "exam.results-released": ExamResultsReleasedPayload;
  "attendance.recorded": AttendanceRecordedPayload;
  "fee.collected": FeeCollectedPayload;
  "fee.overdue": FeeOverduePayload;
  "leave-request.approved": LeaveRequestApprovedPayload;
  "leave-request.rejected": LeaveRequestRejectedPayload;
}

export type DomainEvent<E extends EventName = EventName> = {
  name: E;
  payload: EventPayloadMap[E];
  occurredAt: string;
};
