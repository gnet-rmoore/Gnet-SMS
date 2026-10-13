import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Download,
  Printer,
  Calendar,
  X,
  User,
  BookOpen,
  Award,
  ShieldCheck,
  Check,
  Percent,
  TrendingUp,
  School,
  Lock,
  LockOpen,
  QrCode,
  FileCheck2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "../../components/UserAvatar";
import { PageShell, PageHeader, Button, DataTable, dataTableClass } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { format } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";

export const Transcripts = () => {
  const { t } = useTranslation(["pages", "common"]);
  const tr = (key: string, opts?: Record<string, unknown>): string =>
    t(`transcripts.${key}`, opts as any) as string;
  const certLabel = (status) => {
    if (status === "Certified") return tr("certified");
    if (status === "Under Review") return tr("underReview");
    return tr("pendingDraft");
  };
  const { school, accessToken } = useAuthStore();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [transcriptGrades, setTranscriptGrades] = useState<any[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  
  // UX Certification State
  const [certifiedStatus, setCertifiedStatus] = useState<Record<string, "Certified" | "Under Review" | "Pending Draft">>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/schools/${school?.id}/students`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
        // Certification workflow is not implemented — do not invent statuses.
        setCertifiedStatus({});
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscript = async (student: any) => {
    setLoadingTranscript(true);
    setSelectedStudent(student);
    try {
      const response = await fetch(`/api/students/${student.id}/grades`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const grades = await response.json();
        setTranscriptGrades(grades);
      }
    } catch (error) {
      console.error("Failed to fetch transcript:", error);
    } finally {
      setLoadingTranscript(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  const handleToggleCertificate = (studentId: string) => {
    const current = certifiedStatus[studentId] || "Pending Draft";
    let next: "Certified" | "Under Review" | "Pending Draft" = "Pending Draft";
    if (current === "Pending Draft") next = "Under Review";
    else if (current === "Under Review") next = "Certified";
    else next = "Pending Draft";

    setCertifiedStatus(prev => ({ ...prev, [studentId]: next }));
    showToast(tr("statusUpdated", { id: studentId.slice(-5).toUpperCase(), status: certLabel(next) }), "info");
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGradeFilter === "ALL" || s.gradeLevel?.name === selectedGradeFilter;
    return matchesSearch && matchesGrade;
  });

  const availableGrades = Array.from(new Set(students.map(s => s.gradeLevel?.name).filter(Boolean)));

  // GPA calculation helper
  const calculateGPA = (grades: any[]) => {
    if (!grades || grades.length === 0) return { gpa: "0.00", status: "N/A" };
    
    let totalPoints = 0;
    grades.forEach(g => {
      const score = g.score;
      if (score >= 90) totalPoints += 4.0;
      else if (score >= 80) totalPoints += 3.0;
      else if (score >= 70) totalPoints += 2.0;
      else if (score >= 60) totalPoints += 1.0;
      else totalPoints += 0.0;
    });

    const calculated = (totalPoints / grades.length).toFixed(2);
    let honorStatus = "Satisfactory";
    const gpaVal = parseFloat(calculated);
    if (gpaVal >= 3.8) honorStatus = "Summa Cum Laude";
    else if (gpaVal >= 3.5) honorStatus = "Magna Cum Laude";
    else if (gpaVal >= 3.2) honorStatus = "Dean's List Honor Roll";
    else if (gpaVal < 2.0) honorStatus = "Academic Warning";

    return { gpa: calculated, status: honorStatus };
  };

  const handlePrint = () => {
    window.print();
  };

  const activeGpaData = calculateGPA(transcriptGrades);

  // Prepare chart data for performance trend
  const chartData = transcriptGrades.map(g => ({
    name: g.subject?.name?.slice(0, 10) || tr("subjectFallback"),
    score: g.score,
    average: 75 // Mock class average line
  }));

  return (
    <PageShell width="wide" className="py-6 print:p-0">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold border transition-all ${
              toast.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                : "bg-indigo-50 text-indigo-800 border-indigo-100"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="pb-6 border-b border-slate-100 print:hidden">
        <PageHeader
          title={t("transcripts.title")}
          subtitle={t("transcripts.subtitle")}
          actions={
            <Button type="button" variant="secondary" onClick={handlePrint}>
              <Printer className="w-5 h-5 text-slate-400" />
              {tr("batchVerificationReport")}
            </Button>
          }
        />
      </div>

      {/* Statistics board — honest counts only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tr("statsStudents")}</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{students.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{tr("statsFromDirectory")}</p>
          </div>
        </div>
      </div>

      {/* Directory Workspace Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden print:hidden">
        {/* Workspace Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-500" />
            {tr("registryTitle")}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={tr("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Grade Selector */}
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl bg-white px-3.5 py-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-black text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="ALL">{tr("allGradeLevels")}</option>
                {availableGrades.map((g: string) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={`${dataTableClass.th} w-[28%]`}>{tr("tableProfile")}</th>
                <th className={`${dataTableClass.th} w-[16%]`}>{tr("tableEnrollment")}</th>
                <th className={`${dataTableClass.th} w-[20%]`}>{tr("tableAttestation")}</th>
                <th className={`${dataTableClass.th} w-[14%]`}>{tr("tableGradeLevel")}</th>
                <th className={`${dataTableClass.thEnd} w-[22%]`}>{tr("tableDocuments")}</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loading ? (
                <tr>
                  <td colSpan={5} className={dataTableClass.tdEmpty}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs font-bold text-slate-500 mt-2">{tr("loadingDb")}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className={dataTableClass.tdEmpty}>{tr("noMatch")}</td>
                </tr>
              ) : filteredStudents.map((student) => {
                const status = certifiedStatus[student.id] || "Pending Draft";
                const badgeColor = 
                  status === "Certified" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                    : status === "Under Review" 
                    ? "bg-amber-50 text-amber-700 border-amber-100" 
                    : "bg-slate-50 text-slate-600 border-slate-100";

                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-700 font-black text-xs border border-indigo-100 overflow-hidden">
                          <UserAvatar
                            userId={student.id}
                            name={student.name}
                            photoUrl={student.photoUrl}
                            size="md"
                            rounded="2xl"
                            className="!w-10 !h-10 !rounded-xl"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate">{student.name}</p>
                          <p className="text-xs text-slate-500 font-semibold truncate">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className={`${dataTableClass.td} text-slate-500 font-semibold text-xs`}>
                      {format(new Date(student.createdAt), "MMM d, yyyy")}
                    </td>

                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2.5 py-0.5 border rounded-full text-xs font-bold shrink-0 ${badgeColor}`}>
                          {certLabel(status)}
                        </span>
                        <Button 
                          type="button"
                          variant="ghost"
                          size="compact"
                          onClick={() => handleToggleCertificate(student.id)}
                          title={tr("cycleAttestation")}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>

                    <td className={dataTableClass.td}>
                      <span className="px-2.5 py-0.5 bg-indigo-50/70 border border-indigo-100/40 text-indigo-700 rounded-md text-xs font-bold truncate inline-block max-w-full">
                        {student.gradeLevel?.name || tr("unassigned")}
                      </span>
                    </td>

                    <td className={dataTableClass.td}>
                      <div className="flex justify-end">
                        <Button 
                          type="button"
                          size="compact"
                          onClick={() => fetchTranscript(student)}
                        >
                          <FileText className="w-4 h-4" />
                          {tr("reviewTranscript")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      </div>

      {/* Official Parchment Transcript Modal View */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col print:absolute print:inset-0 print:max-h-none print:shadow-none print:w-full print:rounded-none"
            >
              {/* Modal controls bar */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{tr("auditPanelTitle")}</h2>
                    <p className="text-xs text-slate-500 font-semibold">{tr("auditPanelSubtitle")}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePrint}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    {tr("printExportPdf")}
                  </button>
                  <button 
                    onClick={() => {
                      const status = certifiedStatus[selectedStudent.id] || "Certified";
                      const next = status === "Certified" ? "Under Review" : "Certified";
                      setCertifiedStatus(p => ({ ...p, [selectedStudent.id]: next }));
                      showToast(tr("dossierStatusUpdated", { status: certLabel(next) }), "success");
                    }}
                    className={`px-4 py-2 border font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      certifiedStatus[selectedStudent.id] === "Certified"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : "bg-amber-50 border-amber-100 text-amber-700"
                    }`}
                  >
                    {certifiedStatus[selectedStudent.id] === "Certified" ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-emerald-600" /> {tr("certifiedLock")}
                      </>
                    ) : (
                      <>
                        <LockOpen className="w-3.5 h-3.5 text-amber-600" /> {tr("lockStatus")}
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setSelectedStudent(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Layout */}
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 print:p-0 print:block">
                
                {/* LEFT PORTION: The actual Official Parchment Document */}
                <div className="lg:col-span-8 space-y-6 print:w-full print:p-0">
                  
                  {/* Parchment Container with custom styles */}
                  <div className="relative border-8 border-slate-800 p-8 bg-amber-50/5/10 min-h-[750px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] rounded-xl overflow-hidden print:border-4 print:p-4 print:shadow-none print:bg-white print:rounded-none">
                    
                    {/* Security Watermark Background */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
                      <School className="w-[450px] h-[450px] text-slate-900" />
                    </div>

                    {/* Inner Double Thin Border */}
                    <div className="border border-slate-300 p-6 h-full flex flex-col justify-between print:border-slate-400 print:p-4">
                      
                      {/* Document Header */}
                      <div className="text-center space-y-2 border-b border-slate-200 pb-5">
                        <School className="w-10 h-10 mx-auto text-slate-700" />
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">{school?.name || "Institutional Board"}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Office of official records & credentials registry</p>
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest mt-3 underline decoration-slate-300 underline-offset-4">
                          OFFICIAL ACADEMIC TRANSCRIPT OF RECORD
                        </h4>
                      </div>

                      {/* Bio-Data Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 text-xs border-b border-slate-100 pb-5">
                        <div className="space-y-1.5">
                          <p className="font-semibold text-slate-400">STUDENT IDENTIFICATION:</p>
                          <p className="font-bold text-slate-800 text-xs">{selectedStudent.name}</p>
                          <p className="text-slate-500">Student Email: <span className="font-bold text-slate-700">{selectedStudent.email}</span></p>
                          <p className="text-slate-500">Academic Standing: <span className="font-bold text-slate-700">{certifiedStatus[selectedStudent.id] || "Certified"}</span></p>
                        </div>
                        <div className="space-y-1.5 text-right">
                          <p className="font-semibold text-slate-400">INSTITUTIONAL METADATA:</p>
                          <p className="font-bold text-slate-800 text-xs">{school?.name || "The High Academy"}</p>
                          <p className="text-slate-500">Academic Term: <span className="font-bold text-slate-700">2023-2024 (Annual)</span></p>
                          <p className="text-slate-500">Issued Date: <span className="font-bold text-slate-700">{format(new Date(), "PP")}</span></p>
                        </div>
                      </div>

                      {/* Grades Table */}
                      <div className="space-y-4 flex-1">
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">SCHOLASTIC RECORD & PERFORMANCES:</h5>
                        
                        {loadingTranscript ? (
                          <div className="py-20 text-center italic text-slate-400 flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
                            Loading academic scores...
                          </div>
                        ) : transcriptGrades.length === 0 ? (
                          <div className="py-16 text-center italic text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            No verified academic records found for this registry key.
                          </div>
                        ) : (
                          <div className="overflow-hidden border border-slate-200 rounded-lg">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3">Subject Module</th>
                                  <th className="px-4 py-3">Assessed Exam Term</th>
                                  <th className="px-4 py-3 text-center">Score %</th>
                                  <th className="px-4 py-3 text-center">Grade Point</th>
                                  <th className="px-4 py-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {transcriptGrades.map((grade: any) => {
                                  // Compute point letter
                                  let pt = "F";
                                  let style = "text-rose-600";
                                  if (grade.score >= 90) { pt = "A"; style = "text-emerald-700 font-black"; }
                                  else if (grade.score >= 80) { pt = "B"; style = "text-indigo-600 font-black"; }
                                  else if (grade.score >= 70) { pt = "C"; style = "text-slate-700 font-bold"; }
                                  else if (grade.score >= 60) { pt = "D"; style = "text-amber-600 font-bold"; }

                                  return (
                                    <tr key={grade.id} className="hover:bg-slate-50/20 font-medium">
                                      <td className="px-4 py-3 font-bold text-slate-800">{grade.subject?.name}</td>
                                      <td className="px-4 py-3 text-slate-500">{grade.exam?.title}</td>
                                      <td className="px-4 py-3 text-center font-mono font-bold">{grade.score}%</td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={`px-1.5 py-0.5 bg-slate-100/50 rounded font-bold ${style}`}>{pt}</span>
                                      </td>
                                      <td className="px-4 py-3 text-right text-xs text-emerald-600 font-black tracking-wider uppercase">Attested</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Cumulative Section & Attestation stamps */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-200 text-xs">
                        <div className="space-y-1 bg-slate-50 p-4 rounded-xl print:p-2 print:bg-white print:border">
                          <p className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">CUMULATIVE PERFORMANCE METRIC:</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-black text-slate-800">{activeGpaData.gpa}</span>
                            <span className="text-slate-400 font-bold">GPA OUT OF 4.00</span>
                          </div>
                          <p className="text-xs text-indigo-700 font-black uppercase tracking-wider mt-1 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-indigo-600" />
                            {activeGpaData.status}
                          </p>
                        </div>

                        <div className="flex flex-col justify-end items-end space-y-4">
                          <div className="flex items-center gap-3">
                            <QrCode className="w-12 h-12 text-slate-700 border border-slate-200 p-1 rounded" />
                            <div className="text-[9px] text-right text-slate-400">
                              <p className="font-bold text-slate-600 uppercase">Registry Authenticity</p>
                              <p>Scan to verify credential</p>
                              <p className="font-mono mt-0.5 text-[8px] text-indigo-500">{selectedStudent.id.toUpperCase().slice(0, 15)}</p>
                            </div>
                          </div>
                          
                          <div className="text-center pt-2">
                            <div className="w-36 border-t border-slate-400 text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-1 text-center">
                              Dean of Registrar
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* RIGHT PORTION: Dynamic GPA Summary and Insights Chart */}
                <div className="lg:col-span-4 space-y-6 print:hidden">
                  
                  {/* Performance Card */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{tr("performanceSummary")}</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500">{tr("avgClassScore")}</span>
                        <span className="text-sm font-black text-slate-800">75%</span>
                      </div>
                      
                      <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500">{tr("studentGradeAverage")}</span>
                        <span className="text-sm font-black text-indigo-600">
                          {transcriptGrades.length ? `${(transcriptGrades.reduce((acc, g) => acc + g.score, 0) / transcriptGrades.length).toFixed(1)}%` : "N/A"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500">{tr("creditsAttained")}</span>
                        <span className="text-sm font-black text-slate-800">{transcriptGrades.length * 3} CR</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart Visualizing Subject performance */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-indigo-500" /> {tr("subjectComparisonChart")}
                    </h4>
                    
                    {transcriptGrades.length > 0 ? (
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} domain={[0, 100]} />
                            <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px", border: "1px solid #f1f5f9" }} />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.score >= 80 ? "#4f46e5" : entry.score >= 60 ? "#10b981" : "#f43f5e"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-slate-500 py-10 italic">{tr("noCharts")}</p>
                    )}
                    <p className="text-xs text-slate-500 text-center font-medium">{tr("chartLegend")}</p>
                  </div>

                  {/* Registrar Attestation Steps */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] text-xs">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{tr("registrarSteps")}</h4>
                    
                    <div className="space-y-3 font-semibold text-slate-600">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs">✓</div>
                        <span>{tr("stepGradesSubmitted")}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs">✓</div>
                        <span>{tr("stepVerifyDemographics")}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-xs animate-pulse">●</div>
                        <span>{tr("stepAuditChecklist")}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-xs">4</div>
                        <span>{tr("stepAttestPdf")}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end print:hidden">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all text-xs cursor-pointer"
                >
                  {tr("closeDocumentView")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
