export type WorkOrderStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";
export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  photoUrl?: string | null;
  isActive?: boolean;
}

export interface WorkOrderPerson {
  id: string;
  name: string;
  role?: string;
  photoUrl?: string | null;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  priority: WorkOrderPriority | string;
  status: WorkOrderStatus | string;
  location?: string | null;
  assignedTo?: string | null;
  requestedBy: string;
  schoolId: string;
  createdAt: string;
  updatedAt?: string;
  requester?: WorkOrderPerson | null;
  assignee?: WorkOrderPerson | null;
}

export interface WorkOrderForm {
  title: string;
  description: string;
  priority: string;
  location: string;
  assignedTo: string;
}

export const emptyWorkOrderForm = (): WorkOrderForm => ({
  title: "",
  description: "",
  priority: "MEDIUM",
  location: "",
  assignedTo: "",
});
