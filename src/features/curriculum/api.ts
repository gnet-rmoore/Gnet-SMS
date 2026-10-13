import { api } from "../../services/api";

/** Thin API wrappers for the curriculum feature. */
export const curriculumApi = {
  fetchSubjects: (schoolId: string, page?: number, pageSize?: number) =>
    api.get(
      `/api/schools/${schoolId}/subjects${
        page || pageSize
          ? `?${new URLSearchParams({
              ...(page ? { page: String(page) } : {}),
              ...(pageSize ? { pageSize: String(pageSize) } : {}),
            })}`
          : ""
      }`
    ),
  fetchGradeLevels: (schoolId: string, page?: number, pageSize?: number) =>
    api.get(
      `/api/schools/${schoolId}/grade-levels${
        page || pageSize
          ? `?${new URLSearchParams({
              ...(page ? { page: String(page) } : {}),
              ...(pageSize ? { pageSize: String(pageSize) } : {}),
            })}`
          : ""
      }`
    ),
  fetchSubjectOfferings: (schoolId: string, gradeLevelId?: string) =>
    api.get(
      `/api/schools/${schoolId}/subject-offerings${
        gradeLevelId ? `?gradeLevelId=${encodeURIComponent(gradeLevelId)}` : ""
      }`
    ),
  createSubjectOffering: (schoolId: string, data: { subjectId: string; gradeLevelId: string }) =>
    api.post(`/api/schools/${schoolId}/subject-offerings`, data),
  deleteSubjectOffering: (id: string) => api.delete(`/api/subject-offerings/${id}`),
  backfillSubjectOfferings: (
    schoolId: string,
    pairs: Array<{ subjectId: string; gradeLevelId: string }>
  ) => api.post(`/api/schools/${schoolId}/subject-offerings/backfill`, { pairs }),
  syncSubjectRooms: (
    schoolId: string,
    assignments: Array<{
      classGroupId: string;
      subjectId: string;
      subjectName?: string;
      subjectCode?: string;
      teacherId: string;
      gradeLevelId?: string;
    }>
  ) => api.post(`/api/schools/${schoolId}/classrooms/sync-subject-rooms`, { assignments }),
  backfillParentLinks: (schoolId: string) =>
    api.post(`/api/schools/${schoolId}/classrooms/backfill-parent-links`, {}),
  fetchOfferingPairs: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/classrooms/offering-pairs`),
  fetchClassrooms: (schoolId: string, page?: number, pageSize?: number) =>
    api.get(
      `/api/schools/${schoolId}/classrooms${
        page || pageSize
          ? `?${new URLSearchParams({
              ...(page ? { page: String(page) } : {}),
              ...(pageSize ? { pageSize: String(pageSize) } : {}),
            })}`
          : ""
      }`
    ),
  fetchSyllabi: (schoolId: string, page?: number, pageSize?: number) =>
    api.get(
      `/api/schools/${schoolId}/syllabi${
        page || pageSize
          ? `?${new URLSearchParams({
              ...(page ? { page: String(page) } : {}),
              ...(pageSize ? { pageSize: String(pageSize) } : {}),
            })}`
          : ""
      }`
    ),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  createSubject: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/subjects`, data),
  createGradeLevel: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/grade-levels`, data),
  seedGradeLevels: (schoolId: string) =>
    api.post(`/api/schools/${schoolId}/grade-levels/seed`, {}),
  createClassroom: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/classrooms`, data),
  createSyllabus: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/syllabi`, data),
  generateAiSyllabus: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/syllabi/generate-ai`, data),
  updateSyllabus: (id: string, data: unknown) => api.patch(`/api/syllabi/${id}`, data),
  deleteSyllabus: (id: string) => api.delete(`/api/syllabi/${id}`),
  updateSubject: (id: string, data: unknown) => api.patch(`/api/subjects/${id}`, data),
  deleteSubject: (id: string) => api.delete(`/api/subjects/${id}`),
  updateGradeLevel: (id: string, data: unknown) => api.patch(`/api/grade-levels/${id}`, data),
  deleteGradeLevel: (id: string) => api.delete(`/api/grade-levels/${id}`),
  fetchDivisions: (schoolId: string) => api.get(`/api/schools/${schoolId}/divisions`),
  seedDivisions: (schoolId: string) =>
    api.post(`/api/schools/${schoolId}/divisions/seed`, {}),
  createDivision: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/divisions`, data),
};
