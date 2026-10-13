import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { motion } from "motion/react";
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle,
  FileText,
  ChevronRight,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { ChildSwitcher } from "../../components/ChildSwitcher";
import { useSelectedChild } from "../../hooks/useSelectedChild";
import { PageShell, PageHeader, Button, DataTable, dataTableClass } from "../../components/ui";

interface GradeEntry {
  id: string;
  score: number;
  status: string;
  examId: string;
  exam: { title: string; startDate: string };
  examComponent?: { id: string; componentType: string; label: string; shortCode: string };
  subject: { name: string; code: string };
  classroom: { name: string };
}

export const StudentGrades = () => {
  const { studentId: paramStudentId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, school } = useAuthStore();
  const [grades, setGrades] = React.useState<GradeEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [studentName, setStudentName] = React.useState("");
  const [children, setChildren] = React.useState<Array<{ id: string; name: string }>>([]);
  const { studentId: selectedChildId, selectChild } = useSelectedChild();

  const isParent = user?.role === "PARENT";
  const studentId = paramStudentId || (isParent ? selectedChildId : user?.id);

  React.useEffect(() => {
    if (!isParent || !user?.id) return;
    fetch(`/api/parents/${user.id}/children`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (response) => (response.ok ? response.json() : []))
      .then((rows) => {
        const linked = Array.isArray(rows) ? rows.map((row) => ({ id: row.id, name: row.name })) : [];
        setChildren(linked);
        if (!selectedChildId && linked[0]?.id) selectChild(linked[0].id);
      })
      .catch(() => setChildren([]));
  }, [accessToken, isParent, selectChild, selectedChildId, user?.id]);

  const fetchGrades = React.useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}/grades`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGrades(data);
      }

      // Parent-safe child name comes from the linked-children response.
      if (isParent) {
        setStudentName(children.find((child) => child.id === studentId)?.name || "");
      } else if (paramStudentId && paramStudentId !== user?.id) {
        const userRes = await fetch(`/api/users/${paramStudentId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (userRes.ok) setStudentName((await userRes.json()).name);
      } else {
        setStudentName(user?.name || "");
      }
    } catch (error) {
      console.error("Failed to fetch grades:", error);
    } finally {
      setLoading(false);
    }
  }, [studentId, accessToken, user?.id, user?.name, paramStudentId, children, isParent]);

  React.useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  // Group grades by exam
  const groupedGrades = grades.reduce((acc, grade) => {
    const examTitle = grade.exam.title;
    if (!acc[examTitle]) {
      acc[examTitle] = {
        id: grade.examId,
        title: examTitle,
        date: grade.exam.startDate,
        grades: []
      };
    }
    acc[examTitle].grades.push(grade);
    return acc;
  }, {} as Record<string, { id: string; title: string; date: string; grades: GradeEntry[] }>);

  const examList = Object.values(groupedGrades).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getExamAverage = (examGrades: GradeEntry[]) => {
    let columns: Array<{ id: string; name: string; code: string; weightPct: number; isActive?: boolean }> = [];
    try {
      if (school?.gradebookConfig) {
        columns = JSON.parse(school.gradebookConfig).filter((c: any) => c.isActive !== false);
      }
    } catch (e) {
      console.error("Failed to parse gradebookConfig", e);
    }
    if (columns.length === 0) {
      columns = [
        { id: "homework", name: "Homework", code: "HW", weightPct: 20 },
        { id: "quizzes", name: "Quizzes", code: "QZ", weightPct: 20 },
        { id: "classwork", name: "Class Work", code: "CW", weightPct: 10 },
        { id: "midterm", name: "Midterm Exam", code: "MID", weightPct: 20 },
        { id: "final", name: "Final Exam", code: "FIN", weightPct: 30 }
      ];
    }

    const subjectsMap: Record<string, {
      subject: { name: string; code: string };
      scores: Record<string, number[]>;
    }> = {};

    examGrades.forEach((grade: any) => {
      const subCode = grade.subject.code;
      if (!subjectsMap[subCode]) {
        subjectsMap[subCode] = {
          subject: grade.subject,
          scores: {}
        };
      }
      const compCode = grade.examComponent?.shortCode || grade.examComponent?.componentType || "FIN";
      if (!subjectsMap[subCode].scores[compCode]) {
        subjectsMap[subCode].scores[compCode] = [];
      }
      subjectsMap[subCode].scores[compCode].push(grade.score || 0);
    });

    const subjectsList = Object.values(subjectsMap);

    let totalWeightedAvgSum = 0;
    let subjectsWithScoresCount = 0;

    subjectsList.forEach(subData => {
      let weightedSum = 0;
      let weightTotal = 0;
      let hasScores = false;

      columns.forEach(col => {
        const scores = subData.scores[col.code];
        if (scores && scores.length > 0) {
          const avg = scores.reduce((s, val) => s + val, 0) / scores.length;
          weightedSum += avg * (col.weightPct / 100);
          weightTotal += (col.weightPct / 100);
          hasScores = true;
        }
      });

      const finalAvg = hasScores && weightTotal > 0
        ? Math.round((weightedSum / weightTotal) * 10) / 10
        : (Object.values(subData.scores).flat().length > 0
           ? Math.round((Object.values(subData.scores).flat().reduce((s: any, v: any) => s + v, 0) / Object.values(subData.scores).flat().length) * 10) / 10
           : 0);

      if (hasScores || Object.values(subData.scores).flat().length > 0) {
        totalWeightedAvgSum += finalAvg;
        subjectsWithScoresCount++;
      }
    });

    return subjectsWithScoresCount > 0
      ? (totalWeightedAvgSum / subjectsWithScoresCount).toFixed(1)
      : (examGrades.length > 0 ? (examGrades.reduce((sum, g) => sum + (g.score || 0), 0) / examGrades.length).toFixed(1) : "0.0");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageShell width="wide" className="pb-20">
      <PageHeader
        title={paramStudentId ? `${studentName}'s Grade Sheet` : "My Grade Sheet"}
        subtitle="Academic performance and examination results"
        actions={
          <>
            {isParent && <ChildSwitcher children={children} studentId={studentId || ""} onChange={selectChild} />}
            <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <Award className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Overall Status</p>
                <p className="text-sm font-bold text-slate-900">Good Standing</p>
              </div>
            </div>
          </>
        }
      />

      {examList.length > 0 ? (
        <div className="space-y-8">
          {examList.map((exam, idx) => (
            <motion.div 
              key={exam.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 overflow-hidden"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-indigo-600 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{exam.title}</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      Released on {format(new Date(exam.date), "PPP")}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Average</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {getExamAverage(exam.grades)}%
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="compact"
                      onClick={() => navigate(`/gradesheet/${exam.id}${paramStudentId ? `/${paramStudentId}` : ""}`)}
                    >
                      <FileText className="w-4 h-4" />
                      Grade Sheet
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="compact"
                      onClick={() => navigate(`/report-card/${exam.id}${paramStudentId ? `/${paramStudentId}` : ""}`)}
                      className="shadow-lg shadow-indigo-100"
                    >
                      <Award className="w-4 h-4" />
                      Report Card
                    </Button>
                  </div>
                </div>
              </div>

              <DataTable>
                <table className={dataTableClass.table}>
                  <thead className={dataTableClass.thead}>
                    <tr>
                      <th className={`${dataTableClass.th} w-[34%]`}>Subject</th>
                      <th className={`${dataTableClass.th} w-[26%]`}>Class</th>
                      <th className={`${dataTableClass.th} w-[14%]`}>Score</th>
                      <th className={`${dataTableClass.th} w-[26%]`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={dataTableClass.tbody}>
                    {exam.grades.map((grade) => (
                      <tr key={grade.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className={dataTableClass.td}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 shrink-0 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {grade.subject.code}
                            </div>
                            <span className="font-bold text-slate-900 truncate min-w-0">{grade.subject.name}</span>
                          </div>
                        </td>
                        <td className={dataTableClass.td}>
                          <span className="text-sm font-medium text-slate-500 truncate block min-w-0">{grade.classroom.name}</span>
                        </td>
                        <td className={dataTableClass.td}>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${
                              (grade.score || 0) >= 70 ? "text-emerald-600" : 
                              (grade.score || 0) >= 50 ? "text-amber-600" : "text-rose-600"
                            }`}>
                              {grade.score !== null ? `${grade.score}%` : "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className={dataTableClass.td}>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Grades Released Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2">
            Your examination results will appear here once they have been reviewed and released by the school administration.
          </p>
        </div>
      )}
    </PageShell>
  );
};
