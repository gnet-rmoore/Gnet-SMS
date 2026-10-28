import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useCurriculumQuery } from "./hooks/useCurriculumQuery";
import { SyllabusBuilderModal } from "./components/SyllabusBuilderModal";
import { SubjectModal } from "./components/SubjectModal";
import { SyllabusViewModal } from "./components/SyllabusViewModal";
import { GradeLevelModal } from "./components/GradeLevelModal";
import { ManageSubjectsModal } from "./components/ManageSubjectsModal";
import { ConceptGuide } from "./components/ConceptGuide";
import { CurriculumViews } from "./components/CurriculumViews";
import { DivisionsPanel } from "./components/DivisionsPanel";
import { ViewTabs } from "./components/ViewTabs";
import { PageHeader } from "./components/PageHeader";
import { usePageActions } from "./hooks/usePageActions";
import { useAcademicCalendarQuery } from "../academic-calendar/hooks/useAcademicCalendarQuery";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { confirmAction } from "../../lib/swal";
import {
  attachClassroomCountsToGradeLevels,
  enrichClassrooms,
} from "../academics-shared/enrichClassrooms";
import { useTranslation } from "react-i18next";
import { CurriculumSetupWizard } from "./components/CurriculumSetupWizard";
import {
  buildTeachingScope,
  createAdminSyllabusFormDefaults,
  createTeacherSyllabusFormDefaults,
  defaultSyllabusFormShell,
} from "./teacherTeachingScope";
import { syllabusFormFromPlan } from "../academics-shared/syllabusCalendar";
import { ListFilterBar, ListPagination } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface GradeLevel {
  id: string;
  name: string;
  _count?: {
    classrooms: number;
  };
}

interface SyllabusPlan {
  id: string;
  schoolId: string;
  subjectId: string;
  gradeLevelId: string;
  teacherId: string;
  teacherName: string;
  subjectName: string;
  gradeLevelName: string;
  title: string;
  academicYear: string;
  calendarPatternId?: string | null;
  standardsFramework: string;
  objectives: string;
  units: string;
  textbooks?: string;
  differentiation?: string;
  accommodations?: string;
  gradingCriteria?: string;
  status: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export const Curriculum = () => {
  const { t } = useTranslation("pages");
  const { slug } = useParams();
  const { school, accessToken, user } = useAuthStore();
  const {
    subjects,
    gradeLevels: rawGradeLevels,
    classrooms: rawClassrooms,
    syllabi,
    staff,
    offerings,
    loading,
    invalidate: refetchCurriculum,
  } = useCurriculumQuery();
  const { toast, showToast } = usePageToast();
  const requestConfirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      danger?: boolean;
    }) =>
      confirmAction({
        title: opts.title,
        text: opts.message,
        confirmText: opts.confirmLabel,
        danger: opts.danger,
      }),
    []
  );

  const classrooms = useMemo(
    () =>
      enrichClassrooms(rawClassrooms || [], {
        subjects,
        gradeLevels: rawGradeLevels,
        staff,
      }),
    [rawClassrooms, subjects, rawGradeLevels, staff]
  );
  const gradeLevels = useMemo(
    () =>
      attachClassroomCountsToGradeLevels(
        (rawGradeLevels || []) as GradeLevel[],
        classrooms
      ),
    [rawGradeLevels, classrooms]
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showManageSubjectsModal, setShowManageSubjectsModal] = useState(false);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<"SYLLABI" | "SUBJECTS" | "GRADE_LEVELS">("SYLLABI");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showConceptGuide, setShowConceptGuide] = useState(false);

  const teachers = (staff || []).filter((s: any) => s.role === "TEACHER");
  const [subjectGradeLevelId, setSubjectGradeLevelId] = useState("");
  const [manuallyEditedCode, setManuallyEditedCode] = useState(false);
  const [newClassGroupName, setNewClassGroupName] = useState("");
  const [newClassGroupTeacherId, setNewClassGroupTeacherId] = useState("");

  const [addSubjectSelectedClassIds, setAddSubjectSelectedClassIds] = useState<string[]>([]);
  const [addSubjectClassTeachers, setAddSubjectClassTeachers] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    if (subjectGradeLevelId) {
      const groups = classrooms.filter(
        (c) => c.gradeLevelId === subjectGradeLevelId && !c.subjectId
      );
      setAddSubjectSelectedClassIds(groups.map((g) => g.id));
      const teachersMap: Record<string, string> = {};
      groups.forEach((g) => {
        teachersMap[g.id] = g.ownerTeacherId || "";
      });
      setAddSubjectClassTeachers(teachersMap);
    } else {
      setAddSubjectSelectedClassIds([]);
      setAddSubjectClassTeachers({});
    }
  }, [subjectGradeLevelId, classrooms]);

  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [editingSyllabusId, setEditingSyllabusId] = useState<string | null>(null);
  const [selectedSyllabus, setSelectedSyllabus] = useState<SyllabusPlan | null>(null);
  const [showSyllabusViewModal, setShowSyllabusViewModal] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [syllabusFeedback, setSyllabusFeedback] = useState("");
  const [syllabusFilterStatus, setSyllabusFilterStatus] = useState("ALL");
  const [syllabusSearchTerm, setSyllabusSearchTerm] = useState("");

  const { calendar } = useAcademicCalendarQuery();

  const [syllabusForm, setSyllabusForm] = useState(defaultSyllabusFormShell);

  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", description: "" });
  const [gradeForm, setGradeForm] = useState({ name: "" });
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  const canManage = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(user?.role || "");
  const isTeacherSyllabusScope = user?.role === "TEACHER";
  const teachingScope = useMemo(() => {
    if (!isTeacherSyllabusScope) return null;
    return buildTeachingScope(classrooms, user?.id, subjects, gradeLevels);
  }, [isTeacherSyllabusScope, classrooms, user?.id, subjects, gradeLevels]);

  const openNewSyllabusModal = useCallback(() => {
    setEditingSyllabusId(null);
    if (isTeacherSyllabusScope && teachingScope) {
      setSyllabusForm(createTeacherSyllabusFormDefaults(teachingScope.pairs, calendar));
    } else {
      setSyllabusForm(createAdminSyllabusFormDefaults(subjects, gradeLevels, calendar));
    }
    setShowSyllabusModal(true);
  }, [isTeacherSyllabusScope, teachingScope, subjects, gradeLevels, calendar]);

  const openEditSyllabusModal = useCallback(
    (plan: SyllabusPlan) => {
      setEditingSyllabusId(plan.id);
      setSyllabusForm(syllabusFormFromPlan(plan, calendar));
      setShowSyllabusViewModal(false);
      setShowSyllabusModal(true);
    },
    [calendar]
  );

  const closeSyllabusModal = useCallback(() => {
    setShowSyllabusModal(false);
    setEditingSyllabusId(null);
  }, []);

  const {
    handleAddObjective,
    handleObjectiveChange,
    handleRemoveObjective,
    handleAddUnit,
    handleUnitChange,
    handleUnitPeriodChange,
    handleRemoveUnit,
    handleAddCriteria,
    handleCriteriaChange,
    handleRemoveCriteria,
    handleReimportCalendarWeights,
    handleCustomizeWeights,
    handleLoadSyllabusTemplate,
    handleGenerateAiSyllabus,
    handleCreateSyllabus,
    handleUpdateSyllabusStatus,
    handleDeleteSyllabus,
    handleNameChange,
    handleCreateSubject,
    handleSeedGradeLevels,
    handleCreateGradeLevel,
    handleCreateClassGroupInline,
    handleAddSubjectToClassGroup,
    handleToggleOffering,
    handleSyncOfferingsToRooms,
    handleBackfillCurriculumLinks,
    handleUpdateSubject,
    handleDeleteSubject,
    handleDeleteGradeLevel,
    handleUpdateGradeLevel,
  } = usePageActions({
    school,
    accessToken,
    user,
    subjects,
    gradeLevels,
    classrooms,
    offerings,
    refetchCurriculum,
    syllabusForm,
    setSyllabusForm,
    aiCustomPrompt,
    setAiCustomPrompt,
    setGeneratingAi,
    setSubmitting,
    setShowSyllabusModal,
    setShowSyllabusViewModal,
    setSyllabusFeedback,
    subjectForm,
    setSubjectForm,
    manuallyEditedCode,
    setManuallyEditedCode,
    subjectGradeLevelId,
    setSubjectGradeLevelId,
    addSubjectSelectedClassIds,
    setAddSubjectSelectedClassIds,
    addSubjectClassTeachers,
    setAddSubjectClassTeachers,
    setShowSubjectModal,
    gradeForm,
    setGradeForm,
    setShowGradeModal,
    selectedGradeLevel,
    newClassGroupName,
    setNewClassGroupName,
    newClassGroupTeacherId,
    setNewClassGroupTeacherId,
    showToast,
    requestConfirm,
    calendar,
    editingSyllabusId,
    setEditingSyllabusId,
  });

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "search",
        label: t("common:search"),
        type: "text",
        primary: true,
        placeholder: t("curriculum.searchPlaceholder"),
      },
    ],
    [t]
  );
  const filters = useListFilters({ fields: filterFields, syncUrl: true, defaultPageSize: 12 });

  const normalizedQuery = filters.committedQ.trim().toLowerCase();
  const filteredSubjects = subjects.filter(
    (sub) =>
      !normalizedQuery ||
      sub.name.toLowerCase().includes(normalizedQuery) ||
      sub.code.toLowerCase().includes(normalizedQuery)
  );

  const totalSyllabi = syllabi.length;
  const totalSubjects = filteredSubjects.length;
  const totalGradeLevels = gradeLevels.length;
  const totalClassrooms = classrooms.length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <PageHeader
        canManage={canManage}
        setShowConceptGuide={setShowConceptGuide}
        setShowGradeModal={setShowGradeModal}
        setShowSubjectModal={setShowSubjectModal}
        showConceptGuide={showConceptGuide}
        slug={slug}
        title={t("curriculum.title")}
        subtitle={t("curriculum.subtitle")}
      />

      <ConceptGuide
        setShowConceptGuide={setShowConceptGuide}
        showConceptGuide={showConceptGuide}
        slug={slug}
        isTeacher={user?.role === "TEACHER"}
      />

      <ViewTabs activeView={activeView} setActiveView={setActiveView} />

      <div className="rounded-[32px] border border-slate-200 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
        <ListFilterBar
          fields={[{ key: "search", label: t("common:search"), type: "text", primary: true, placeholder: t("curriculum.searchPlaceholder") }]}
          q={filters.committedQ}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={filters.clear}
          shownCount={
            activeView === "SYLLABI" ? totalSyllabi :
            activeView === "SUBJECTS" ? totalSubjects :
            activeView === "GRADE_LEVELS" ? totalGradeLevels :
            totalClassrooms
          }
        />
      </div>

      {loading ? (
        <div className="h-64 rounded-[32px] bg-slate-100 animate-pulse" />
      ) : (
        <>
          {activeView === "GRADE_LEVELS" && school?.id && canManage && (
            <DivisionsPanel
              schoolId={school.id}
              gradeLevels={gradeLevels}
              onGradesChanged={() => void refetchCurriculum?.()}
              showToast={showToast}
            />
          )}
          <CurriculumViews
          activeDropdown={activeDropdown}
          activeView={activeView}
          canManage={canManage}
          classrooms={classrooms}
          offerings={offerings}
          filteredSubjects={filteredSubjects}
          gradeLevels={gradeLevels}
          handleBackfillCurriculumLinks={handleBackfillCurriculumLinks}
          handleDeleteGradeLevel={handleDeleteGradeLevel}
          handleDeleteSubject={handleDeleteSubject}
          handleDeleteSyllabus={handleDeleteSyllabus}
            handleSeedGradeLevels={handleSeedGradeLevels}
            handleUpdateGradeLevel={handleUpdateGradeLevel}
            onOpenSetupWizard={() => setShowSetupWizard(true)}
submitting={submitting}
            syllabi={syllabi}
            syllabusFilterStatus={syllabusFilterStatus}
            syllabusSearchTerm={syllabusSearchTerm}
            user={user}
          />

          {!loading &&
            ((activeView === "SYLLABI" && totalSyllabi > 0) ||
            (activeView === "SUBJECTS" && totalSubjects > 0) ||
            (activeView === "GRADE_LEVELS" && totalGradeLevels > 0) ? (
              <ListPagination
                total={
                  activeView === "SYLLABI" ? totalSyllabi :
                  activeView === "SUBJECTS" ? totalSubjects :
                  totalGradeLevels
                }
                page={filters.page}
                pageSize={filters.pageSize}
                onPageChange={filters.setPage}
                onPageSizeChange={filters.setPageSize}
                className="rounded-2xl border border-slate-200 bg-white"
              />
            ) : null)}
        </>
      )}

      <AnimatePresence>
        {showSubjectModal && (
          <SubjectModal
            addSubjectClassTeachers={addSubjectClassTeachers}
            addSubjectSelectedClassIds={addSubjectSelectedClassIds}
            classrooms={classrooms}
            gradeLevels={gradeLevels}
            handleCreateSubject={handleCreateSubject}
            handleNameChange={handleNameChange}
            setAddSubjectClassTeachers={setAddSubjectClassTeachers}
            setAddSubjectSelectedClassIds={setAddSubjectSelectedClassIds}
            setManuallyEditedCode={setManuallyEditedCode}
            setShowSubjectModal={setShowSubjectModal}
            setSubjectForm={setSubjectForm}
            setSubjectGradeLevelId={setSubjectGradeLevelId}
            subjectForm={subjectForm}
            subjectGradeLevelId={subjectGradeLevelId}
            submitting={submitting}
            teachers={teachers}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGradeModal && (
          <GradeLevelModal
            gradeForm={gradeForm}
            handleCreateGradeLevel={handleCreateGradeLevel}
            setGradeForm={setGradeForm}
            setShowGradeModal={setShowGradeModal}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showEditSubjectModal && (
          <EditSubjectModal
            subject={editingSubject}
            handleUpdateSubject={handleUpdateSubject}
            setShowEditSubjectModal={(v) => {
              setShowEditSubjectModal(v);
              if (!v) setEditingSubject(null);
            }}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showManageSubjectsModal && selectedGradeLevel && (
          <ManageSubjectsModal
            classrooms={classrooms}
            handleCreateClassGroupInline={handleCreateClassGroupInline}
            handleToggleOffering={handleToggleOffering}
            handleSyncOfferingsToRooms={handleSyncOfferingsToRooms}
            newClassGroupName={newClassGroupName}
            newClassGroupTeacherId={newClassGroupTeacherId}
            offerings={offerings}
            selectedGradeLevel={selectedGradeLevel}
            setNewClassGroupName={setNewClassGroupName}
            setNewClassGroupTeacherId={setNewClassGroupTeacherId}
            setShowManageSubjectsModal={setShowManageSubjectsModal}
            subjects={subjects}
            submitting={submitting}
            teachers={teachers}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSyllabusModal && (
          <SyllabusBuilderModal
            aiCustomPrompt={aiCustomPrompt}
            generatingAi={generatingAi}
            gradeLevels={gradeLevels}
            handleAddCriteria={handleAddCriteria}
            handleAddObjective={handleAddObjective}
            handleAddUnit={handleAddUnit}
            handleCreateSyllabus={handleCreateSyllabus}
            handleCriteriaChange={handleCriteriaChange}
            handleGenerateAiSyllabus={handleGenerateAiSyllabus}
            handleLoadSyllabusTemplate={handleLoadSyllabusTemplate}
            handleObjectiveChange={handleObjectiveChange}
            handleRemoveCriteria={handleRemoveCriteria}
            handleRemoveObjective={handleRemoveObjective}
            handleRemoveUnit={handleRemoveUnit}
            handleUnitChange={handleUnitChange}
            handleUnitPeriodChange={handleUnitPeriodChange}
            handleReimportCalendarWeights={handleReimportCalendarWeights}
            handleCustomizeWeights={handleCustomizeWeights}
            calendar={calendar}
            calendarSettingsPath={slug ? `/${slug}/settings/academic-calendar` : ""}
            isTeacherScoped={isTeacherSyllabusScope}
            teachingScope={teachingScope}
            classroomsPath={slug ? `/${slug}/classrooms` : ""}
            setAiCustomPrompt={setAiCustomPrompt}
            setShowSyllabusModal={closeSyllabusModal}
            editingSyllabusId={editingSyllabusId}
            setSyllabusForm={setSyllabusForm}
            subjects={subjects}
            submitting={submitting}
            syllabusForm={syllabusForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSyllabusViewModal && selectedSyllabus && (
          <SyllabusViewModal
            canManage={canManage}
            calendar={calendar}
            handleUpdateSyllabusStatus={handleUpdateSyllabusStatus}
            onEditSyllabus={openEditSyllabusModal}
            selectedSyllabus={selectedSyllabus}
            setShowSyllabusViewModal={setShowSyllabusViewModal}
            setSyllabusFeedback={setSyllabusFeedback}
            submitting={submitting}
            syllabusFeedback={syllabusFeedback}
            user={user}
          />
        )}
      </AnimatePresence>

      <CurriculumSetupWizard
        open={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onComplete={() => {
          void (async () => {
            try {
              await refetchCurriculum?.();
            } catch {}
          })();
          showToast("Setup wizard completed", "success");
        }}
      />
    </div>
  );
};


