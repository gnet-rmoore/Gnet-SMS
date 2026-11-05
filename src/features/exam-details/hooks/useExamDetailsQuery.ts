import { useQuery, useQueryClient } from "@tanstack/react-query";
import { examDetailsApi } from "../api";

export function useExamDetailsQuery(examId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["exam-details", examId],
    enabled: Boolean(examId),
    queryFn: async () => {
      if (!examId) throw new Error("Missing exam");
      const exam = await examDetailsApi.fetchExam(examId);
      const [submissionsSummary, teacherClassrooms] = await Promise.allSettled([
        examDetailsApi.fetchSubmissionsSummary(examId),
        examDetailsApi.fetchTeacherClassrooms(examId),
      ]);
      return {
        exam,
        grades: [],
        submissionsSummary:
          submissionsSummary.status === "fulfilled" ? submissionsSummary.value : null,
        teacherClassrooms:
          teacherClassrooms.status === "fulfilled" && Array.isArray(teacherClassrooms.value)
            ? teacherClassrooms.value
            : [],
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["exam-details", examId] });

  return {
    ...query,
    exam: query.data?.exam ?? null,
    grades: query.data?.grades ?? [],
    submissionsSummary: query.data?.submissionsSummary ?? null,
    teacherClassrooms: query.data?.teacherClassrooms ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
