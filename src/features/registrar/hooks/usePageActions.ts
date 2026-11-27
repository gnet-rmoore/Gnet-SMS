import type React from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { registrarApi } from "../api";
import { ApiError } from "../../../services/api";
import { confirmAction } from "../../../lib/swal";
import { buildAdmissionApiPayload, emptyManualAdmissionForm } from "../lib/manualAdmissionForm";
import { persistUserPhoto } from "../../../lib/persistUserPhoto";
import { canonicalGradeName } from "../../academics-shared/gradeSubjectLabels";

export type PageActionsDeps = {
  school: any;
  accessToken: any;
  students: any;
  applications: any;
  gradeLevels: any;
  classrooms: any;
  refetchRegistrar: any;
  setStudentFormData: any;
  setShowEditStudentModal: any;
  setSelectedStudent: any;
  studentFormData: any;
  setSubmitting: any;
  setErrorMessage: any;
  setSuccessMessage: any;
  setDocsChecklist: any;
  setEvaluationData: any;
  setShowAppReviewModal: any;
  setSelectedApp: any;
  docsChecklist: any;
  evaluationData: any;
  selectedApp: any;
  selectedClassroomId: any;
  setSelectedClassroomId: any;
  manualAdmissionForm: any;
  setManualAdmissionForm: any;
  setActiveTab: any;
  waiveFee?: boolean;
  waiveDocs?: boolean;
  setEnrollCredentials?: (c: any) => void;
};

/** Handlers/actions extracted from Page.tsx to keep the page under 800 lines. */
export function usePageActions(deps: PageActionsDeps) {
  const { t } = useTranslation(["pages", "common"]);
  const {
    school,
    accessToken,
    students,
    applications,
    gradeLevels,
    classrooms,
    refetchRegistrar,
    setStudentFormData,
    setShowEditStudentModal,
    setSelectedStudent,
    studentFormData,
    setSubmitting,
    setErrorMessage,
    setSuccessMessage,
    setDocsChecklist,
    setEvaluationData,
    setShowAppReviewModal,
    setSelectedApp,
    docsChecklist,
    evaluationData,
    selectedApp,
    selectedClassroomId,
    setSelectedClassroomId,
    manualAdmissionForm,
    setManualAdmissionForm,
    setActiveTab,
    waiveFee = false,
    waiveDocs = false,
    setEnrollCredentials,
  } = deps;

  const apiErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof ApiError) {
      return err.code ? `${err.message} (${err.code})` : err.message;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  // Helper parser for application notes
  const parseAppNotes = (notesStr: string) => {
    try {
      if (!notesStr) {
        return {
          testScore: "",
          interviewRating: "3",
          comments: "",
          generalNotes: "",
          applicantType: "NEW",
          existingStudentUserId: "",
          pendingPhotoUrl: null as string | null,
          reviewCompleted: false,
        };
      }
      const parsed = JSON.parse(notesStr);
      if (parsed && typeof parsed === "object") {
        return {
          testScore: parsed.testScore || "",
          interviewRating: parsed.interviewRating || "3",
          comments: parsed.comments || "",
          generalNotes: parsed.generalNotes || "",
          applicantType: parsed.applicantType === "RETURNING" ? "RETURNING" : "NEW",
          existingStudentUserId: parsed.existingStudentUserId || "",
          pendingPhotoUrl:
            typeof parsed.pendingPhotoUrl === "string" ? parsed.pendingPhotoUrl : null,
          reviewCompleted:
            parsed.reviewCompleted === true || ["APPROVED", "FEE_PENDING", "DOCS_PENDING", "ENROLLED"].includes(parsed.status),
        };
      }
    } catch (e) {
      // Not JSON
    }
    return {
      testScore: "",
      interviewRating: "3",
      comments: "",
      generalNotes: notesStr || "",
      applicantType: "NEW",
      existingStudentUserId: "",
      pendingPhotoUrl: null as string | null,
    };
  };

  // Helper parser for application documents
  const parseAppDocuments = (docsStr: string) => {
    try {
      if (!docsStr) return { birthCertificate: false, transcripts: false, idCopy: false, medicalRecords: false };
      const parsed = JSON.parse(docsStr);
      if (parsed && typeof parsed === "object") {
        return {
          birthCertificate: !!parsed.birthCertificate,
          transcripts: !!parsed.transcripts,
          idCopy: !!parsed.idCopy,
          medicalRecords: !!parsed.medicalRecords
        };
      }
    } catch (e) {
      // Parse failed
    }
    return { birthCertificate: false, transcripts: false, idCopy: false, medicalRecords: false };
  };

  const fetchData = () => {
    refetchRegistrar();
  };

  // Student directory operations
  const handleOpenEditStudent = (student: any) => {
    setStudentFormData({
      id: student.id,
      name: student.name || "",
      email: student.email || "",
      phone: student.phone || "",
      photoUrl: student.photoUrl || null,
      dob: student.dob ? format(new Date(student.dob), "yyyy-MM-dd") : "",
      gender: student.gender || "MALE",
      address: student.address || "",
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
      gradeLevelId: student.gradeLevelId || "",
      isActive: student.isActive !== false
    });
    setShowEditStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await registrarApi.updateUser(studentFormData.id, {
        name: studentFormData.name,
        email: studentFormData.email,
        phone: studentFormData.phone,
        photoUrl: studentFormData.photoUrl ?? undefined,
        dob: studentFormData.dob || undefined,
        gender: studentFormData.gender,
        address: studentFormData.address,
        parentName: studentFormData.parentName,
        parentPhone: studentFormData.parentPhone,
        gradeLevelId: studentFormData.gradeLevelId || undefined,
        isActive: studentFormData.isActive,
      });
      setSuccessMessage(t("admissions.toast.studentUpdated"));
      setShowEditStudentModal(false);
      fetchData();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, t("admissions.toast.studentUpdateFailed")));
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const ok = await confirmAction({
      title: t("admissions.confirm.deleteStudentTitle"),
      text: t("admissions.confirm.deleteStudentText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await registrarApi.deleteUser(studentId);
      fetchData();
      setSuccessMessage(t("admissions.toast.studentDeleted"));
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, t("admissions.toast.studentDeleteFailed")));
      console.error(error);
    }
  };

  // Admission reviewer operations
  const handleOpenReviewApp = (app: any) => {
    setSelectedApp(app);
    setDocsChecklist(parseAppDocuments(app.documents));
    setEvaluationData(parseAppNotes(app.notes));
    setShowAppReviewModal(true);
  };

  const handleToggleDoc = (docKey: keyof typeof docsChecklist) => {
    setDocsChecklist(prev => ({
      ...prev,
      [docKey]: !prev[docKey]
    }));
  };

  const handleSaveReview = async (updatedStatus?: string, options?: { close?: boolean }) => {
    if (!selectedApp) return;
    const shouldClose = options?.close !== false;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const newStatus = updatedStatus || selectedApp.status;
    const reviewCompleted =
      evaluationData.reviewCompleted === true ||
      (!updatedStatus && newStatus === "UNDER_REVIEW") ||
      ["APPROVED", "FEE_PENDING", "DOCS_PENDING", "ENROLLED"].includes(newStatus);
    const finalNotes = JSON.stringify({
      testScore: evaluationData.testScore,
      interviewRating: evaluationData.interviewRating,
      comments: evaluationData.comments,
      generalNotes: evaluationData.generalNotes,
      applicantType: evaluationData.applicantType === "RETURNING" ? "RETURNING" : "NEW",
      reviewCompleted,
      ...(evaluationData.existingStudentUserId
        ? { existingStudentUserId: evaluationData.existingStudentUserId }
        : {}),
      ...(evaluationData.pendingPhotoUrl
        ? { pendingPhotoUrl: evaluationData.pendingPhotoUrl }
        : {}),
    });
    const finalDocs = JSON.stringify(docsChecklist);

    try {
      // Orchestrated enroll owns Identity + optional classroom assignment.
      if (newStatus === "ENROLLED") {
        // Persist review notes/docs without changing status.
        await registrarApi.updateApplication(selectedApp.id, {
          notes: finalNotes,
          documents: finalDocs,
        });

        // Server owns the status machine: `enroll` walks the minimal approval path itself when
        // the candidate is still in review, so the client never pre-executes transitions.
        const enrollData = await registrarApi.enrollApplication(
          selectedApp.id,
          {
            classroomId: selectedClassroomId || undefined,
            waiveFee: Boolean(waiveFee),
            waiveDocs: Boolean(waiveDocs),
          },
          `enroll-${selectedApp.id}`
        );

        if (enrollData.credentials && setEnrollCredentials) {
          setEnrollCredentials(enrollData.credentials);
        }
        if (evaluationData.pendingPhotoUrl && enrollData.studentUserId) {
          try {
            await persistUserPhoto(
              enrollData.studentUserId,
              evaluationData.pendingPhotoUrl
            );
          } catch (photoErr: unknown) {
            console.warn("[registrar] pending profile photo apply failed:", photoErr);
          }
        }
        const classHint = enrollData.classAssignFailed
          ? t("admissions.toast.classAssignFailed")
          : "";
        setSuccessMessage(`${t("admissions.toast.enrolled")}${classHint}`);
        setSelectedClassroomId("");
        setSelectedApp((prev: any) => (prev ? { ...prev, status: "ENROLLED" } : prev));
        if (shouldClose) setShowAppReviewModal(false);
        fetchData();
        return;
      }

      await registrarApi.updateApplication(selectedApp.id, {
        status: newStatus,
        notes: finalNotes,
        documents: finalDocs,
      });
      setSuccessMessage(t("admissions.toast.candidateUpdated"));
      setSelectedClassroomId("");
      setSelectedApp((prev: any) => (prev ? { ...prev, status: newStatus } : prev));
      if (shouldClose) setShowAppReviewModal(false);
      fetchData();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, t("admissions.toast.reviewSaveFailed")));
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit offline manual admission application
  const handleManualAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const existingStudentId = String(manualAdmissionForm.existingStudentId || "").trim() || null;
      const gradeLevelName =
        canonicalGradeName(
          Array.isArray(gradeLevels)
            ? gradeLevels.find((g: any) => g.id === manualAdmissionForm.gradeLevelId)?.name
            : null
        ) || null;
      const payload = buildAdmissionApiPayload({
        form: manualAdmissionForm,
        applicantType: existingStudentId ? "RETURNING" : "NEW",
        existingStudentUserId: existingStudentId,
        gradeLevelName,
        sourceNote: "Direct offline entry",
      });
      if (manualAdmissionForm.pendingPhotoUrl) {
        const notes = payload.notes ? JSON.parse(payload.notes) : {};
        payload.notes = JSON.stringify({
          ...notes,
          pendingPhotoUrl: manualAdmissionForm.pendingPhotoUrl,
        });
      }

      const response = await registrarApi.createApplication(school?.id, payload);

      if (response) {
        setSuccessMessage(
          existingStudentId
            ? t("admissions.toast.returningRegistered")
            : t("admissions.toast.offlineRegistered")
        );
        setManualAdmissionForm(emptyManualAdmissionForm());
        fetchData();
        setTimeout(() => {
          setActiveTab("admissions");
          setSuccessMessage("");
        }, 2000);
      } else {
        setErrorMessage(t("admissions.toast.offlineSubmitFailed"));
      }
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, t("admissions.toast.offlineSubmitFailed")));
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadAdmissionDoc = async (docType: string, file: File) => {
    if (!selectedApp) return;
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const presign = await registrarApi.presignDocument(selectedApp.id, {
        docType,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
      });
      if (!presign || !presign.fileUrl) throw new Error(presign?.error || "Presign failed");

      // Direct-to-storage upload (external signed URL — intentionally a raw fetch, no auth header).
      if (presign.uploadUrl) {
        const put = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file,
        });
        if (!put.ok) throw new Error("Upload to storage failed");
      }

      const doc = await registrarApi.confirmDocument(selectedApp.id, {
        docType,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        sizeBytes: file.size,
        fileUrl: presign.fileUrl,
        storageKey: presign.storageKey,
        runScan: true,
      });

      setSelectedApp((prev: any) =>
        prev
          ? {
              ...prev,
              admissionDocuments: [...(prev.admissionDocuments || []), doc],
            }
          : prev
      );
      setSuccessMessage(t("admissions.toast.docUploaded"));
      fetchData();
    } catch (err: any) {
      setErrorMessage(apiErrorMessage(err, t("admissions.toast.docUploadFailed")));
    }
  };

  const handleReviewAdmissionDoc = async (docId: string, status: "APPROVED" | "REJECTED") => {
    if (!selectedApp) return;
    try {
      const data = await registrarApi.reviewDocument(selectedApp.id, docId, { status });
      setSelectedApp((prev: any) =>
        prev
          ? {
              ...prev,
              admissionDocuments: (prev.admissionDocuments || []).map((d: any) =>
                d.id === docId ? { ...d, ...data } : d
              ),
            }
          : prev
      );
      setSuccessMessage(
        t("admissions.toast.docReviewed", { status: status.toLowerCase() })
      );
      fetchData();
    } catch (err: any) {
      setErrorMessage(apiErrorMessage(err, t("admissions.toast.docReviewFailed")));
    }
  };

  const handleCompleteEntrance = async (entranceResult: string, entranceNotes?: string) => {
    if (!selectedApp) return;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const updated = await registrarApi.completeEntrance(selectedApp.id, {
        entranceResult,
        entranceNotes,
      });
      setSelectedApp((prev: any) => (prev ? { ...prev, ...updated } : prev));
      setSuccessMessage(t("admissions.toast.entranceCompleted", {
        defaultValue: "Entrance completion recorded.",
      }));
      fetchData();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, t("admissions.toast.entranceCompleteFailed", {
        defaultValue: "Could not record entrance completion.",
      })));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignClassroom = async (classroomId: string) => {
    if (!selectedApp || !classroomId) return;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const updated = await registrarApi.assignClassroom(selectedApp.id, classroomId);
      setSelectedApp((prev: any) => (prev ? { ...prev, ...(updated?.application || {}), ...(updated?.admissionApplication || {}), classroomId: updated?.classroomId || updated?.application?.classroomId || updated?.admissionApplication?.classroomId || classroomId } : prev));
      setSelectedClassroomId("");
      setSuccessMessage(t("admissions.toast.classroomAssigned", {
        defaultValue: "Class placement confirmed.",
      }));
      fetchData();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, t("admissions.toast.classroomAssignFailed", {
        defaultValue: "Could not confirm class placement.",
      })));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEntranceFee = async (amount?: number) => {
    if (!selectedApp) return;
    const feeAmount = Number(amount || 0);
    if (!(feeAmount > 0)) {
      setErrorMessage(t("admissions.toast.invalidEntranceFee"));
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    try {
      const data = await registrarApi.createEntranceFee(selectedApp.id, feeAmount);
      setSelectedApp((prev: any) =>
        prev
          ? {
              ...prev,
              ...(data.application || {}),
              feePaymentId: data.fee?.id || data.feePaymentId || prev.feePaymentId,
              status: data.application?.status || prev.status,
            }
          : prev
      );
      setSuccessMessage(
        data.existing
          ? t("admissions.toast.entranceFeeExists")
          : t("admissions.toast.entranceFeeCreated")
      );
      fetchData();
    } catch (err: any) {
      setErrorMessage(apiErrorMessage(err, t("admissions.toast.entranceFeeFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    parseAppNotes,
    parseAppDocuments,
    fetchData,
    handleOpenEditStudent,
    handleSaveStudent,
    handleDeleteStudent,
    handleOpenReviewApp,
    handleToggleDoc,
    handleSaveReview,
    handleManualAdmissionSubmit,
    handleUploadAdmissionDoc,
    handleReviewAdmissionDoc,
    handleCompleteEntrance,
    handleAssignClassroom,
    handleCreateEntranceFee,
  };
}
