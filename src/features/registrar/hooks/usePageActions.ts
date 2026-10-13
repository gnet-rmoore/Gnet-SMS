import type React from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { registrarApi } from "../api";
import { confirmAction } from "../../../lib/swal";
import { buildAdmissionApiPayload, emptyManualAdmissionForm } from "../lib/manualAdmissionForm";
import { persistUserPhoto } from "../../../lib/persistUserPhoto";

export type PageActionsDeps = {
  school: any;
  accessToken: any;
  students: any;
  applications: any;
  gradeLevels: any;
  classrooms: any;
  refetchRegistrar: any;
  setRosterLoading: any;
  setClassroomRoster: any;
  setSelectedClassroom: any;
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
  classAllocationStudentId: any;
  setClassAllocationStudentId: any;
  selectedClassroom: any;
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
    setRosterLoading,
    setClassroomRoster,
    setSelectedClassroom,
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
    classAllocationStudentId,
    setClassAllocationStudentId,
    selectedClassroom,
    manualAdmissionForm,
    setManualAdmissionForm,
    setActiveTab,
    waiveFee = false,
    waiveDocs = false,
    setEnrollCredentials,
  } = deps;

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

  // Fetch specific classroom roster when active classroom changes
  const fetchClassroomRoster = async (classroomId: string) => {
    setRosterLoading(true);
    try {
      const members = await registrarApi.fetchClassroomMembers(classroomId);
      const list = Array.isArray(members) ? members : [];
      const studentMembers = list.filter((m: any) => m.user?.role === "STUDENT");
      setClassroomRoster(studentMembers);
    } catch (error) {
      console.error("Failed to fetch classroom members:", error);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleSelectClassroom = (classroom: any) => {
    setSelectedClassroom(classroom);
    fetchClassroomRoster(classroom.id);
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
      const response = await fetch(`/api/users/${studentFormData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
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
          isActive: studentFormData.isActive
        })
      });

      if (response.ok) {
        setSuccessMessage(t("admissions.toast.studentUpdated"));
        setShowEditStudentModal(false);
        fetchData();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || t("admissions.toast.studentUpdateFailed"));
      }
    } catch (error) {
      setErrorMessage(t("admissions.toast.errorGeneric"));
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
      const response = await fetch(`/api/users/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.ok) {
        fetchData();
        setSuccessMessage(t("admissions.toast.studentDeleted"));
      } else {
        const data = await response.json();
        setErrorMessage(data.error || t("admissions.toast.studentDeleteFailed"));
      }
    } catch (error) {
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

  const handleSaveReview = async (updatedStatus?: string) => {
    if (!selectedApp) return;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const newStatus = updatedStatus || selectedApp.status;
    const finalNotes = JSON.stringify({
      testScore: evaluationData.testScore,
      interviewRating: evaluationData.interviewRating,
      comments: evaluationData.comments,
      generalNotes: evaluationData.generalNotes,
      applicantType: evaluationData.applicantType === "RETURNING" ? "RETURNING" : "NEW",
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
        // Persist notes/docs and advance to an enrollable status first
        if (selectedApp.status !== "ENROLLED") {
          const steps: string[] = [];
          if (selectedApp.status === "PENDING") steps.push("UNDER_REVIEW", "APPROVED");
          else if (selectedApp.status === "UNDER_REVIEW" || selectedApp.status === "WAITLISTED") {
            steps.push("APPROVED");
          }
          for (const step of steps) {
            const prep = await fetch(`/api/applications/${selectedApp.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                status: step,
                notes: finalNotes,
                documents: finalDocs,
              }),
            });
            if (!prep.ok) {
              const prepData = await prep.json().catch(() => ({}));
              setErrorMessage(prepData.error || t("admissions.toast.moveStatusFailed", { step }));
              return;
            }
          }
          if (steps.length === 0) {
            await fetch(`/api/applications/${selectedApp.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                notes: finalNotes,
                documents: finalDocs,
              }),
            });
          }
        }

        const enrollResp = await fetch(`/api/applications/${selectedApp.id}/enroll`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "Idempotency-Key": `enroll-${selectedApp.id}`,
          },
          body: JSON.stringify({
            classroomId: selectedClassroomId || undefined,
            waiveFee: Boolean(waiveFee),
            waiveDocs: Boolean(waiveDocs),
          }),
        });
        const enrollData = await enrollResp.json();
        if (!enrollResp.ok) {
          setErrorMessage(
            enrollData.code
              ? `${enrollData.error || t("admissions.toast.enrollmentFailed")} (${enrollData.code})`
              : enrollData.error || t("admissions.toast.enrollmentFailed")
          );
          return;
        }
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
        setShowAppReviewModal(false);
        fetchData();
        return;
      }

      const response = await fetch(`/api/applications/${selectedApp.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          status: newStatus,
          notes: finalNotes,
          documents: finalDocs
        })
      });

      if (response.ok) {
        setSuccessMessage(t("admissions.toast.candidateUpdated"));
        setSelectedClassroomId("");
        setShowAppReviewModal(false);
        fetchData();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || t("admissions.toast.reviewSaveFailed"));
      }
    } catch (error) {
      setErrorMessage(t("admissions.toast.reviewSaveError"));
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Classroom rosters update
  const handleAssignStudentToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroom || !classAllocationStudentId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/classrooms/${selectedClassroom.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ userId: classAllocationStudentId })
      });

      if (response.ok) {
        setClassAllocationStudentId("");
        fetchClassroomRoster(selectedClassroom.id);
        fetchData();
        setSuccessMessage(t("admissions.toast.studentAddedToClass"));
      } else {
        const data = await response.json();
        setErrorMessage(data.error || t("admissions.toast.addToClassFailed"));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudentFromClass = async (memberUserId: string) => {
    if (!selectedClassroom) return;
    const ok = await confirmAction({
      title: t("admissions.confirm.removeFromClassTitle"),
      text: t("admissions.confirm.removeFromClassText"),
      confirmText: t("common:remove"),
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/classrooms/${selectedClassroom.id}/members/${memberUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        fetchClassroomRoster(selectedClassroom.id);
        fetchData();
        setSuccessMessage(t("admissions.toast.studentRemovedFromClass"));
      } else {
        const data = await response.json();
        setErrorMessage(data.error || t("admissions.toast.removeMemberFailed"));
      }
    } catch (error) {
      console.error(error);
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
        (Array.isArray(gradeLevels)
          ? gradeLevels.find((g: any) => g.id === manualAdmissionForm.gradeLevelId)?.name
          : null) || null;
      const payload = buildAdmissionApiPayload({
        form: manualAdmissionForm,
        applicantType: existingStudentId ? "RETURNING" : "NEW",
        existingStudentUserId: existingStudentId,
        gradeLevelName,
        sourceNote: "Direct offline entry",
      });

      const response = await fetch(`/api/schools/${school?.id}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
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
        const data = await response.json();
        setErrorMessage(data.error || t("admissions.toast.offlineSubmitFailed"));
      }
    } catch (error) {
      setErrorMessage(t("admissions.toast.submitUnexpectedError"));
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
      const presignRes = await fetch(`/api/applications/${selectedApp.id}/documents/presign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          docType,
          fileName: file.name,
          mimeType: file.type || "application/pdf",
        }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error || "Presign failed");

      if (presign.uploadUrl) {
        const put = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file,
        });
        if (!put.ok) throw new Error("Upload to storage failed");
      }

      const confirmRes = await fetch(`/api/applications/${selectedApp.id}/documents/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          docType,
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          sizeBytes: file.size,
          fileUrl: presign.fileUrl,
          storageKey: presign.storageKey,
          runScan: true,
        }),
      });
      const doc = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(doc.error || "Confirm upload failed");

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
      setErrorMessage(err.message || t("admissions.toast.docUploadFailed"));
    }
  };

  const handleReviewAdmissionDoc = async (docId: string, status: "APPROVED" | "REJECTED") => {
    if (!selectedApp) return;
    try {
      const res = await fetch(`/api/applications/${selectedApp.id}/documents/${docId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review failed");
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
      setErrorMessage(err.message || t("admissions.toast.docReviewFailed"));
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
      const res = await fetch(`/api/applications/${selectedApp.id}/create-entrance-fee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ amount: feeAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create entrance fee");
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
      setErrorMessage(err.message || t("admissions.toast.entranceFeeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    parseAppNotes,
    parseAppDocuments,
    fetchData,
    fetchClassroomRoster,
    handleSelectClassroom,
    handleOpenEditStudent,
    handleSaveStudent,
    handleDeleteStudent,
    handleOpenReviewApp,
    handleToggleDoc,
    handleSaveReview,
    handleAssignStudentToClass,
    handleRemoveStudentFromClass,
    handleManualAdmissionSubmit,
    handleUploadAdmissionDoc,
    handleReviewAdmissionDoc,
    handleCreateEntranceFee,
  };
}
