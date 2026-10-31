import type React from "react";
import { useTranslation } from "react-i18next";
import { curriculumApi } from "../api";
import { useSyllabusFormHandlers } from "./useSyllabusFormHandlers";
import {
  buildTeachingScope,
  createAdminSyllabusFormDefaults,
  createTeacherSyllabusFormDefaults,
  isValidTeachingPair,
} from "../teacherTeachingScope";
import { hasActiveCalendar, type ActiveCalendar } from "../../academics-shared/syllabusCalendar";

export type PageActionsDeps = {
  school: any;
  accessToken: any;
  user: any;
  subjects: any;
  gradeLevels: any;
  classrooms: any;
  offerings?: any;
  refetchCurriculum: any;
  syllabusForm: any;
  setSyllabusForm: any;
  aiCustomPrompt: any;
  setAiCustomPrompt: any;
  setGeneratingAi: any;
  setSubmitting: any;
  setShowSyllabusModal: any;
  setShowSyllabusViewModal: any;
  setSyllabusFeedback: any;
  subjectForm: any;
  setSubjectForm: any;
  manuallyEditedCode: any;
  setManuallyEditedCode: any;
  subjectGradeLevelId: any;
  setSubjectGradeLevelId: any;
  addSubjectSelectedClassIds: any;
  setAddSubjectSelectedClassIds: any;
  addSubjectClassTeachers: any;
  setAddSubjectClassTeachers: any;
  setShowSubjectModal: any;
  gradeForm: any;
  setGradeForm: any;
  setShowGradeModal: any;
  selectedGradeLevel: any;
  newClassGroupName: any;
  setNewClassGroupName: any;
  newClassGroupTeacherId: any;
  setNewClassGroupTeacherId: any;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  requestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
  }) => Promise<boolean>;
  calendar?: ActiveCalendar | null;
  editingSyllabusId?: string | null;
  setEditingSyllabusId?: (id: string | null) => void;
};

/** Handlers/actions extracted from Page.tsx to keep the page under 800 lines. */
export function usePageActions(deps: PageActionsDeps) {
  const {
    school,
    accessToken,
    user,
    subjects,
    gradeLevels,
    classrooms,
    offerings = [],
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
    calendar = null,
    editingSyllabusId = null,
    setEditingSyllabusId,
  } = deps;

  const { t } = useTranslation(["pages", "common"]);

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
  } = useSyllabusFormHandlers({
    syllabusForm,
    setSyllabusForm,
    aiCustomPrompt,
    setAiCustomPrompt,
    setGeneratingAi,
    school,
    accessToken,
    subjects,
    gradeLevels,
    showToast,
    calendar,
  });

  const fetchData = () => { refetchCurriculum(); };



  const handleCreateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;

    if (user?.role === "TEACHER") {
      const scope = buildTeachingScope(classrooms, user?.id, subjects, gradeLevels);
      if (!scope.hasTeachingRooms) {
        showToast(t("curriculum.syllabusBuilder.noTeachingRoomsTitle"), "error");
        return;
      }
      if (
        !isValidTeachingPair(
          scope.pairs,
          syllabusForm.subjectId,
          syllabusForm.gradeLevelId
        )
      ) {
        showToast(t("curriculum.toast.invalidTeachingPair"), "error");
        return;
      }
    }
    
    if (!hasActiveCalendar(calendar) || !syllabusForm.calendarPatternId) {
      showToast(t("curriculum.syllabusBuilder.calendarRequired"), "error");
      return;
    }

    const hasMissingRequiredFields =
      !syllabusForm.title.trim() ||
      !syllabusForm.academicYear.trim() ||
      !syllabusForm.standardsFramework.trim() ||
      !syllabusForm.subjectId ||
      !syllabusForm.gradeLevelId ||
      syllabusForm.objectives.length === 0 ||
      syllabusForm.objectives.some((objective: string) => !objective.trim()) ||
      syllabusForm.units.length === 0 ||
      syllabusForm.units.some(
        (unit: { week?: string; topic?: string; academicPeriodId?: string }) =>
          !unit.week?.trim() ||
          !unit.topic?.trim() ||
          (Boolean(calendar?.periods?.length) && !unit.academicPeriodId)
      ) ||
      syllabusForm.gradingCriteria.length === 0 ||
      syllabusForm.gradingCriteria.some(
        (item: { label?: string; weight?: number }) =>
          !item.label?.trim() || !Number.isFinite(Number(item.weight))
      );
    if (hasMissingRequiredFields) {
      showToast(
        t("curriculum.syllabusBuilder.requiredFields", {
          defaultValue: "Complete the required title, objectives, unit topics, periods, and grading fields.",
        }),
        "error"
      );
      return;
    }

    const totalWeights = syllabusForm.gradingCriteria.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeights - 100) >= 0.01) {
      showToast(t("curriculum.toast.weightsMustTotal100", { total: totalWeights }), "error");
      return;
    }

    setSubmitting(true);
    
    const selectedSubjectObj = subjects.find(s => s.id === syllabusForm.subjectId);
    const selectedGradeObj = gradeLevels.find(g => g.id === syllabusForm.gradeLevelId);
    
    const payload = {
      ...syllabusForm,
      teacherId: user?.id || "",
      teacherName: user?.name || "Teacher",
      subjectName: selectedSubjectObj?.name || "N/A",
      gradeLevelName: selectedGradeObj?.name || "N/A",
      status:
        editingSyllabusId && ["REJECTED", "DRAFT"].includes(syllabusForm.status)
          ? "PENDING"
          : syllabusForm.status || "PENDING",
    };

    try {
      const url = editingSyllabusId
        ? `/api/syllabi/${editingSyllabusId}`
        : `/api/schools/${school.id}/syllabi`;
      const method = editingSyllabusId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowSyllabusModal(false);
        setEditingSyllabusId?.(null);
        if (user?.role === "TEACHER") {
          const scope = buildTeachingScope(classrooms, user?.id, subjects, gradeLevels);
          setSyllabusForm(createTeacherSyllabusFormDefaults(scope.pairs, calendar));
        } else {
          setSyllabusForm(createAdminSyllabusFormDefaults(subjects, gradeLevels, calendar));
        }
        fetchData();
        showToast(
          editingSyllabusId
            ? t("curriculum.toast.syllabusResubmitted")
            : t("curriculum.toast.syllabusSubmitted")
        );
      } else {
        const errData = await res.json();
        showToast(errData.error || t("curriculum.toast.syllabusSubmitFailed"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("curriculum.toast.syllabusSubmitFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSyllabusStatus = async (id: string, newStatus: string, reviewFeedback?: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/syllabi/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          status: newStatus,
          feedback: reviewFeedback
        })
      });
      if (res.ok) {
        setShowSyllabusViewModal(false);
        setSyllabusFeedback("");
        fetchData();
        showToast(t("curriculum.toast.syllabusStatusUpdated", { status: newStatus }));
      } else {
        const errData = await res.json();
        showToast(errData.error || t("curriculum.toast.syllabusStatusFailed"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("curriculum.toast.verificationFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSyllabus = async (id: string) => {
    const ok = await requestConfirm({
      title: t("curriculum.confirm.deleteSyllabusTitle"),
      message: t("curriculum.confirm.deleteSyllabusText"),
      confirmLabel: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await curriculumApi.deleteSyllabus(id);
      fetchData();
      showToast(t("curriculum.toast.syllabusDeleted"), "info");
    } catch (err: any) {
      showToast(err?.message || t("curriculum.toast.syllabusDeleteFailed"), "error");
    }
  };

  const generateSubjectCode = (name: string) => {
    const clean = name.trim().toUpperCase();
    if (!clean) return "";
    const words = clean.split(/\s+/).filter(Boolean);
    let prefix = "";
    if (words.length === 1) {
      const word = words[0];
      prefix = word.length <= 4 ? word : word.substring(0, 4);
    } else {
      const initials = words.map(w => w[0]).join("");
      if (initials.length >= 3) {
        prefix = initials;
      } else {
        prefix = (words[0].substring(0, 2) + words[1].substring(0, 2));
      }
    }
    // Generate a secure random 3-digit number (100 to 999)
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${randomNum}`;
  };

  const handleNameChange = (name: string) => {
    setSubjectForm(prev => {
      const updated = { ...prev, name };
      if (!manuallyEditedCode) {
        updated.code = generateSubjectCode(name);
      }
      return updated;
    });
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) {
      showToast(t("curriculum.toast.schoolNotFound"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${school.id}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(subjectForm)
      });
      const data = await res.json();
      if (res.ok) {
        let assignMsg = "";
        if (subjectGradeLevelId) {
          try {
            await curriculumApi.createSubjectOffering(school.id, {
              subjectId: data.id,
              gradeLevelId: subjectGradeLevelId,
            });
          } catch {
            /* already offered or network — continue */
          }
          const gradeGroups = classrooms.filter(
            (c: any) => c.gradeLevelId === subjectGradeLevelId && !c.subjectId
          );
          if (gradeGroups.length > 0) {
            const assignments = gradeGroups.map((group: any) => ({
              classGroupId: group.id,
              subjectId: data.id,
              subjectName: data.name,
              subjectCode: data.code,
              teacherId: addSubjectClassTeachers[group.id] || group.ownerTeacherId,
              gradeLevelId: group.gradeLevelId || subjectGradeLevelId,
            }));
            await curriculumApi.syncSubjectRooms(school.id, assignments);
            assignMsg = t("curriculum.toast.subjectCreatedSynced", { count: gradeGroups.length });
          } else {
            assignMsg = t("curriculum.toast.subjectCreatedOffered");
          }
        }
        setShowSubjectModal(false);
        setSubjectForm({ name: "", code: "", description: "" });
        setSubjectGradeLevelId("");
        setManuallyEditedCode(false);
        setAddSubjectSelectedClassIds([]);
        setAddSubjectClassTeachers({});
        fetchData();
        showToast(t("curriculum.toast.subjectCreated", { name: data.name, suffix: assignMsg }));
      } else {
        showToast(data.error || t("curriculum.toast.subjectCreateFailed"), "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(t("curriculum.toast.subjectCreateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedGradeLevels = async () => {
    if (!school?.id) {
      showToast(t("curriculum.toast.schoolNotFound"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${school.id}/grade-levels/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchData();
        showToast(t("curriculum.toast.gradeLevelsSeeded"));
      } else {
        showToast(data.error || t("curriculum.toast.gradeLevelsSeedFailed"), "error");
      }
    } catch (err: any) {
      showToast(t("curriculum.toast.gradeLevelsSeedFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGradeLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) {
      showToast(t("curriculum.toast.schoolNotFound"), "error");
      return;
    }
    const trimmedName = gradeForm.name.trim();
    if (!trimmedName) {
      showToast(t("curriculum.toast.gradeLevelNameRequired"), "error");
      return;
    }
    const alreadyExists = gradeLevels.some(
      (gl) => gl.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (alreadyExists) {
      showToast(t("curriculum.toast.gradeLevelExists"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${school.id}/grade-levels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: trimmedName })
      });
      const data = await res.json();
      if (res.ok) {
        setShowGradeModal(false);
        setGradeForm({ name: "" });
        fetchData();
        showToast(t("curriculum.toast.gradeLevelCreated"));
      } else {
        showToast(data.error || t("curriculum.toast.gradeLevelCreateFailed"), "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(t("curriculum.toast.gradeLevelCreateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateClassGroupInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !selectedGradeLevel) return;
    if (!newClassGroupName.trim() || !newClassGroupTeacherId) {
      showToast(t("curriculum.toast.classGroupFieldsRequired"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${school.id}/classrooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: newClassGroupName,
          gradeLevelId: selectedGradeLevel.id,
          ownerTeacherId: newClassGroupTeacherId,
          organizationType: "SELF_CONTAINED",
          bannerColor: "bg-indigo-600"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewClassGroupName("");
        setNewClassGroupTeacherId("");
        fetchData();
        showToast(t("curriculum.toast.classGroupCreated"));
      } else {
        showToast(data.error || t("curriculum.toast.classGroupCreateFailed"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("curriculum.toast.classGroupCreateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubjectToClassGroup = async (subjectId: string, classGroupId: string) => {
    if (!school?.id) return;
    setSubmitting(true);
    try {
      const subject = subjects.find((s: any) => s.id === subjectId);
      const classGroup = classrooms.find((c: any) => c.id === classGroupId);
      if (!subject || !classGroup) return;

      if (classGroup.gradeLevelId) {
        try {
          await curriculumApi.createSubjectOffering(school.id, {
            subjectId,
            gradeLevelId: classGroup.gradeLevelId,
          });
        } catch {
          /* already offered */
        }
      }

      await curriculumApi.syncSubjectRooms(school.id, [
        {
          classGroupId,
          subjectId,
          subjectName: subject.name,
          subjectCode: subject.code,
          teacherId: classGroup.ownerTeacherId,
          gradeLevelId: classGroup.gradeLevelId,
        },
      ]);
      fetchData();
      showToast(t("curriculum.toast.subjectAssignedToGroup"));
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("curriculum.toast.subjectAssignFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleOffering = async (subjectId: string, enabled: boolean) => {
    if (!school?.id || !selectedGradeLevel) return;
    setSubmitting(true);
    try {
      if (enabled) {
        await curriculumApi.createSubjectOffering(school.id, {
          subjectId,
          gradeLevelId: selectedGradeLevel.id,
        });
        showToast(t("curriculum.toast.subjectOffered"));
      } else {
        const existing = (offerings || []).find(
          (o: any) => o.subjectId === subjectId && o.gradeLevelId === selectedGradeLevel.id
        );
        if (existing?.id) {
          await curriculumApi.deleteSubjectOffering(existing.id);
        }
        showToast(t("curriculum.toast.subjectRemovedFromGrade"), "info");
      }
      fetchData();
    } catch (err: any) {
      showToast(err?.message || t("curriculum.toast.offeringUpdateFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncOfferingsToRooms = async (
    assignments: Array<{
      classGroupId: string;
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      teacherId: string;
      gradeLevelId: string;
    }>
  ) => {
    if (!school?.id) return;
    if (!assignments.length) {
      showToast(t("curriculum.toast.selectTeachersForSync"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const result: any = await curriculumApi.syncSubjectRooms(school.id, assignments);
      fetchData();
      const created = result?.created?.length || 0;
      const updated = result?.updated?.length || 0;
      showToast(t("curriculum.toast.roomsSynced", { created, updated }));
    } catch (err: any) {
      showToast(err?.message || t("curriculum.toast.roomsSyncFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackfillCurriculumLinks = async () => {
    if (!school?.id) return;
    setSubmitting(true);
    try {
      const pairsRes: any = await curriculumApi.fetchOfferingPairs(school.id);
      const pairs = Array.isArray(pairsRes?.pairs) ? pairsRes.pairs : [];
      if (pairs.length) {
        await curriculumApi.backfillSubjectOfferings(school.id, pairs);
      }
      await curriculumApi.backfillParentLinks(school.id);
      fetchData();
      showToast(t("curriculum.toast.backfillDone"));
    } catch (err: any) {
      showToast(err?.message || t("curriculum.toast.backfillFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubject = async (id: string, data: any) => {
    try {
      const payload: any = {};
      if (data.name !== undefined) payload.name = String(data.name).trim();
      if (data.code !== undefined) payload.code = String(data.code).trim().toUpperCase();
      if (data.description !== undefined) payload.description = data.description;
      await curriculumApi.updateSubject(id, payload);
      await fetchData();
      showToast((t as any)("curriculum.toast.subjectUpdated") || "Subject updated", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("curriculum.toast.subjectUpdateFailed"), "error");
    }
  };

  const handleDeleteSubject = async (id: string) => {
    const ok = await requestConfirm({
      title: t("curriculum.confirm.deleteSubjectTitle"),
      message: t("curriculum.confirm.deleteSubjectText"),
      confirmLabel: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await curriculumApi.deleteSubject(id);
      fetchData();
      showToast(t("curriculum.toast.subjectDeleted"), "info");
    } catch (err: any) {
      showToast(err?.message || t("curriculum.toast.subjectDeleteFailed"), "error");
    }
  };

  const handleDeleteGradeLevel = async (id: string) => {
    const ok = await requestConfirm({
      title: t("curriculum.confirm.deleteGradeLevelTitle"),
      message: t("curriculum.confirm.deleteGradeLevelText"),
      confirmLabel: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/grade-levels/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        fetchData();
        showToast(t("curriculum.toast.gradeLevelDeleted"), "info");
      } else {
        const data = await res.json();
        showToast(data.error || t("curriculum.toast.gradeLevelDeleteFailed"), "error");
      }
    } catch (err: any) {
      showToast(err?.message || t("curriculum.toast.gradeLevelDeleteFailed"), "error");
    }
  };

  const handleUpdateGradeLevel = async (id: string, name: string) => {
    try {
      const trimmed = name?.trim();
      if (!trimmed) {
        showToast(t("curriculum.toast.gradeLevelUpdateFailed"), "error");
        return;
      }
      await curriculumApi.updateGradeLevel(id, { name: trimmed });
      await fetchData();
      showToast((t as any)("curriculum.toast.gradeLevelUpdated") || "Grade level updated", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || t("curriculum.toast.gradeLevelUpdateFailed"), "error");
    }
  };


  return {
    fetchData,
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
    generateSubjectCode,
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
  };
}
