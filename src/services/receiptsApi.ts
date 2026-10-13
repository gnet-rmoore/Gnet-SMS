import { useAuthStore } from "../store/authStore";

export type ReceiptType = "FEE_PAYMENT" | "EXPENSE" | "PAYSLIP" | "TRANSACTION";

export interface ReceiptRecord {
  id: string;
  receiptNumber?: string;
  type?: ReceiptType | string;
  status?: string;
  [key: string]: unknown;
}

type JsonRecord = { error?: string; message?: string };

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function downloadBlob(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = "/login?expired=true";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as JsonRecord;
    throw new Error(body.error || body.message || "Download failed");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export const receiptsApi = {
  list: async (
    schoolId: string,
    opts?: { type?: string; sourceId?: string; status?: string }
  ): Promise<ReceiptRecord[]> => {
    const params = new URLSearchParams();
    if (opts?.type) params.set("type", opts.type);
    if (opts?.sourceId) params.set("sourceId", opts.sourceId);
    if (opts?.status) params.set("status", opts.status);
    const qs = params.toString();
    const res = await fetch(`/api/schools/${schoolId}/receipts${qs ? `?${qs}` : ""}`, {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as JsonRecord;
      throw new Error(body.error || "Failed to list receipts");
    }
    return res.json();
  },

  issue: async (
    schoolId: string,
    body: { type: string; sourceId: string } & Record<string, unknown>
  ): Promise<ReceiptRecord> => {
    const res = await fetch(`/api/schools/${schoolId}/receipts/issue`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as JsonRecord;
      throw new Error(data.error || "Failed to issue receipt");
    }
    return res.json();
  },

  download: async (receiptId: string, receiptNumber?: string): Promise<void> => {
    await downloadBlob(
      `/api/receipts/${receiptId}/download`,
      `receipt-${receiptNumber || receiptId.slice(0, 8)}.pdf`
    );
  },

  downloadForSource: async (
    schoolId: string,
    type: ReceiptType,
    sourceId: string,
    extra?: Record<string, unknown>
  ): Promise<ReceiptRecord> => {
    const list = await receiptsApi.list(schoolId, { type, sourceId, status: "ISSUED" });
    let receipt: ReceiptRecord | null = Array.isArray(list) ? list[0] : null;
    if (!receipt) {
      if (type === "FEE_PAYMENT" || type === "EXPENSE") {
        receipt = await receiptsApi.issue(schoolId, { type, sourceId });
      } else if ((type === "PAYSLIP" || type === "TRANSACTION") && extra) {
        receipt = await receiptsApi.issue(schoolId, { type, sourceId, ...extra });
      }
    }
    if (!receipt?.id) throw new Error("Official receipt is not available yet");
    await receiptsApi.download(receipt.id, receipt.receiptNumber);
    return receipt;
  },

  verifyPublic: async (code: string): Promise<unknown> => {
    const res = await fetch(`/api/public/receipts/verify/${encodeURIComponent(code)}`);
    const data = (await res.json().catch(() => ({}))) as JsonRecord;
    if (!res.ok) throw new Error(data.error || "Verification failed");
    return data;
  },
};
