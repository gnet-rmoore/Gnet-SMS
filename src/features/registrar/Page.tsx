import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { PageShell } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";
import { useAuthStore } from "../../store/authStore";
import { useRegistrarQuery } from "./hooks/useRegistrarQuery";
import { useApplicationsQuery } from "./hooks/useApplicationsQuery";
import { registrarApi } from "./api";
import { EditStudentModal } from "./components/EditStudentModal";
import { ApplicationReviewModal } from "./components/ApplicationReviewModal";
import { EnrollCredentialsModal } from "./components/EnrollCredentialsModal";
import { StudentDossierModal } from "./components/StudentDossierModal";
import { OverviewTab } from "./components/OverviewTab";
import { DirectoryTab } from "./components/DirectoryTab";
import { AdmissionsTab } from "./components/AdmissionsTab";
import { ClassroomsTab } from "./components/ClassroomsTab";
import { ManualAdmissionTab } from "./components/ManualAdmissionTab";
import { OnlineRegistrationCard } from "./components/OnlineRegistrationCard";
import type { TabType } from "./types";
import { RegistrarChrome } from "./components/RegistrarChrome";
import { usePageActions } from "./hooks/usePageActions";
import { emptyManualAdmissionForm } from "./lib/manualAdmissionForm";
import { useTranslation } from "react-i18next";

export const Registrar = () => {
  const { t } = useTranslation("pages");
  const { school, accessToken } = useAuthStore();
  const {
    students,
    gradeLevels,
    classrooms,
    loading,
    invalidate: refetchRegistrar,
  } = useRegistrarQuery();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Search & Filters
  const directoryFilterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "gradeLevelId",
        label: `${t("common:all")} ${t("common:gradeLevel")}`,
        type: "enum",
        primary: true,
        allLabel: `${t("common:all")} ${t("common:gradeLevel")}`,
        options: gradeLevels.map((gl: any) => ({ value: gl.id, label: gl.name })),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, gradeLevels]
  );
  const directoryFilters = useListFilters({ fields: directoryFilterFields, syncUrl: true });

  const APPLICATION_STATUSES = [
    "PENDING",
    "UNDER_REVIEW",
    "WAITLISTED",
    "FEE_PENDING",
    "DOCS_PENDING",
    "APPROVED",
    "REJECTED",
    "ENROLLED",
    "WITHDRAWN",
  ] as const;
  const admissionsFilterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "status",
        label: t("admissions.admissionsTab.allStatuses"),
        type: "enum",
        primary: true,
        allLabel: t("admissions.admissionsTab.allStatuses"),
        options: APPLICATION_STATUSES.map((status) => ({
          value: status,
          label: t(`admissions.status.${status}`),
        })),
      },
      {
        key: "gradeLevelId",
        label: `${t("common:all")} ${t("common:gradeLevel")}`,
        type: "enum",
        allLabel: `${t("common:all")} ${t("common:gradeLevel")}`,
        options: gradeLevels.map((gl: any) => ({ value: gl.id, label: gl.name })),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, gradeLevels]
  );
  const admissionsFilters = useListFilters({ fields: admissionsFilterFields, syncUrl: true });

  const {
    applications,
    total: applicationsTotal,
    page: applicationsPage,
    pageSize: applicationsPageSize,
    loading: applicationsLoading,
    invalidate: invalidateApplications,
  } = useApplicationsQuery({
    q: admissionsFilters.committedQ,
    status: admissionsFilters.values.status,
    gradeLevelId: admissionsFilters.values.gradeLevelId,
    page: admissionsFilters.page,
    pageSize: admissionsFilters.pageSize,
  });

  const funnelQuery = useQuery({
    queryKey: ["admission-funnel", school?.id],
    enabled: Boolean(school?.id),
    queryFn: async () => {
      if (!school?.id) throw new Error("Missing school");
      return registrarApi.fetchFunnel(school.id) as Promise<{
        total: number;
        byStatus: Record<string, number>;
        waitlisted: number;
      }>;
    },
  });

  const recentAppsQuery = useQuery({
    queryKey: ["admission-recent", school?.id],
    enabled: Boolean(school?.id),
    queryFn: async () => {
      if (!school?.id) throw new Error("Missing school");
      const raw = await registrarApi.fetchApplications(school.id, { page: "1", pageSize: "5" });
      return Array.isArray((raw as any)?.items) ? (raw as any).items : Array.isArray(raw) ? raw : [];
    },
  });

  const refetchAll = () => {
    refetchRegistrar();
    invalidateApplications();
    funnelQuery.refetch();
    recentAppsQuery.refetch();
  };

  // Selection states for Modals / Active Sub-views
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<any | null>(null);
  const [classroomRoster, setClassroomRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Form States
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showAppReviewModal, setShowAppReviewModal] = useState(false);
  const [studentFormData, setStudentFormData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    photoUrl: null as string | null,
    dob: "",
    gender: "MALE",
    address: "",
    parentName: "",
    parentPhone: "",
    gradeLevelId: "",
    isActive: true
  });

  // Application Review States
  const [docsChecklist, setDocsChecklist] = useState({
    birthCertificate: false,
    transcripts: false,
    idCopy: false,
    medicalRecords: false
  });
  const [evaluationData, setEvaluationData] = useState({
    testScore: "",
    interviewRating: "3",
    comments: "",
    generalNotes: ""
  });

  // Student Dossier Drawer
  const [dossierTab, setDossierTab] = useState<"profile" | "transcript">("profile");
  const [isPrintTranscriptMode, setIsPrintTranscriptMode] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [waiveFee, setWaiveFee] = useState(false);
  const [waiveDocs, setWaiveDocs] = useState(false);
  const [enrollCredentials, setEnrollCredentials] = useState<any>(null);
  const [entranceFeeAmount, setEntranceFeeAmount] = useState("");

  // Manual Admission Form State
  const [manualAdmissionForm, setManualAdmissionForm] = useState(emptyManualAdmissionForm);

  // Classroom Allocation State
  const [classAllocationStudentId, setClassAllocationStudentId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
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
  } = usePageActions({
    school,
    accessToken,
    students,
    applications,
    gradeLevels,
    classrooms,
    refetchRegistrar: refetchAll,
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
    waiveFee,
    waiveDocs,
    setEnrollCredentials,
  });

  const funnelByStatus = funnelQuery.data?.byStatus ?? {};
  const pendingAppsCount = funnelByStatus.PENDING ?? 0;
  const underReviewAppsCount = funnelByStatus.UNDER_REVIEW ?? 0;
  const approvedAppsCount = funnelByStatus.APPROVED ?? 0;
  const waitlistedCount = funnelQuery.data?.waitlisted ?? funnelByStatus.WAITLISTED ?? 0;
  const totalApplicationsCount = funnelQuery.data?.total ?? applicationsTotal;

  const handleExportCsv = () => {
    if (!school?.id) return;
    const params = new URLSearchParams();
    const status = admissionsFilters.values.status;
    const gradeLevelId = admissionsFilters.values.gradeLevelId;
    const q = admissionsFilters.committedQ.trim();
    if (status) params.set("status", status);
    if (gradeLevelId) params.set("gradeLevelId", gradeLevelId);
    if (q) params.set("q", q);
    const qs = params.toString();
    window.open(`/api/schools/${school.id}/applications/export.csv${qs ? `?${qs}` : ""}`, "_blank");
  };

  const totalStudentsCount = students.length;
  const activeStudentsCount = students.filter((s) => s.isActive).length;
  const classroomsCount = classrooms.length;

  const openWaitlist = () => {
    admissionsFilters.clear();
    admissionsFilters.setValue("status", "WAITLISTED");
    setActiveTab("admissions");
  };

  // Filter lists
  const filteredStudents = students.filter((student) => {
    const q = directoryFilters.committedQ.toLowerCase();
    const matchesSearch =
      !q ||
      (student.name || "").toLowerCase().includes(q) ||
      (student.email || "").toLowerCase().includes(q) ||
      (student.phone || "").toLowerCase().includes(q);

    const gradeLevelId = directoryFilters.values.gradeLevelId;
    const matchesGrade = gradeLevelId ? student.gradeLevelId === gradeLevelId : true;
    return matchesSearch && matchesGrade;
  });

  return (
    <PageShell width="wide" className="pb-16">
      <RegistrarChrome
        activeTab={activeTab}
        errorMessage={errorMessage}
        pendingAppsCount={pendingAppsCount}
        school={school}
        setActiveTab={setActiveTab}
        successMessage={successMessage}
        underReviewAppsCount={underReviewAppsCount}
        title={t("admissions.title")}
        subtitle={t("admissions.subtitle")}
      />
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">{t("admissions.loading")}</p>
        </div>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "overview" && (
            <OverviewTab
              activeStudentsCount={activeStudentsCount}
              approvedAppsCount={approvedAppsCount}
              classroomsCount={classroomsCount}
              funnelByStatus={funnelByStatus}
              gradeLevels={gradeLevels}
              pendingAppsCount={pendingAppsCount}
              recentApplications={recentAppsQuery.data ?? []}
              students={students}
              totalApplicationsCount={totalApplicationsCount}
              totalStudentsCount={totalStudentsCount}
              underReviewAppsCount={underReviewAppsCount}
              onExportCsv={handleExportCsv}
              onOpenWaitlist={openWaitlist}
              onlineRegistrationSlot={
                <OnlineRegistrationCard
                  onMessage={(msg, kind) => {
                    if (kind === "error") {
                      setErrorMessage(msg);
                      setSuccessMessage("");
                    } else {
                      setSuccessMessage(msg);
                      setErrorMessage("");
                    }
                  }}
                />
              }
            />
          )}

          {activeTab === "directory" && (
            <DirectoryTab
              filteredStudents={filteredStudents}
              gradeLevels={gradeLevels}
              handleDeleteStudent={handleDeleteStudent}
              handleOpenEditStudent={handleOpenEditStudent}
              setSelectedStudent={setSelectedStudent}
              filterFields={directoryFilterFields}
              filters={directoryFilters}
              savedViewsScope={school?.id ? `${school.id}:registrar-directory` : undefined}
            />
          )}

          {activeTab === "admissions" && (
            <AdmissionsTab
              filterFields={admissionsFilterFields}
              filters={admissionsFilters}
              savedViewsScope={school?.id ? `${school.id}:registrar-admissions` : undefined}
              approvedAppsCount={approvedAppsCount}
              applications={applications}
              applicationsLoading={applicationsLoading}
              applicationsPage={applicationsPage}
              applicationsPageSize={applicationsPageSize}
              applicationsTotal={applicationsTotal}
              handleOpenReviewApp={handleOpenReviewApp}
              parseAppDocuments={parseAppDocuments}
              parseAppNotes={parseAppNotes}
              pendingAppsCount={pendingAppsCount}
              underReviewAppsCount={underReviewAppsCount}
              waitlistedCount={waitlistedCount}
              onExportCsv={handleExportCsv}
            />
          )}

          {activeTab === "classrooms" && (
            <ClassroomsTab
              classAllocationStudentId={classAllocationStudentId}
              setClassAllocationStudentId={setClassAllocationStudentId}
              classrooms={classrooms}
              classroomRoster={classroomRoster}
              gradeLevels={gradeLevels}
              handleAssignStudentToClass={handleAssignStudentToClass}
              handleRemoveStudentFromClass={handleRemoveStudentFromClass}
              handleSelectClassroom={handleSelectClassroom}
              rosterLoading={rosterLoading}
              selectedClassroom={selectedClassroom}
              students={students}
            />
          )}

          {activeTab === "new_admission" && (
            <ManualAdmissionTab
              gradeLevels={gradeLevels}
              students={students}
              handleManualAdmissionSubmit={handleManualAdmissionSubmit}
              manualAdmissionForm={manualAdmissionForm}
              setManualAdmissionForm={setManualAdmissionForm}
              submitting={submitting}
            />
          )}
        </motion.div>
      )}

      {/* 1. Modal: Edit Student Profile */}
      {showEditStudentModal && (
        <EditStudentModal
          gradeLevels={gradeLevels}
          handleSaveStudent={handleSaveStudent}
          setShowEditStudentModal={setShowEditStudentModal}
          setStudentFormData={setStudentFormData}
          studentFormData={studentFormData}
          submitting={submitting}
        />
      )}
      {/* 2. Modal: Review Application details & Checklist */}
      {showAppReviewModal && selectedApp && (
        <ApplicationReviewModal
          classrooms={classrooms}
          docsChecklist={docsChecklist}
          evaluationData={evaluationData}
          handleSaveReview={handleSaveReview}
          handleToggleDoc={handleToggleDoc}
          selectedApp={selectedApp}
          selectedClassroomId={selectedClassroomId}
          setEvaluationData={setEvaluationData}
          setSelectedClassroomId={setSelectedClassroomId}
          setShowAppReviewModal={setShowAppReviewModal}
          submitting={submitting}
          handleUploadAdmissionDoc={handleUploadAdmissionDoc}
          handleReviewAdmissionDoc={handleReviewAdmissionDoc}
          waiveFee={waiveFee}
          setWaiveFee={setWaiveFee}
          waiveDocs={waiveDocs}
          setWaiveDocs={setWaiveDocs}
          entranceFeeAmount={entranceFeeAmount}
          setEntranceFeeAmount={setEntranceFeeAmount}
          handleCreateEntranceFee={handleCreateEntranceFee}
          students={students}
          onPhotoError={setErrorMessage}
          onPhotoSuccess={setSuccessMessage}
        />
      )}
      {enrollCredentials ? (
        <EnrollCredentialsModal
          credentials={enrollCredentials}
          studentName={selectedApp?.studentName}
          onDone={() => {
            setEnrollCredentials(null);
            setWaiveFee(false);
            setWaiveDocs(false);
          }}
        />
      ) : null}
      {/* 3. Modal: Student Records Dossier & Transcript Management */}
      {selectedStudent && (
        <StudentDossierModal
          dossierTab={dossierTab}
          gradeLevels={gradeLevels}
          isPrintTranscriptMode={isPrintTranscriptMode}
          selectedStudent={selectedStudent}
          setDossierTab={setDossierTab}
          setIsPrintTranscriptMode={setIsPrintTranscriptMode}
          setSelectedStudent={setSelectedStudent}
        />
      )}
    </PageShell>
  );
};
