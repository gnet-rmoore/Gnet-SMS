import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  Camera,
  CameraOff,
  Coffee,
  Play,
  ChevronsRight,
  ChevronLeft,
} from "lucide-react";
import { formatSafe } from "../utils/dateHelpers";
import { Button, DataTable, dataTableClass } from "../../../components/ui";

export type AttendanceTabProps = {
  attendanceHistory: any[];
  todayAttendance: any;
  user: any;
  clockViewState: "widget" | "clockInScreen";
  setClockViewState: (v: "widget" | "clockInScreen") => void;
  breakState: any;
  elapsedWorkTime: string;
  elapsedBreakTime: string;
  useCamera: boolean;
  setUseCamera: (v: boolean) => void;
  cameraError: string | null;
  flashActive: boolean;
  attendanceNote: string;
  setAttendanceNote: (v: string) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: Date;
  historyPage: number;
  historyPageSizeDays: number;
  historyHasMore: boolean;
  onHistoryPageChange: (page: number) => void;
  onMarkBreak: () => void;
  onMarkAttendance: (type: "checkIn" | "checkOut") => void;
  onPreviewPhoto: (photo: { url: string; title: string }) => void;
};

export function AttendanceTab(props: AttendanceTabProps) {
  const {
    attendanceHistory,
    todayAttendance,
    clockViewState,
    setClockViewState,
    breakState,
    elapsedWorkTime,
    elapsedBreakTime,
    useCamera,
    setUseCamera,
    cameraError,
    flashActive,
    attendanceNote,
    setAttendanceNote,
    videoRef,
    historyPage,
    historyPageSizeDays,
    historyHasMore,
    onHistoryPageChange,
    onMarkBreak,
    onMarkAttendance,
    onPreviewPhoto,
  } = props;

  const { t } = useTranslation(["pages", "common"]);

  const handleMarkAttendance = onMarkAttendance;
  const handleMarkBreak = onMarkBreak;
  const setPreviewPhoto = (p: any) => {
    if (p) onPreviewPhoto(p);
  };

  return (
    <motion.div
      key="attendance"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-1 space-y-6">
        {clockViewState === "widget" ? (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 px-5 py-4 text-white flex items-center justify-between text-sm select-none">
              <span className="font-extrabold tracking-tight">{t("staffPortal.attendance.timeClock")}</span>
              <ChevronsRight className="w-5 h-5 text-indigo-400" />
            </div>

            <div className="p-6 space-y-5 relative min-h-[300px] flex flex-col justify-between bg-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-indigo-50 text-indigo-700 px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider border border-indigo-100">
                    {t("staffPortal.attendance.lastClockIn")}
                  </span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {todayAttendance?.checkIn ? formatSafe(todayAttendance.checkIn, "hh:mm:ss a") : "–"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="bg-indigo-50 text-indigo-700 px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider border border-indigo-100">
                    {t("staffPortal.attendance.lastClockOut")}
                  </span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {todayAttendance?.checkOut ? formatSafe(todayAttendance.checkOut, "hh:mm:ss a") : "–"}
                  </span>
                </div>

                <div className="border-t border-slate-100 my-2" />

                <div className="flex items-center justify-between">
                  <span className="bg-indigo-50 text-indigo-700 px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider border border-indigo-100">
                    {t("staffPortal.attendance.firstClockIn")}
                  </span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {todayAttendance?.checkIn ? formatSafe(todayAttendance.checkIn, "hh:mm:ss a") : "–"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{t("staffPortal.attendance.netWorkTime")}</p>
                    <p className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">{elapsedWorkTime}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{t("staffPortal.attendance.totalBreak")}</p>
                    <p className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">{elapsedBreakTime}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1">
                  <span>{t("staffPortal.attendance.status")}</span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                      !todayAttendance?.checkIn
                        ? "bg-rose-50 text-rose-600 border border-rose-100"
                        : breakState.isOnBreak
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : todayAttendance.checkOut
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}
                  >
                    {!todayAttendance?.checkIn
                      ? t("staffPortal.attendance.outOfOffice")
                      : breakState.isOnBreak
                        ? <span className="font-medium text-amber-700">{t("staffPortal.attendance.onBreak")}</span>
                        : todayAttendance.checkOut
                          ? t("staffPortal.attendance.shiftCompleted")
                          : t("staffPortal.attendance.onDuty")}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 z-10">
                <button
                  type="button"
                  onClick={() => setClockViewState("clockInScreen")}
                  className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgb(0,0,0,0.08)] cursor-pointer transition-colors outline-none"
                  title={t("staffPortal.attendance.openTimeClock")}
                >
                  <Clock className="w-7 h-7" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-4 font-bold text-slate-800">
              <button
                type="button"
                onClick={() => setClockViewState("widget")}
                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title={t("common:back")}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-extrabold tracking-tight">{t("staffPortal.attendance.timeClock")}</span>
            </div>

            <div className="p-5 space-y-4 bg-slate-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("staffPortal.attendance.cameraVerification")}
                  </span>

                  <button
                    type="button"
                    onClick={() => setUseCamera(!useCamera)}
                    disabled={!!todayAttendance?.checkOut}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                      useCamera ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] transform duration-200 ${
                        useCamera ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {useCamera && (!todayAttendance?.checkIn || !todayAttendance?.checkOut) && (
                  <div className="relative aspect-video w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
                    {cameraError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <CameraOff className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-xs font-bold text-slate-500">{cameraError}</p>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute bottom-2 left-2 bg-slate-950/75 rounded-md px-2 py-0.5 text-[9px] font-bold text-slate-300 font-mono flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          <span>{t("staffPortal.attendance.cameraOn")}</span>
                        </div>
                      </>
                    )}

                    <AnimatePresence>
                      {flashActive && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0 bg-white z-20 flex items-center justify-center"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {!useCamera && (
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 text-center">
                    <CameraOff className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-500">{t("staffPortal.attendance.cameraOffTitle")}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {t("staffPortal.attendance.cameraOffHint")}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {t("staffPortal.attendance.shiftNotes")}
                </label>
                <textarea
                  value={attendanceNote}
                  onChange={(e) => setAttendanceNote(e.target.value)}
                  placeholder={t("staffPortal.attendance.shiftNotesPlaceholder")}
                  disabled={!!todayAttendance?.checkOut}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-16 transition-all text-slate-700 placeholder-slate-400 font-medium"
                />
              </div>

              {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleMarkBreak}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border ${
                      breakState.isOnBreak
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {breakState.isOnBreak ? (
                      <>
                        <Play className="w-4 h-4" />
                        <span>{t("staffPortal.attendance.endBreakResume")}</span>
                      </>
                    ) : (
                      <>
                        <Coffee className="w-4 h-4" />
                        <span>{t("staffPortal.attendance.goOnBreak")}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="pt-2">
                {!todayAttendance?.checkIn ? (
                  <button
                    type="button"
                    onClick={() => handleMarkAttendance("checkIn")}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm tracking-wide uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>{t("staffPortal.attendance.clockIn")}</span>
                  </button>
                ) : !todayAttendance?.checkOut ? (
                  <button
                    type="button"
                    onClick={() => handleMarkAttendance("checkOut")}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm tracking-wide uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>{t("staffPortal.attendance.clockOut")}</span>
                  </button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                    <p className="text-sm font-extrabold text-emerald-800">{t("staffPortal.attendance.shiftCompleted")}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{t("staffPortal.attendance.shiftCompletedHint")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{t("staffPortal.attendance.logTitle")}</h3>
              <p className="text-xs font-medium text-slate-500">{t("staffPortal.attendance.logSubtitle")}</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl font-mono">
              {attendanceHistory.length}
            </span>
          </div>

          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("common:date")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.attendance.colCheckIn")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.attendance.colCheckOut")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.attendance.colDuration")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.attendance.colNotes")}</th>
                  <th className={dataTableClass.thEnd}>{t("staffPortal.attendance.colStatus")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {attendanceHistory.map((record, i) => {
                  let durationStr = "--";
                  if (record.checkIn && record.checkOut) {
                    const checkInTime = new Date(record.checkIn).getTime();
                    const checkOutTime = new Date(record.checkOut).getTime();

                    let breakMins = 0;
                    if (record.notes && /Total Break Taken:\s*\d+\s*mins/m.test(record.notes)) {
                      const match = record.notes.match(/Total Break Taken:\s*(\d+)\s*mins?\.?/);
                      if (match) {
                        breakMins = parseInt(match[1]);
                      }
                    }

                    const diffMs = checkOutTime - checkInTime;
                    const cleanMs = Math.max(0, diffMs - breakMins * 60 * 1000);
                    const hours = Math.floor(cleanMs / (1000 * 60 * 60));
                    const mins = Math.floor((cleanMs % (1000 * 60 * 60)) / (1000 * 60));

                    durationStr = `${hours}h ${mins}m`;
                    if (breakMins > 0) {
                      durationStr += t("staffPortal.attendance.breakSuffix", { minutes: breakMins });
                    }
                  } else if (record.checkIn && !record.checkOut) {
                    durationStr = t("staffPortal.attendance.inProgress");
                  }

                  return (
                    <tr key={record.id || i} className="hover:bg-slate-50/50 transition-colors">
                      <td className={`${dataTableClass.td} font-bold text-slate-800`}>
                        {formatSafe(record.date, "MMM dd, yyyy")}
                      </td>
                      <td className={`${dataTableClass.td} font-medium text-slate-600 font-mono text-xs`}>
                        <div className="flex items-center gap-2">
                          <span>{record.checkIn ? formatSafe(record.checkIn, "hh:mm:ss a") : "--:--"}</span>
                          {record.photoIn && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: record.photoIn,
                                  title: t("staffPortal.attendance.checkInPhoto", {
                                    date: formatSafe(record.date, "MMM dd, yyyy"),
                                  }),
                                })
                              }
                              className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                              title={t("staffPortal.attendance.viewPhoto")}
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`${dataTableClass.td} font-medium text-slate-600 font-mono text-xs`}>
                        <div className="flex items-center gap-2">
                          <span>{record.checkOut ? formatSafe(record.checkOut, "hh:mm:ss a") : "--:--"}</span>
                          {record.photoOut && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: record.photoOut,
                                  title: t("staffPortal.attendance.checkOutPhoto", {
                                    date: formatSafe(record.date, "MMM dd, yyyy"),
                                  }),
                                })
                              }
                              className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                              title={t("staffPortal.attendance.viewPhoto")}
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`${dataTableClass.td} font-bold text-indigo-600 font-mono text-xs`}>{durationStr}</td>
                      <td className={`${dataTableClass.td} text-xs text-slate-500 truncate`} title={record.notes}>
                        {record.notes || <span className="text-slate-300 italic">{t("staffPortal.attendance.noNotes")}</span>}
                      </td>
                      <td className={`${dataTableClass.td} text-end`}>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            record.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {attendanceHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className={dataTableClass.tdEmpty}>
                      <Clock className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <span>{t("staffPortal.attendance.noRecords")}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DataTable>

          {(historyPage > 1 || historyHasMore) && (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-500">
                {t("staffPortal.attendance.pageInfo", {
                  page: historyPage,
                  days: historyPageSizeDays,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  disabled={historyPage <= 1}
                  onClick={() => onHistoryPageChange(historyPage - 1)}
                >
                  {t("staffPortal.attendance.newerRecords")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  disabled={!historyHasMore}
                  onClick={() => onHistoryPageChange(historyPage + 1)}
                >
                  {t("staffPortal.attendance.olderRecords")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
