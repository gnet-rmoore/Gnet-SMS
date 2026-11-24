import { assembleCertificateData } from "./assembleCertificate";
import type { CertificateData, CertificateDefaults } from "./types";

export function sampleCertificateData(
  schoolName = "Sample School",
  opts?: Partial<CertificateDefaults> & {
    logoUrl?: string | null;
    address?: string | null;
  }
): CertificateData {
  const name = schoolName.trim() || "School";
  const year = new Date().getFullYear();
  return assembleCertificateData({
    schoolName: name,
    studentName: "Sample Student",
    academicYear: opts?.academicYearDefault || `${year} — ${year + 1}`,
    issueDate:
      opts?.issueDateDefault ||
      new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    title: opts?.title,
    leadIn: opts?.leadIn,
    body: opts?.body,
    certificateId: opts?.certificateIdPrefix
      ? `${opts.certificateIdPrefix}-SAMPLE`
      : null,
    logoUrl: opts?.logoUrl,
    address: opts?.address,
    signatories: [
      {
        name: opts?.sig1Name || "School Principal",
        title: opts?.sig1Title || "School Principal",
      },
      {
        name: opts?.sig2Name || "Education Chair",
        title: opts?.sig2Title || "Education Chairman",
      },
    ],
  });
}
