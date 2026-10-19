import React from "react";
import type { GradeLegendLike } from "../../../lib/gradeLegend";
import { assembleGradeSheetData, type AssembleGradeEntry } from "../assembleGradeSheet";
import { resolveGradeSheetTemplateKey } from "../registry";
import { LedgerReport } from "./LedgerReport";
import { MasteryBarsReport } from "./MasteryBarsReport";

export type GradeSheetViewProps = {
  studentName: string;
  examTitle: string;
  examDate: string;
  grades: AssembleGradeEntry[];
  school: any;
  templateId: string;
  gradeLegends?: GradeLegendLike[] | null;
  admissionNo?: string | null;
  classLabel?: string | null;
  section?: string | null;
  dob?: string | null;
  guardian?: string | null;
  academicYearLabel?: string | null;
  attendancePresent?: number | null;
  attendanceTotal?: number | null;
  classPosition?: string | null;
  gpa?: number | null;
  teacherComment?: string | null;
  principalComment?: string | null;
  conduct?: string | null;
  promotionStatus?: string | null;
  nextTermStart?: string | null;
  /** Preview mode: tighter stage padding */
  compact?: boolean;
  /** Pre-built data (Settings sample) — skips assemble when set */
  data?: ReturnType<typeof assembleGradeSheetData>;
  signatures?: {
    teacher?: { name?: string | null; signatureUrl?: string | null } | null;
    principal?: { name?: string | null; signatureUrl?: string | null } | null;
  };
};

export function GradeSheetView(props: GradeSheetViewProps) {
  const key = resolveGradeSheetTemplateKey(props.templateId);
  const data =
    props.data ||
    assembleGradeSheetData({
      studentName: props.studentName,
      examTitle: props.examTitle,
      examDate: props.examDate,
      grades: props.grades,
      school: props.school,
      gradeLegends: props.gradeLegends,
      admissionNo: props.admissionNo,
      classLabel: props.classLabel,
      section: props.section,
      dob: props.dob,
      guardian: props.guardian,
      academicYearLabel: props.academicYearLabel,
      attendancePresent: props.attendancePresent,
      attendanceTotal: props.attendanceTotal,
      classPosition: props.classPosition,
      gpa: props.gpa,
      teacherComment: props.teacherComment,
      principalComment: props.principalComment,
      conduct: props.conduct,
      promotionStatus: props.promotionStatus,
      nextTermStart: props.nextTermStart,
      signatures: props.signatures,
    });

  if (key === "TEMPLATE_2") {
    return <MasteryBarsReport data={data} compact={props.compact} />;
  }
  return <LedgerReport data={data} compact={props.compact} />;
}
