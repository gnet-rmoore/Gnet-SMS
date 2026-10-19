import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { AnimatePresence } from "motion/react";
import {
  Clock,
  ClipboardList,
  Megaphone,
  DollarSign,
  FolderOpen,
  CalendarDays,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { staffPortalApi } from "./api";
import { useStaffPortalQuery } from "./hooks/useStaffPortalQuery";
import { useStaffAttendanceQuery } from "./hooks/useStaffAttendanceQuery";
import { useStaffPortalBadges } from "./hooks/useStaffPortalBadges";
import { LeaveRequestModal } from "./components/LeaveRequestModal";
import { PhotoPreviewModal } from "./components/PhotoPreviewModal";
import { AttendanceTab } from "./components/AttendanceTab";
import { PayrollTab } from "./components/PayrollTab";
import { confirmAction, alertError } from "../../lib/swal";
import { LeaveTab } from "./components/LeaveTab";
import { AnnouncementsTab } from "./components/AnnouncementsTab";
import { formatSafe } from "./utils/dateHelpers";
import { TasksTab } from "./components/TasksTab";
import { DocumentsTab } from "./components/DocumentsTab";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { UserAvatar } from "../../components/UserAvatar";
import { useTranslation } from "react-i18next";

export const StaffPortal = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { user, school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "tasks" | "announcements" | "documents" | "payroll">("attendance");
  const [attendanceHistoryPage, setAttendanceHistoryPage] = useState(1);
  const {
    leaves,
    leaveBalances,
    tasks,
    announcements,
    documents,
    payrolls,
    loading: portalLoading,
    invalidate: refetchStaffPortal,
  } = useStaffPortalQuery(activeTab);
  const {
    todayAttendance,
    attendanceHistory,
    attendancePage,
    attendancePageSizeDays,
    attendanceHasMore,
    loading: attendanceLoading,
    invalidate: refetchAttendance,
  } = useStaffAttendanceQuery(attendanceHistoryPage, activeTab === "attendance");
  const { pendingTasksCount, unreadAnnouncementsCount, invalidate: invalidateBadges } =
    useStaffPortalBadges();
  const loading = portalLoading || (activeTab === "attendance" && attendanceLoading);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    type: "SICK",
    startDate: "",
    endDate: "",
    reason: ""
  });
  
  // Custom interactive state
  const [attendanceNote, setAttendanceNote] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentCategory, setDocumentCategory] = useState<string>("ALL");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("ALL");
  const [expandedPayrollId, setExpandedPayrollId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Camera & attendance states
  const [useCamera, setUseCamera] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // HR.my clock-in clock-out stages states
  const [clockViewState, setClockViewState] = useState<"widget" | "clockInScreen">("widget");

  const fetchData = () => {
    refetchStaffPortal();
    refetchAttendance();
    invalidateBadges();
  };

  // HR.my break & live session state
  const [breakState, setBreakState] = useState<{
    isOnBreak: boolean;
    breakStartTime: string | null;
    totalBreakDurationMs: number;
  }>(() => {
    try {
      const saved = localStorage.getItem(`sms_break_state_${user?.id}`);
      return saved ? JSON.parse(saved) : { isOnBreak: false, breakStartTime: null, totalBreakDurationMs: 0 };
    } catch {
      return { isOnBreak: false, breakStartTime: null, totalBreakDurationMs: 0 };
    }
  });

  // Save break state to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`sms_break_state_${user.id}`, JSON.stringify(breakState));
    }
  }, [breakState, user?.id]);

  const [elapsedWorkTime, setElapsedWorkTime] = useState<string>("00:00:00");
  const [elapsedBreakTime, setElapsedBreakTime] = useState<string>("00:00:00");

  // Camera activation side effect
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const hasPendingCheck = !todayAttendance || !todayAttendance.checkIn || !todayAttendance.checkOut;

    if (useCamera && (activeTab as string) === "attendance" && clockViewState === "clockInScreen" && hasPendingCheck) {
      navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } })
        .then((stream) => {
          setCameraStream(stream);
          activeStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraError(null);
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setCameraError(t("staffPortal.errors.cameraAccess"));
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useCamera, activeTab, clockViewState, todayAttendance?.checkIn, todayAttendance?.checkOut, user?.id, t]);

  const capturePhoto = (): string | null => {
    if (!videoRef.current) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Match mirrored live preview so the saved photo faces the user correctly.
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, 400, 300);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.fillRect(0, 250, 400, 50);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`${user?.name || t("staffPortal.staffMember")}`, 15, 270);
        ctx.fillText(`${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, 15, 288);

        return canvas.toDataURL("image/jpeg", 0.85);
      }
    } catch (e) {
      console.error("Failed to capture image", e);
    }
    return null;
  };
  
  // Keep digital clock, work duration, and break duration live
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());

      if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
        const checkInTime = new Date(todayAttendance.checkIn).getTime();
        const now = new Date().getTime();
        
        let totalWorkedMs = now - checkInTime;
        let cumulativeBreakMs = breakState.totalBreakDurationMs;

        if (breakState.isOnBreak && breakState.breakStartTime) {
          const currentBreakMs = now - new Date(breakState.breakStartTime).getTime();
          cumulativeBreakMs += currentBreakMs;
          
          // Format current break duration live
          const breakSecs = Math.floor(currentBreakMs / 1000) % 60;
          const breakMins = Math.floor(currentBreakMs / (1000 * 60)) % 60;
          const breakHours = Math.floor(currentBreakMs / (1000 * 60 * 60));
          setElapsedBreakTime(
            `${String(breakHours).padStart(2, "0")}:${String(breakMins).padStart(2, "0")}:${String(breakSecs).padStart(2, "0")}`
          );
        } else {
          setElapsedBreakTime("00:00:00");
        }

        // Subtract break duration from total worked time
        const cleanWorkedMs = Math.max(0, totalWorkedMs - cumulativeBreakMs);
        const workSecs = Math.floor(cleanWorkedMs / 1000) % 60;
        const workMins = Math.floor(cleanWorkedMs / (1000 * 60)) % 60;
        const workHours = Math.floor(cleanWorkedMs / (1000 * 60 * 60));
        setElapsedWorkTime(
          `${String(workHours).padStart(2, "0")}:${String(workMins).padStart(2, "0")}:${String(workSecs).padStart(2, "0")}`
        );
      } else if (todayAttendance?.checkIn && todayAttendance?.checkOut) {
        // Shift completed
        const checkInTime = new Date(todayAttendance.checkIn).getTime();
        const checkOutTime = new Date(todayAttendance.checkOut).getTime();
        const totalWorkedMs = Math.max(0, (checkOutTime - checkInTime) - breakState.totalBreakDurationMs);
        
        const workSecs = Math.floor(totalWorkedMs / 1000) % 60;
        const workMins = Math.floor(totalWorkedMs / (1000 * 60)) % 60;
        const workHours = Math.floor(totalWorkedMs / (1000 * 60 * 60));
        setElapsedWorkTime(
          `${String(workHours).padStart(2, "0")}:${String(workMins).padStart(2, "0")}:${String(workSecs).padStart(2, "0")}`
        );
        setElapsedBreakTime("00:00:00");
      } else {
        setElapsedWorkTime("00:00:00");
        setElapsedBreakTime("00:00:00");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [todayAttendance?.checkIn, todayAttendance?.checkOut, breakState]);

  const handleMarkBreak = () => {
    if (breakState.isOnBreak) {
      // Resume Work
      const breakEnd = new Date().getTime();
      const breakStart = new Date(breakState.breakStartTime!).getTime();
      const diffMs = Math.max(0, breakEnd - breakStart);
      setBreakState((prev) => ({
        isOnBreak: false,
        breakStartTime: null,
        totalBreakDurationMs: prev.totalBreakDurationMs + diffMs
      }));
    } else {
      // Start Break
      setBreakState((prev) => ({
        ...prev,
        isOnBreak: true,
        breakStartTime: new Date().toISOString()
      }));
    }
  };

  const handleMarkAttendance = async (type: "checkIn" | "checkOut") => {
    if (!school?.id) return;

    // Capture verification photo immediately while the user is still facing the camera.
    let photoData: string | undefined;
    if (useCamera) {
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 300);
      photoData = capturePhoto() || undefined;
    }

    const label = type === "checkIn" ? t("staffPortal.confirm.checkIn") : t("staffPortal.confirm.checkOut");
    const confirmTitle =
      type === "checkIn" ? t("staffPortal.confirm.confirmCheckIn") : t("staffPortal.confirm.confirmCheckOut");
    const now = new Date();
    const ok = await confirmAction({
      title: confirmTitle,
      html: `
        <div class="text-left text-sm text-slate-500 space-y-2">
          <p>${t("staffPortal.confirm.confirmBody")}</p>
          <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-1.5 mt-3">
            <div class="flex justify-between gap-3"><span class="font-bold text-slate-400">${t("staffPortal.confirm.staffLabel")}</span><span class="font-bold text-slate-700">${user?.name || "—"}</span></div>
            <div class="flex justify-between gap-3"><span class="font-bold text-slate-400">${t("staffPortal.confirm.dateLabel")}</span><span class="font-mono font-bold text-slate-700">${format(now, "yyyy-MM-dd")}</span></div>
            <div class="flex justify-between gap-3"><span class="font-bold text-slate-400">${t("staffPortal.confirm.timeLabel")}</span><span class="font-mono font-bold text-slate-700">${format(now, "hh:mm:ss a")}</span></div>
            ${useCamera ? `<p class="pt-2 border-t border-slate-200 text-xs font-bold text-indigo-600">${t("staffPortal.confirm.cameraOnHint")}</p>` : ""}
          </div>
        </div>
      `,
      confirmText: label,
      danger: type === "checkOut",
      icon: "question",
    });
    if (!ok) return;

    try {
      let finalNote = attendanceNote;
      if (type === "checkOut") {
        let finalBreakMs = breakState.totalBreakDurationMs;
        if (breakState.isOnBreak && breakState.breakStartTime) {
          const breakStart = new Date(breakState.breakStartTime).getTime();
          finalBreakMs += Math.max(0, new Date().getTime() - breakStart);
        }

        const breakMins = Math.round(finalBreakMs / (1000 * 60));
        if (breakMins > 0) {
          finalNote = `${attendanceNote ? attendanceNote + " | " : ""}${t("staffPortal.confirm.breakNote", { minutes: breakMins })}`;
        }

        setBreakState({ isOnBreak: false, breakStartTime: null, totalBreakDurationMs: 0 });
        if (user?.id) {
          localStorage.removeItem(`sms_break_state_${user.id}`);
        }
      }

      await staffPortalApi.markAttendance(school.id, type, finalNote, photoData || undefined);
      setAttendanceNote("");
      setClockViewState("widget");
      setAttendanceHistoryPage(1);
      fetchData();
      showToast(
        type === "checkIn" ? t("staffPortal.toast.checkedIn") : t("staffPortal.toast.checkedOut"),
        "success"
      );
    } catch (err) {
      await alertError(t("staffPortal.errors.attendanceFailed"), t("staffPortal.errors.attendanceFailedHint"));
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    // Validate date range
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      if (start > end) {
        await alertError(t("staffPortal.errors.leaveStartAfterEnd"), t("staffPortal.errors.leaveDateRangeHint"));
        return;
      }
      if (start.getTime() === end.getTime()) {
        await alertError(t("staffPortal.errors.leaveSameDay"), t("staffPortal.errors.leaveSameDayHint"));
        return;
      }
    }
    try {
      await staffPortalApi.createLeaveRequest(school.id, leaveForm);
      setShowLeaveModal(false);
      setLeaveForm({ type: "SICK", startDate: "", endDate: "", reason: "" });
      fetchData();
      showToast(t("staffPortal.toast.leaveSubmitted"), "success");
    } catch (err: any) {
      await alertError(
        t("staffPortal.errors.leaveFailed"),
        err?.message || t("staffPortal.errors.leaveFailedHint")
      );
    }
  };

  const handleUpdateTask = async (taskId: string, status: string) => {
    try {
      await staffPortalApi.updateTaskStatus(taskId, status);
      fetchData();
      showToast(t("staffPortal.toast.taskUpdated"), "success");
    } catch (err) {
      await alertError(t("staffPortal.errors.taskUpdateFailed"), t("staffPortal.errors.taskUpdateFailedHint"));
    }
  };

  const handleAcknowledgeAnnouncement = async (id: string) => {
    try {
      setAcknowledgingId(id);
      await staffPortalApi.acknowledgeAnnouncement(id);
      fetchData();
      showToast(t("staffPortal.toast.announcementAcknowledged"), "success");
    } catch (err: any) {
      await alertError(
        t("staffPortal.errors.acknowledgeFailed"),
        err?.message || t("staffPortal.errors.acknowledgeFailedHint")
      );
    } finally {
      setAcknowledgingId(null);
    }
  };



  // Filter lists based on interactive state
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(documentSearch.toLowerCase()) || 
                          (doc.description && doc.description.toLowerCase().includes(documentSearch.toLowerCase()));
    const matchesCategory = documentCategory === "ALL" || doc.category === documentCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
                          (task.description && task.description.toLowerCase().includes(taskSearch.toLowerCase()));
    const normalizedPriority = task.priority === "MEDIUM" ? "NORMAL" : task.priority;
    const filterPriority = taskPriorityFilter === "ALL" ? "ALL" : taskPriorityFilter;
    const matchesPriority = filterPriority === "ALL" || normalizedPriority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      <PageToast toast={toast} />

      <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <UserAvatar
              userId={user?.id}
              name={user?.name}
              photoUrl={user?.photoUrl}
              size="lg"
              rounded="2xl"
              className="w-16 h-16 md:w-20 md:h-20 text-xl md:text-2xl border-2 border-indigo-100"
            />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${todayAttendance?.checkIn && !todayAttendance?.checkOut ? "bg-emerald-500" : "bg-slate-400"}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {user?.role ? user.role.replace("_", " ") : t("staffPortal.staffMember")}
              </span>
              {school?.id && (
                <span className="text-xs font-medium text-slate-400 font-mono">
                  {school.id.substring(0, 8)}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5 font-dashboard">
              {t("staffPortal.title")}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              {t("staffPortal.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-4 w-full lg:w-auto">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5 flex-1 sm:flex-initial">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">{t("staffPortal.localTime")}</p>
              <p className="text-sm font-extrabold text-slate-800 font-mono mt-1">
                {formatSafe(currentTime, "hh:mm:ss a")}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {formatSafe(currentTime, "EEE, MMM dd, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto">
        {[
          { id: "attendance", label: t("staffPortal.tabs.attendance"), icon: Clock },
          { id: "leave", label: t("staffPortal.tabs.leave"), icon: CalendarDays },
          { id: "tasks", label: t("staffPortal.tabs.tasks"), icon: ClipboardList, badge: pendingTasksCount },
          { id: "announcements", label: t("staffPortal.tabs.announcements"), icon: Megaphone, badge: unreadAnnouncementsCount },
          { id: "documents", label: t("staffPortal.tabs.documents"), icon: FolderOpen },
          { id: "payroll", label: t("staffPortal.tabs.payroll"), icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="px-1.5 py-0.5 rounded-lg text-xs font-bold leading-none bg-indigo-50 text-indigo-600">
                  {tab.badge}
                </span>
              ) : null}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-500">{t("staffPortal.loading")}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {(activeTab as string) === "attendance" && (
              <AttendanceTab
                attendanceHistory={attendanceHistory}
                todayAttendance={todayAttendance}
                user={user}
                clockViewState={clockViewState}
                setClockViewState={setClockViewState}
                breakState={breakState}
                elapsedWorkTime={elapsedWorkTime}
                elapsedBreakTime={elapsedBreakTime}
                useCamera={useCamera}
                setUseCamera={setUseCamera}
                cameraError={cameraError}
                flashActive={flashActive}
                attendanceNote={attendanceNote}
                setAttendanceNote={setAttendanceNote}
                videoRef={videoRef}
                currentTime={currentTime}
                historyPage={attendancePage}
                historyPageSizeDays={attendancePageSizeDays}
                historyHasMore={attendanceHasMore}
                onHistoryPageChange={setAttendanceHistoryPage}
                onMarkBreak={handleMarkBreak}
                onMarkAttendance={handleMarkAttendance}
                onPreviewPhoto={(photo) => setPreviewPhoto(photo)}
              />
            )}

            {activeTab === "leave" && (
              <LeaveTab
                leaves={leaves}
                leaveBalances={leaveBalances}
                onOpenLeaveModal={() => setShowLeaveModal(true)}
              />
            )}

            {/* TAB: TASKS */}
            {activeTab === "tasks" && (
              <TasksTab
                filteredTasks={filteredTasks}
                handleUpdateTask={handleUpdateTask}
                setTaskPriorityFilter={setTaskPriorityFilter}
                setTaskSearch={setTaskSearch}
                taskPriorityFilter={taskPriorityFilter}
                taskSearch={taskSearch}
              />
            )}

            {/* TAB: ANNOUNCEMENTS */}
            {activeTab === "announcements" && (
              <AnnouncementsTab
                announcements={announcements}
                acknowledgingId={acknowledgingId}
                onAcknowledge={handleAcknowledgeAnnouncement}
              />
            )}

            {/* TAB: DOCUMENTS */}
            {activeTab === "documents" && (
              <DocumentsTab
                documentCategory={documentCategory}
                documentSearch={documentSearch}
                filteredDocuments={filteredDocuments}
                setDocumentCategory={setDocumentCategory}
                setDocumentSearch={setDocumentSearch}
              />
            )}

            {/* TAB: PAYROLL */}
            {activeTab === "payroll" && (
              <PayrollTab
                payrolls={payrolls}
                user={user}
                school={school}
                expandedPayrollId={expandedPayrollId}
                setExpandedPayrollId={setExpandedPayrollId}
                showToast={showToast}
              />
            )}

          </AnimatePresence>
        )}
      </div>

      {/* 3. Leave Request Modal with clean visual transition */}
      <AnimatePresence>
        {showLeaveModal && (
          <LeaveRequestModal
            handleCreateLeave={handleCreateLeave}
            leaveForm={leaveForm}
            setLeaveForm={setLeaveForm}
            setShowLeaveModal={setShowLeaveModal}
          />
        )}
      </AnimatePresence>

      {/* Captured Photo Full Preview Modal */}
      <AnimatePresence>
        {previewPhoto && (
          <PhotoPreviewModal
            previewPhoto={previewPhoto}
            setPreviewPhoto={setPreviewPhoto}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
