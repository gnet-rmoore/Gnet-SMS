import type { CertificateData } from "./types";

/** Sample payload for Settings preview — uses live school branding when provided. */
export function sampleCertificateData(
  schoolName = "Greendale Academy",
  opts?: {
    address?: string | null;
    logoUrl?: string | null;
    brandColor?: string | null;
  }
): CertificateData {
  const name = schoolName.trim() || "Greendale Academy";
  return {
    school: {
      name,
      logoUrl: opts?.logoUrl ?? null,
      address: (opts?.address || "").trim() || "14 Independence Avenue",
    },
    brandColor: opts?.brandColor ?? null,
    title: "CERTIFICATE OF COMPLETION",
    leadIn: "THIS CERTIFIES THAT",
    studentName: "SAMPLE STUDENT",
    body: `has completed the prescribed course of study at ${name}.`,
    issueDate: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    academicYear: "2025 — 2026",
    signatories: [
      { name: "School Principal", title: "School Principal" },
      { name: "Education Chair", title: "Education Chairman" },
    ],
  };
}
