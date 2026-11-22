import React from "react";
import { NewEnrollmentDrawer } from "./NewEnrollmentDrawer";
import type { ManualAdmissionForm } from "../lib/manualAdmissionForm";

export type ManualAdmissionTabProps = {
  gradeLevels: any[];
  students: any[];
  studentsLoading?: boolean;
  gradeLoadState?: "loading" | "error" | "empty" | "ready";
  onRetryGrades?: () => void;
  handleManualAdmissionSubmit: (e: React.FormEvent) => void;
  manualAdmissionForm: ManualAdmissionForm;
  setManualAdmissionForm: (v: ManualAdmissionForm) => void;
  submitting: boolean;
};

export function ManualAdmissionTab(props: ManualAdmissionTabProps) {
  return <NewEnrollmentDrawer {...props} />;
}
