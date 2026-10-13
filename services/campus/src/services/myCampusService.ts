import prisma from "../lib/prisma";
import { getSchoolEntitlements, hasEntitlement } from "../lib/entitlements";
import { getStudentTransportSummary } from "../lib/opsClient";
import { getIdentityStudentName } from "../lib/identityClient";

function loanStatus(dueAt: Date, returnedAt: Date | null, status: string) {
  if (returnedAt || status === "RETURNED") return "RETURNED";
  if (dueAt.getTime() < Date.now()) return "OVERDUE";
  return "OUT";
}

export const myCampusService = {
  async getSummary(schoolId: string, studentId: string) {
    const entitlements = await getSchoolEntitlements(schoolId);
    const studentName = await getIdentityStudentName(schoolId, studentId);

    const transportEnabled = hasEntitlement(entitlements, "transport");
    const libraryEnabled = hasEntitlement(entitlements, "library");
    const clinicEnabled = hasEntitlement(entitlements, "clinic");
    const hostelEnabled = hasEntitlement(entitlements, "hostel");

    const [transport, libraryLoans, healthProfile, clinicVisits, hostelAssignment] =
      await Promise.all([
        transportEnabled ? getStudentTransportSummary(schoolId, studentId) : Promise.resolve(null),
        libraryEnabled
          ? prisma.libraryLoan.findMany({
              where: { schoolId, studentId, returnedAt: null },
              include: { item: true },
              orderBy: { dueAt: "asc" },
            })
          : Promise.resolve([]),
        clinicEnabled
          ? prisma.studentHealthProfile.findFirst({ where: { schoolId, studentId } })
          : Promise.resolve(null),
        clinicEnabled
          ? prisma.clinicVisit.findMany({
              where: { schoolId, studentId },
              orderBy: { visitDate: "desc" },
              take: 10,
            })
          : Promise.resolve([]),
        hostelEnabled
          ? prisma.hostelAssignment.findFirst({
              where: { schoolId, studentId, status: "ACTIVE" },
              include: { room: { include: { building: true } } },
            })
          : Promise.resolve(null),
      ]);

    return {
      studentId,
      studentName,
      transport: {
        enabled: transportEnabled,
        data: transport,
      },
      library: {
        enabled: libraryEnabled,
        data: {
          loans: libraryLoans.map((loan) => ({
            id: loan.id,
            title: loan.item?.title || "Unknown title",
            status: loanStatus(loan.dueAt, loan.returnedAt, loan.status),
            dueAt: loan.dueAt.toISOString(),
            loanedAt: loan.loanedAt.toISOString(),
          })),
        },
      },
      clinic: {
        enabled: clinicEnabled,
        data: {
          healthProfile: healthProfile
            ? {
                bloodType: healthProfile.bloodType,
                allergies: healthProfile.allergies,
                emergencyContact: healthProfile.emergencyContact,
              }
            : null,
          recentVisits: clinicVisits.map((v) => ({
            id: v.id,
            visitDate: v.visitDate.toISOString(),
            reason: v.reason,
            disposition: v.disposition,
            parentNotified: v.parentNotified,
          })),
        },
      },
      hostel: {
        enabled: hostelEnabled,
        data: hostelAssignment
          ? {
              building: hostelAssignment.room.building.name,
              room: hostelAssignment.room.label,
              checkIn: hostelAssignment.checkIn.toISOString(),
            }
          : null,
      },
    };
  },
};
