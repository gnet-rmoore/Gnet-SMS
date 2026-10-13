import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { enrichStudentsWithClassrooms, feesApi } from "../api";

export function useFeesQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const role = useAuthStore((s) => s.user?.role);
  const isPortalViewer = role === "STUDENT" || role === "PARENT";
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["fees", schoolId, isPortalViewer ? "mine" : "school"],
    enabled: Boolean(schoolId) || isPortalViewer,
    queryFn: async () => {
      if (isPortalViewer) {
        const fees = await feesApi.fetchMyFees();
        return {
          fees: Array.isArray(fees) ? fees : [],
          students: [] as unknown[],
        };
      }
      if (!schoolId) throw new Error("Missing school");

      const [feesSettled, studentsSettled] = await Promise.all([
        feesApi.fetchFees(schoolId),
        feesApi.fetchStudents(schoolId).catch(() => []),
      ]);

      const fees = Array.isArray(feesSettled) ? feesSettled : [];
      let students = Array.isArray(studentsSettled) ? studentsSettled : [];
      students = await enrichStudentsWithClassrooms(schoolId, students);

      const byStudentId = new Map(students.map((s: any) => [s.id, s]));
      const enrichedFees = fees.map((f: any) => {
        const member = byStudentId.get(f.studentId);
        if (!member) return f;
        return {
          ...f,
          student: {
            ...(f.student || {}),
            id: member.id,
            name: f.student?.name || member.name,
            email: f.student?.email || member.email,
            photoUrl: f.student?.photoUrl || member.photoUrl || null,
            classroomMembers: member.classroomMembers || [],
          },
        };
      });

      return { fees: enrichedFees, students };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["fees", schoolId] });

  return {
    ...query,
    fees: query.data?.fees ?? [],
    students: query.data?.students ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
