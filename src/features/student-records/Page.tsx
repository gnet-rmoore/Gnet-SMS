import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileText,
  Calendar,
  UserCheck,
  BookOpen,
  Edit,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Heart,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  Download,
  Check,
  UserX,
  FileCheck2,
  GraduationCap,
  Save,
  AlertTriangle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuthStore } from "../../store/authStore";
import { format } from "date-fns";
import { useStudentRecordsQuery } from "./hooks/useStudentRecordsQuery";
import { studentRecordsApi } from "./api";
import { StudentDetailPanel } from "./components/StudentDetailPanel";
import { AddRecordModal } from "./components/AddRecordModal";
import { DataTable, dataTableClass } from "../../components/ui";
import { confirmAction } from "../../lib/swal";

export const StudentRecords = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, accessToken } = useAuthStore();
  const {
    students,
    loading,
    invalidate: refetchStudentRecords,
  } = useStudentRecordsQuery();
  
  // UX UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // Edit Form state
  const [editForm, setEditForm] = useState<any>({
    name: "",
    email: "",
    phone: "",
    address: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    standing: "In Good Standing", // "In Good Standing" | "Academic Warning" | "Suspended"
    bloodType: "",
    allergies: "",
    notes: ""
  });

  // Add Form state
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    standing: "In Good Standing",
    bloodType: "O+",
    allergies: "",
    notes: "",
    gradeLevelId: ""
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = () => { refetchStudentRecords(); };


  const handleOpenDetail = (student: any) => {
    setSelectedStudent(student);
    setEditForm({
      name: student.name,
      email: student.email,
      phone: student.phone,
      address: student.address,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      standing: student.standing,
      bloodType: student.bloodType,
      allergies: student.allergies,
      notes: student.notes
    });
    setIsEditMode(false);
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return;
    try {
      const response = await fetch(`/api/users/${selectedStudent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone || undefined,
          address: editForm.address || undefined,
          parentName: editForm.parentName || undefined,
          parentPhone: editForm.parentPhone || undefined,
          parentEmail: editForm.parentEmail || undefined,
        })
      });

      if (response.ok) {
        setSelectedStudent((prev: any) => (prev ? { ...prev, ...editForm } : prev));
        await refetchStudentRecords();
        setIsEditMode(false);
        showToast(t("studentRecords.toast.updated"));
      } else {
        showToast(t("studentRecords.toast.updateFailed"), "error");
      }
    } catch (error) {
      console.error("Failed to update student:", error);
      showToast(t("studentRecords.toast.updateError"), "error");
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const ok = await confirmAction({
      title: t("studentRecords.confirm.deleteShortTitle"),
      text: t("studentRecords.confirm.deleteShortText"),
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
        await refetchStudentRecords();
        setSelectedStudent(null);
        showToast(t("studentRecords.toast.deletedInfo"), "info");
      } else {
        showToast(t("studentRecords.toast.deleteFailed"), "error");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      showToast(t("studentRecords.toast.deleteError"), "error");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/schools/${school?.id}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: addForm.name,
          email: addForm.email,
          gradeLevelId: addForm.gradeLevelId || undefined
        })
      });

      if (response.ok) {
        await response.json();
        await refetchStudentRecords();
        setIsAddOpen(false);
        setAddStep(1);
        setAddForm({
          name: "",
          email: "",
          phone: "",
          address: "",
          parentName: "",
          parentPhone: "",
          parentEmail: "",
          standing: "In Good Standing",
          bloodType: "O+",
          allergies: "",
          notes: "",
          gradeLevelId: ""
        });
        showToast(t("studentRecords.toast.registered"));
      } else {
        showToast(t("studentRecords.toast.registerFailed"), "error");
      }
    } catch (error) {
      console.error("Add student error:", error);
      showToast(t("studentRecords.toast.registerError"), "error");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Student Name", "Email", "Phone", "Standing", "Enrollment Date", "Parent", "Parent Contact", "Allergies"];
    const rows = filteredStudents.map(s => [
      s.name,
      s.email,
      s.phone,
      s.standing,
      format(new Date(s.createdAt), "yyyy-MM-dd"),
      s.parentName,
      s.parentPhone,
      s.allergies
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_directory_${school?.name?.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t("studentRecords.toast.exportedInfo"), "info");
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGrade = selectedGrade === "ALL" || 
                         (student.gradeLevel?.name === selectedGrade) ||
                         (selectedGrade === "N/A" && !student.gradeLevel);

    const matchesStatus = selectedStatus === "ALL" || student.standing === selectedStatus;

    return matchesSearch && matchesGrade && matchesStatus;
  });

  // Extract unique grades for filters
  const availableGrades = Array.from(new Set(students.map(s => s.gradeLevel?.name).filter(Boolean)));

  // Calculate Metrics
  const totalCount = students.length;
  const goodStandingCount = students.filter(s => s.standing === "In Good Standing").length;
  const probationCount = students.filter(s => s.standing === "Academic Warning").length;
  const suspendedCount = students.filter(s => s.standing === "Suspended").length;

  const standingLabel = (standing: string) => {
    if (standing === "In Good Standing") return t("studentRecords.standing.good");
    if (standing === "Academic Warning") return t("studentRecords.standing.warning");
    if (standing === "Suspended") return t("studentRecords.standing.suspended");
    return standing;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold border transition-all ${
              toast.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                : toast.type === "error" 
                ? "bg-rose-50 text-rose-800 border-rose-100" 
                : "bg-indigo-50 text-indigo-800 border-indigo-100"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {toast.type === "error" && <XCircle className="w-5 h-5 text-rose-600" />}
            {toast.type === "info" && <ShieldAlert className="w-5 h-5 text-indigo-600" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{t("studentRecords.eyebrow")}</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-dashboard">{t("studentRecords.title")}</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">{t("studentRecords.subtitle")}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={exportToCSV}
            className="px-5 py-3 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold rounded-xl shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            {t("studentRecords.exportDatabase")}
          </button>
          <button 
            onClick={() => {
              setAddStep(1);
              setIsAddOpen(true);
            }}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            {t("studentRecords.addStudentRecord")}
          </button>
        </div>
      </div>

      {/* Top Statistical Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("studentRecords.stats.totalEnrollment")}</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-slate-400">
              <span className="text-emerald-500 font-bold">100%</span> {t("studentRecords.stats.activeDossiers")}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("studentRecords.stats.goodStanding")}</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{goodStandingCount}</p>
            <div className="w-24 bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1 rounded-full transition-all duration-1000" 
                style={{ width: `${totalCount ? (goodStandingCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("studentRecords.stats.probation")}</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{probationCount}</p>
            <div className="w-24 bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-amber-500 h-1 rounded-full transition-all duration-1000" 
                style={{ width: `${totalCount ? (probationCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-inner">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("studentRecords.stats.suspendedRestrained")}</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{suspendedCount}</p>
            <div className="w-24 bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-rose-500 h-1 rounded-full transition-all duration-1000" 
                style={{ width: `${totalCount ? (suspendedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Workspace */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder={t("studentRecords.searchExtended")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 bg-slate-50/50">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-600 py-2.5 focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="ALL">{t("studentRecords.gradeAllLevels")}</option>
                {availableGrades.map((g: string) => (
                  <option key={g} value={g}>{g}</option>
                ))}
                <option value="N/A">{t("studentRecords.unassignedGrade")}</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 bg-slate-50/50">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-600 py-2.5 focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="ALL">{t("studentRecords.standingAll")}</option>
                <option value="In Good Standing">{t("studentRecords.standing.good")}</option>
                <option value="Academic Warning">{t("studentRecords.standing.warning")}</option>
                <option value="Suspended">{t("studentRecords.standing.suspended")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters Active Display */}
        {(searchTerm || selectedGrade !== "ALL" || selectedStatus !== "ALL") && (
          <div className="flex items-center justify-between bg-indigo-50/50 px-4 py-2.5 rounded-xl border border-indigo-50/70 text-xs">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold">
              <span className="font-bold">{t("studentRecords.activeFilters")}</span>
              {searchTerm && <span className="bg-indigo-100/60 px-2 py-0.5 rounded text-xs">"{searchTerm}"</span>}
              {selectedGrade !== "ALL" && <span className="bg-indigo-100/60 px-2 py-0.5 rounded text-xs">{selectedGrade}</span>}
              {selectedStatus !== "ALL" && (
                <span className="bg-indigo-100/60 px-2 py-0.5 rounded text-xs">
                  {standingLabel(selectedStatus)}
                </span>
              )}
            </div>
            <button 
              onClick={() => {
                setSearchTerm("");
                setSelectedGrade("ALL");
                setSelectedStatus("ALL");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
            >
              {t("studentRecords.clearFilters")}
            </button>
          </div>
        )}
      </div>

      {/* Main Student Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={dataTableClass.th}>{t("studentRecords.table.studentInfo")}</th>
                <th className={dataTableClass.th}>{t("studentRecords.table.registeredClass")}</th>
                <th className={dataTableClass.th}>{t("studentRecords.table.demographics")}</th>
                <th className={dataTableClass.th}>{t("studentRecords.table.emergencyContact")}</th>
                <th className={dataTableClass.thEnd}>{t("studentRecords.table.actions")}</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {loading ? (
                <tr>
                  <td colSpan={5} className={dataTableClass.tdEmpty}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs font-bold text-slate-500 mt-2">{t("studentRecords.loading")}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className={dataTableClass.tdEmpty}>
                    <div className="max-w-md mx-auto text-center space-y-2">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800">{t("studentRecords.empty.title")}</h3>
                      <p className="text-xs text-slate-500 font-medium">{t("studentRecords.empty.body")}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.map((student) => {
                const statusColor = 
                  student.standing === "In Good Standing" 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : student.standing === "Academic Warning" 
                    ? "bg-amber-50 text-amber-600 border-amber-100" 
                    : "bg-rose-50 text-rose-600 border-rose-100";

                return (
                  <tr 
                    key={student.id} 
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => handleOpenDetail(student)}
                  >
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative">
                          <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-700 font-black text-sm border border-indigo-100 overflow-hidden">
                            <UserAvatar
                              userId={student.id}
                              name={student.name}
                              photoUrl={student.photoUrl}
                              size="md"
                              rounded="2xl"
                              className="!w-11 !h-11 !rounded-xl"
                            />
                          </div>
                          {student.standing === "In Good Standing" && (
                            <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-all text-sm truncate">{student.name}</p>
                            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold font-mono">
                              #{student.id.slice(-5).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1 truncate">
                            <Mail className="w-3.5 h-3.5 inline text-slate-300 shrink-0" />
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className={dataTableClass.td}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-700 bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md">
                            {student.gradeLevel?.name || t("studentRecords.unassignedGrade")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {student.classrooms?.map((c: any) => c.classroom.name).join(", ") ||
                            t("studentRecords.table.noEnrolledSections")}
                        </p>
                      </div>
                    </td>

                    <td className={dataTableClass.td}>
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
                          {standingLabel(student.standing)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-300" /> {t("studentRecords.table.blood")}: {student.bloodType || "O+"}
                        </span>
                      </div>
                    </td>

                    <td className={dataTableClass.td}>
                      <div>
                        <p className="text-xs font-bold text-slate-800 truncate">{student.parentName || "Sarah Jennings"}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-300" /> {student.parentPhone || "+1 (555) 012-4192"}
                        </p>
                      </div>
                    </td>

                    <td className={`${dataTableClass.td} text-end`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenDetail(student)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title={t("studentRecords.table.viewDetails")}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
        
        {/* Table Summary Footer */}
        <div className="px-6 py-4 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
          <p>{t("studentRecords.footer.showing", { shown: filteredStudents.length, total: students.length })}</p>
          <div className="flex items-center gap-1 text-slate-400">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-slate-500">
              {[school?.name, t("studentRecords.footer.digitalRegistry")].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
      </div>

      {/* Slide-out Student Drawer / Detail View */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentDetailPanel
            editForm={editForm}
            handleDeleteStudent={handleDeleteStudent}
            handleUpdateStudent={handleUpdateStudent}
            isEditMode={isEditMode}
            selectedStudent={selectedStudent}
            setEditForm={setEditForm}
            setIsEditMode={setIsEditMode}
            setSelectedStudent={setSelectedStudent}
          />
        )}
      </AnimatePresence>

      {/* Add Record Modal Dialog */}
      <AnimatePresence>
        {isAddOpen && (
          <AddRecordModal
            addForm={addForm}
            addStep={addStep}
            handleAddStudent={handleAddStudent}
            school={school}
            setAddForm={setAddForm}
            setAddStep={setAddStep}
            setIsAddOpen={setIsAddOpen}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
