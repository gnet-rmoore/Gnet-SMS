import React from "react";
import type { IntlReportProps } from "../../report-cards/components/international/shared";
import { InternationalReportCard } from "../../report-cards/components/international/InternationalReportCard";
import type { GradeSheetData } from "../types";

type Props = {
  data: GradeSheetData;
  variant: "INTL_STANDARD_TERM" | "INTL_EXECUTIVE";
  compact?: boolean;
};

export function AcademicSummaryGradeSheet({ data, variant, compact }: Props) {
  const grades = data.subjects
    .filter((subject) => typeof subject.total === "number")
    .map((subject, index) => ({
      id: `${subject.code || subject.name}-${index}`,
      score: subject.total as number,
      status: (subject.remark || "RELEASED").toUpperCase(),
      subject: {
        id: subject.code || subject.name,
        name: subject.name,
        code: subject.code || subject.name.slice(0, 3).toUpperCase(),
      },
      classroom: { name: data.student.classLabel },
    }));

  const props: IntlReportProps = {
    templateKey: variant,
    studentName: data.student.name,
    examTitle: data.term.examName || data.term.periodLabel || data.term.label,
    examDate: data.term.issueDate,
    grades,
    school: {
      name: data.school.name,
      address: data.school.address,
      logoUrl: data.school.logoUrl || null,
    },
    gradeLegends: [
      {
        category: "CLASS",
        scales: data.legend.map((band) => ({
          minScore: band.min,
          maxScore: band.max,
          gradeLetter: band.letter,
          remark: band.remark ?? null,
        })),
      },
    ],
    attendanceRate: data.attendance?.percentage ?? null,
    classPosition: data.summary.rankLabel || null,
    gpa: data.summary.gpa ?? null,
    teacherComment: data.remarks.teacher || data.remarks.educator,
    studentId: data.student.admissionNo || data.student.id,
    academicYearLabel: data.term.academicYear || data.term.schoolYear,
    preview: compact,
    officialSignatures: {
      principal: data.signatures?.principal ?? null,
      academic: data.signatures?.teacher ?? null,
    },
  };

  return <InternationalReportCard {...props} />;
}
