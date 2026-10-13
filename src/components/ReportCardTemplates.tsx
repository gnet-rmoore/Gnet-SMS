import React from "react";
import { format } from "date-fns";
import type { GradeLegendLike } from "../lib/gradeLegend";
import {
  assembleReportCardPayload,
  InternationalReportCard,
  isLiberianReportCardTemplate,
  LiberianReportCardBooklet,
  resolveReportCardTemplateKey,
} from "../features/report-cards";
import type { IntlCalendarPeriod } from "../features/report-cards/components/international/shared";

interface GradeEntry {
  id: string;
  score: number;
  status: string;
  subjectId?: string;
  exam?: { title?: string; startDate?: string } | null;
  subject: { id?: string; name: string; code: string };
  classroom?: { name: string };
  examComponent?: { id?: string; label?: string; shortCode?: string | null } | null;
}

interface ReportCardProps {
  studentName: string;
  examTitle: string;
  examDate: string;
  grades: GradeEntry[];
  school: any;
  templateId: string;
  gradeLegends?: GradeLegendLike[] | null;
  attendanceRate?: number | null;
  classPosition?: string | null;
  gpa?: number | null;
  teacherComment?: string | null;
  studentId?: string;
  academicYearLabel?: string;
  calendarPeriods?: IntlCalendarPeriod[] | null;
  preview?: boolean;
  officialSignatures?: {
    principal?: { name?: string | null; signatureUrl?: string | null } | null;
    registrar?: { name?: string | null; signatureUrl?: string | null } | null;
    academic?: { name?: string | null; signatureUrl?: string | null } | null;
    vpa?: { name?: string | null; signatureUrl?: string | null } | null;
    vpi?: { name?: string | null; signatureUrl?: string | null } | null;
  } | null;
}

export const ReportCardTemplate: React.FC<ReportCardProps> = ({
  studentName,
  examTitle,
  examDate,
  grades,
  school,
  templateId,
  gradeLegends,
  attendanceRate = null,
  classPosition = null,
  gpa = null,
  teacherComment = null,
  studentId = "",
  academicYearLabel,
  calendarPeriods = null,
  preview = false,
  officialSignatures = null,
}) => {
  if (isLiberianReportCardTemplate(templateId)) {
    const payload = assembleReportCardPayload({
      templateKey: templateId,
      school: {
        id: school?.id,
        name: school?.name || "School",
        address: school?.address,
        poBox: school?.poBox,
        logoUrl: school?.logoUrl,
        brandColor: school?.brandColor,
        country: school?.country,
        county: school?.county,
        district: school?.district,
        contactPhone: school?.contactPhone,
        contactEmail: school?.contactEmail,
      },
      student: {
        id: studentId,
        name: studentName,
        sex: null,
        classLabel: grades[0]?.classroom?.name || "",
        gradeLevelLabel: grades[0]?.classroom?.name || "",
      },
      academicYearLabel:
        academicYearLabel ||
        (examDate ? format(new Date(examDate), "yyyy") : undefined),
      grades,
      gradeLegends,
    });
    if (attendanceRate != null) payload.aggregates.attendanceRate = attendanceRate;
    if (classPosition != null) payload.aggregates.classPosition = classPosition;
    if (gpa != null) payload.aggregates.gpa = gpa;
    payload.officialSignatures = officialSignatures;
    return <LiberianReportCardBooklet payload={payload} preview={preview} />;
  }

  return (
    <InternationalReportCard
      templateKey={resolveReportCardTemplateKey(templateId)}
      studentName={studentName}
      examTitle={examTitle}
      examDate={examDate || new Date().toISOString()}
      grades={grades}
      school={{
        name: school?.name,
        address: school?.address,
        logoUrl: school?.logoUrl,
        brandColor: school?.brandColor,
        contactPhone: school?.contactPhone,
        contactEmail: school?.contactEmail,
      }}
      gradeLegends={gradeLegends}
      attendanceRate={attendanceRate}
      classPosition={classPosition}
      gpa={gpa}
      teacherComment={teacherComment}
      studentId={studentId}
      academicYearLabel={academicYearLabel}
      calendarPeriods={calendarPeriods}
      preview={preview}
      officialSignatures={officialSignatures}
    />
  );
};
