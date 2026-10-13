export type FeeStatus = "PENDING" | "PARTIAL" | "PAID" | "VOIDED" | "WRITTEN_OFF";

export interface FeeStudent {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  gradeLevelId?: string | null;
  feeCohort?: string | null;
  classroomMembers?: Array<{
    classroom?: { id: string; name: string } | null;
  }>;
}

export interface FeePayment {
  id: string;
  schoolId: string;
  studentId: string;
  applicationId?: string | null;
  amount: number;
  amountPaid?: number;
  balance?: number;
  type: string;
  status: FeeStatus | string;
  dueDate: string;
  paidAt?: string | null;
  notes?: string | null;
  templateId?: string | null;
  scopeSnapshot?: string | null;
  schoolYearKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
  student?: FeeStudent;
}

export interface FeePaymentTxn {
  id: string;
  kind: string;
  schoolId?: string;
  feePaymentId: string;
  studentId: string;
  studentName?: string;
  feeType?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  billedAmount?: number | null;
  invoiceStatusBefore?: string | null;
  invoiceStatusAfter?: string | null;
  method: string;
  paidAt: string;
  createdAt?: string;
  recordedBy?: string | null;
  recordedByName?: string;
  recordedByRole?: string | null;
  payerUserId?: string | null;
  payerName?: string | null;
  notes?: string | null;
  receiptId?: string | null;
  checkoutSessionId?: string | null;
}

export interface FeeTemplate {
  id: string;
  schoolId?: string;
  name: string;
  type: string;
  amount: number;
  description: string;
  scopeMode?: "SCHOOL" | "GRADE" | "DIVISION" | string;
  gradeLevelId?: string | null;
  divisionId?: string | null;
  cohort?: "ALL" | "NEW" | "RETURNING" | string;
  schoolYearKey?: string | null;
}

export const FEE_TYPES = [
  { value: "TUITION", label: "Tuition" },
  { value: "EXAM", label: "Exam" },
  { value: "LIBRARY", label: "Library" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "ENTRANCE", label: "Entrance" },
  { value: "OTHER", label: "Other" },
] as const;

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  TUITION: "#6366F1",
  EXAM: "#3B82F6",
  LIBRARY: "#10B981",
  TRANSPORT: "#F59E0B",
  ENTRANCE: "#0EA5E9",
  OTHER: "#8B5CF6",
};

export function formatFeeType(type: string): string {
  return (type || "OTHER").replace(/_/g, " ");
}

export function feeAmountPaid(fee: Pick<FeePayment, "amount" | "amountPaid" | "status">): number {
  const paid = Number(fee.amountPaid || 0);
  if ((fee.status === "PAID" || fee.status === "WRITTEN_OFF") && paid <= 0) {
    return Number(fee.amount) || 0;
  }
  return paid;
}

export function isFeeOpen(fee: Pick<FeePayment, "status">): boolean {
  return fee.status === "PENDING" || fee.status === "PARTIAL";
}

export function isFeeOverdue(
  fee: Pick<FeePayment, "dueDate" | "status">,
  now = new Date()
): boolean {
  return isFeeOpen(fee) && new Date(fee.dueDate) < now;
}

export function displayFeeStatus(fee: Pick<FeePayment, "dueDate" | "status">): string {
  if (fee.status === "PAID") return "PAID";
  if (fee.status === "WRITTEN_OFF") return "WRITTEN_OFF";
  if (fee.status === "VOIDED") return "VOIDED";
  if (fee.status === "PARTIAL") return isFeeOverdue(fee) ? "OVERDUE" : "PARTIAL";
  return isFeeOverdue(fee) ? "OVERDUE" : "PENDING";
}

/** Maps display/API status codes to `pages.fees.status.*` i18n keys. */
export function feeStatusI18nKey(status: string): string {
  switch (status) {
    case "PAID":
      return "paid";
    case "PARTIAL":
      return "partial";
    case "PENDING":
      return "pending";
    case "OVERDUE":
      return "overdue";
    case "VOIDED":
      return "voided";
    case "WRITTEN_OFF":
      return "writtenOff";
    default:
      return "pending";
  }
}

export function feeBalance(
  fee: Pick<FeePayment, "amount" | "amountPaid" | "status" | "balance">
): number {
  if (fee.status === "PAID" || fee.status === "VOIDED" || fee.status === "WRITTEN_OFF") {
    return 0;
  }
  if (typeof fee.balance === "number" && Number.isFinite(fee.balance)) {
    return Math.max(0, fee.balance);
  }
  return Math.max(0, Number(fee.amount) - feeAmountPaid(fee));
}
