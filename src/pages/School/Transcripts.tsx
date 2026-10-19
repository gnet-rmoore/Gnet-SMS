import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Filter,
  Printer,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { UserAvatar } from "../../components/UserAvatar";
import { PageShell, PageHeader, Button, DataTable, dataTableClass } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import {
  TRANSCRIPT_TEMPLATE_OPTIONS,
  fetchTranscriptPdf,
  transcriptPdfFilename,
  transcriptsApi,
  type GradeLevelOption,
  type StudentOption,
  type TranscriptRecord,
  type TranscriptStatus,
} from "../../features/transcripts/api";

const PREPARE_ROLES = ["SCHOOL_ADMIN", "REGISTRAR"];
const APPROVE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"];

const STATUS_STYLES: Record<TranscriptStatus, string> = {
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200",
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_ICONS: Record<TranscriptStatus, typeof Clock> = {
  DRAFT: FileText,
  SUBMITTED: Clock,
  APPROVED: CheckCircle2,
  REJECTED: RotateCcw,
};

function defaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() >= 7 ? year : year - 1;
  return `${start}/${start + 1}`;
}

function safeDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function latestByStudent(records: TranscriptRecord[]): Map<string, TranscriptRecord> {
  const map = new Map<string, TranscriptRecord>();
  for (const record of records) {
    const current = map.get(record.studentId);
    if (!current || new Date(record.updatedAt) > new Date(current.updatedAt)) {
      map.set(record.studentId, record);
    }
  }
  return map;
}

export const Transcripts = () => {
  const { t } = useTranslation(["pages", "common"]);
  const tr = (key: string, opts?: Record<string, unknown>): string =>
    t(`transcripts.${key}`, opts as any) as string;
  const { school, user } = useAuthStore();
  const role = user?.role || "";
  const canPrepare = PREPARE_ROLES.includes(role);
  const canApprove = APPROVE_ROLES.includes(role);

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [records, setRecords] = useState<TranscriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"students" | "approvals" | "issued">(
    canApprove && !canPrepare ? "approvals" : "students"
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("APPROVED");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [prepareFor, setPrepareFor] = useState<StudentOption | null>(null);
  const [templateKey, setTemplateKey] = useState("classic");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [gradeLevel, setGradeLevel] = useState("");
  const [preparing, setPreparing] = useState(false);

  const [detail, setDetail] = useState<TranscriptRecord | null>(null);
  const [reviewMode, setReviewMode] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  const errorMessage = (err: any) => err?.message || tr("toastActionFailed");

  const load = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [studentRows, transcriptRows, gradeRows] = await Promise.all([
        transcriptsApi.listStudents(school.id).catch(() => [] as StudentOption[]),
        transcriptsApi.list(school.id),
        transcriptsApi.listGradeLevels(school.id).catch(() => [] as GradeLevelOption[]),
      ]);
      setStudents(Array.isArray(studentRows) ? studentRows : []);
      setRecords(Array.isArray(transcriptRows) ? transcriptRows : []);
      setGradeLevels(Array.isArray(gradeRows) ? gradeRows : []);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.id]);

  const latest = useMemo(() => latestByStudent(records), [records]);
  const gradeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const level of gradeLevels) {
      if (level?.id) map.set(level.id, level.name);
    }
    return map;
  }, [gradeLevels]);
  const studentGradeLevel = (student: StudentOption): string =>
    (student.gradeLevelId ? gradeNameById.get(student.gradeLevelId) : undefined) ||
    student.gradeLevel?.name ||
    latest.get(student.id)?.gradeLevel ||
    "";
  const pending = useMemo(() => records.filter((r) => r.status === "SUBMITTED"), [records]);
  const approved = useMemo(() => records.filter((r) => r.status === "APPROVED"), [records]);
  const returned = useMemo(() => records.filter((r) => r.status === "REJECTED"), [records]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      if (!term) return true;
      return (
        String(student.name || "").toLowerCase().includes(term) ||
        String(student.email || "").toLowerCase().includes(term)
      );
    });
  }, [students, search]);

  const recordRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = tab === "approvals" ? pending : records;
    return base.filter((record) => {
      if (statusFilter !== "ALL" && record.status !== statusFilter) return false;
      if (!term) return true;
      return (
        String(record.studentName || "").toLowerCase().includes(term) ||
        String(record.academicYear || "").toLowerCase().includes(term)
      );
    });
  }, [tab, pending, records, search, statusFilter]);

  const openPrepare = (student: StudentOption) => {
    setPrepareFor(student);
    setTemplateKey(latest.get(student.id)?.templateKey || "classic");
    setAcademicYear(latest.get(student.id)?.academicYear || defaultAcademicYear());
    setGradeLevel(studentGradeLevel(student));
  };

  const handlePrepare = async () => {
    if (!school?.id || !prepareFor) return;
    setPreparing(true);
    try {
      const record = await transcriptsApi.prepare(school.id, {
        studentId: prepareFor.id,
        templateKey,
        academicYear: academicYear || null,
        gradeLevel: gradeLevel || studentGradeLevel(prepareFor) || null,
      });
      setRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);
      setPrepareFor(null);
      setDetail(record);
      showToast(tr("toastPrepared", { name: record.studentName }));
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setPreparing(false);
    }
  };

  const replaceRecord = (record: TranscriptRecord) => {
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === record.id);
      return exists ? prev.map((r) => (r.id === record.id ? record : r)) : [record, ...prev];
    });
    setDetail((prev) => (prev && prev.id === record.id ? record : prev));
  };

  const handleSubmit = async (record: TranscriptRecord) => {
    setBusyAction("submit");
    try {
      const updated = await transcriptsApi.submit(record.id);
      replaceRecord(updated);
      showToast(tr("toastSubmitted"));
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusyAction(null);
    }
  };

  const handleReview = async () => {
    if (!reviewMode || !detail) return;
    if (reviewMode === "REJECT" && !reviewComment.trim()) {
      showToast(tr("commentRequired"), "error");
      return;
    }
    setBusyAction(reviewMode);
    try {
      const updated =
        reviewMode === "APPROVE"
          ? await transcriptsApi.approve(detail.id, reviewComment.trim())
          : await transcriptsApi.reject(detail.id, reviewComment.trim());
      replaceRecord(updated);
      setReviewMode(null);
      setReviewComment("");
      showToast(reviewMode === "APPROVE" ? tr("toastApproved") : tr("toastReturned"));
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownload = async (record: TranscriptRecord) => {
    setDownloading(true);
    try {
      const blob = await fetchTranscriptPdf(record.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = transcriptPdfFilename(record);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async (record: TranscriptRecord) => {
    setDownloading(true);
    try {
      const blob = await fetchTranscriptPdf(record.id);
      const url = URL.createObjectURL(blob);
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.src = url;
      frame.onload = () => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          window.open(url, "_blank", "noopener");
        }
      };
      document.body.appendChild(frame);
      window.setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(url);
      }, 120_000);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDownloading(false);
    }
  };

  const STATUS_KEYS: Record<TranscriptStatus, string> = {
    DRAFT: "statusDraft",
    SUBMITTED: "statusSubmitted",
    APPROVED: "statusApproved",
    REJECTED: "statusReturned",
  };
  const statusLabel = (status: TranscriptStatus) => tr(STATUS_KEYS[status]);

  const StatusBadge = ({ status }: { status: TranscriptStatus }) => {
    const Icon = STATUS_ICONS[status];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${STATUS_STYLES[status]}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {statusLabel(status)}
      </span>
    );
  };

  const tabs = [
    { key: "students" as const, label: tr("tabStudents"), count: students.length },
    { key: "approvals" as const, label: tr("tabApprovals"), count: pending.length },
    { key: "issued" as const, label: tr("tabIssued"), count: approved.length },
  ];

  const stats = [
    { label: tr("statsStudents"), value: students.length, icon: User, tone: "text-indigo-600 bg-indigo-50" },
    { label: tr("statsPending"), value: pending.length, icon: Clock, tone: "text-amber-600 bg-amber-50" },
    { label: tr("statsApproved"), value: approved.length, icon: ShieldCheck, tone: "text-emerald-600 bg-emerald-50" },
    { label: tr("statsReturned"), value: returned.length, icon: RotateCcw, tone: "text-rose-600 bg-rose-50" },
  ];

  return (
    <PageShell width="wide" className="py-6 space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            className={`fixed top-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold border ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : "bg-rose-50 text-rose-800 border-rose-100"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pb-6 border-b border-slate-100">
        <PageHeader
          title={t("transcripts.title")}
          subtitle={t("transcripts.subtitle")}
          actions={
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {tr("refresh")}
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.tone}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 font-mono">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
        <div className="px-4 pt-4 border-b border-slate-100 bg-slate-50/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                    tab === item.key
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-black ${
                      tab === item.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={tr("searchPlaceholder")}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
              </div>
              {tab === "issued" && (
                <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl bg-white px-3 py-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="bg-transparent border-none text-xs font-black text-slate-600 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">{tr("filterAll")}</option>
                    <option value="SUBMITTED">{tr("statusSubmitted")}</option>
                    <option value="APPROVED">{tr("statusApproved")}</option>
                    <option value="REJECTED">{tr("statusReturned")}</option>
                    <option value="DRAFT">{tr("statusDraft")}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">{tr("loading")}</p>
          </div>
        ) : tab === "students" ? (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={`${dataTableClass.th} w-[34%]`}>{tr("studentLabel")}</th>
                  <th className={`${dataTableClass.th} w-[18%]`}>{tr("gradeLevelLabel")}</th>
                  <th className={`${dataTableClass.th} w-[22%]`}>{tr("statusLabel")}</th>
                  <th className={`${dataTableClass.thEnd} w-[26%]`}>{tr("actionsLabel")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={dataTableClass.tdEmpty}>
                      {tr("noStudents")}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const record = latest.get(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className={dataTableClass.td}>
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              userId={student.id}
                              name={student.name}
                              photoUrl={student.photoUrl}
                              size="md"
                              rounded="2xl"
                              className="!w-10 !h-10 !rounded-xl shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{student.name}</p>
                              <p className="text-xs text-slate-500 font-semibold truncate">
                                {student.email || tr("noEmail")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={`${dataTableClass.td} text-xs font-bold text-slate-600`}>
                          {studentGradeLevel(student) || tr("unassigned")}
                        </td>
                        <td className={dataTableClass.td}>
                          {record ? (
                            <div className="space-y-1">
                              <StatusBadge status={record.status} />
                              <p className="text-[11px] text-slate-400 font-semibold">
                                {record.academicYear || "—"} · GPA {Number(record.gpa || 0).toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">{tr("notPrepared")}</span>
                          )}
                        </td>
                        <td className={dataTableClass.td}>
                          <div className="flex items-center justify-end gap-2">
                            {record && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="compact"
                                onClick={() => setDetail(record)}
                              >
                                <FileText className="w-4 h-4" />
                                {tr("viewTranscript")}
                              </Button>
                            )}
                            {canPrepare ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="compact"
                                onClick={() => openPrepare(student)}
                              >
                                <Sparkles className="w-4 h-4" />
                                {record ? tr("reprepare") : tr("prepareTranscript")}
                              </Button>
                            ) : record ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="compact"
                                onClick={() => setDetail(record)}
                              >
                                {tr("reviewTranscript")}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </DataTable>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={`${dataTableClass.th} w-[30%]`}>{tr("studentLabel")}</th>
                  <th className={`${dataTableClass.th} w-[14%]`}>{tr("academicYearLabel")}</th>
                  <th className={`${dataTableClass.th} w-[14%]`}>{tr("detailGpa")}</th>
                  <th className={`${dataTableClass.th} w-[20%]`}>{tr("statusLabel")}</th>
                  <th className={`${dataTableClass.thEnd} w-[22%]`}>{tr("actionsLabel")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {recordRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={dataTableClass.tdEmpty}>
                      {tab === "approvals" ? tr("noApprovals") : tr("noIssued")}
                    </td>
                  </tr>
                ) : (
                  recordRows.map(
                    (record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className={dataTableClass.td}>
                          <p className="font-bold text-slate-800 text-sm">{record.studentName}</p>
                          <p className="text-xs text-slate-500 font-semibold">
                            {record.preparedByName ? tr("preparedBy", { name: record.preparedByName }) : record.studentEmail || "—"}
                          </p>
                        </td>
                        <td className={`${dataTableClass.td} text-xs font-bold text-slate-600`}>
                          {record.academicYear || "—"}
                        </td>
                        <td className={`${dataTableClass.td} text-sm font-black text-slate-800 font-mono`}>
                          {Number(record.gpa || 0).toFixed(2)}
                        </td>
                        <td className={dataTableClass.td}>
                          <StatusBadge status={record.status} />
                          <p className="text-[11px] text-slate-400 font-semibold mt-1">
                            {record.status === "SUBMITTED"
                              ? tr("submittedOn", { date: safeDate(record.submittedAt) })
                              : tr("reviewedOn", { date: safeDate(record.reviewedAt) })}
                          </p>
                        </td>
                        <td className={dataTableClass.td}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="compact"
                              onClick={() => setDetail(record)}
                            >
                              <FileText className="w-4 h-4" />
                              {tr("openTranscript")}
                            </Button>
                            {tab === "issued" && (
                              <Button
                                type="button"
                                size="compact"
                                loading={downloading}
                                onClick={() => void handleDownload(record)}
                              >
                                <Download className="w-4 h-4" />
                                {tr("downloadPdf")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>

      <AnimatePresence>
        {prepareFor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{tr("prepareTitle")}</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">{tr("prepareSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrepareFor(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <UserAvatar
                    userId={prepareFor.id}
                    name={prepareFor.name}
                    photoUrl={prepareFor.photoUrl}
                    size="md"
                    rounded="2xl"
                    className="!w-11 !h-11 !rounded-xl"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{prepareFor.name}</p>
                    <p className="text-xs text-slate-500 font-semibold truncate">
                      {prepareFor.email || tr("noEmail")} · {prepareFor.gradeLevel?.name || tr("unassigned")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      {tr("academicYearLabel")}
                    </span>
                    <input
                      value={academicYear}
                      onChange={(event) => setAcademicYear(event.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      placeholder="2025/2026"
                    />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      {tr("gradeLevelLabel")}
                    </span>
                    <input
                      value={gradeLevel}
                      onChange={(event) => setGradeLevel(event.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      placeholder={tr("gradeLevelPlaceholder")}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{tr("templateTitle")}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1">{tr("templateHint")}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TRANSCRIPT_TEMPLATE_OPTIONS.map((template) => {
                      const active = templateKey === template.key;
                      return (
                        <button
                          key={template.key}
                          type="button"
                          onClick={() => setTemplateKey(template.key)}
                          className={`text-left rounded-2xl border p-4 transition-all ${
                            active
                              ? "border-indigo-500 ring-4 ring-indigo-100 bg-indigo-50/40"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-800">{tr(template.nameKey)}</span>
                            {active && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500 font-semibold mt-1.5 leading-relaxed">
                            {tr(template.descKey)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-semibold bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3">
                  {tr("prepareHint")}
                </p>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                <Button type="button" variant="ghost" onClick={() => setPrepareFor(null)}>
                  {tr("cancel")}
                </Button>
                <Button type="button" loading={preparing} onClick={() => void handlePrepare()}>
                  <FileCheck2 className="w-4 h-4" />
                  {tr("prepareTranscript")}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{detail.studentName}</h2>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {tr("academicYearLabel")}: {detail.academicYear || "—"} · {tr("templateLabel")}:{" "}
                      {tr(
                        TRANSCRIPT_TEMPLATE_OPTIONS.find((option) => option.key === detail.templateKey)?.nameKey ||
                          "tplClassic"
                      )}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={detail.status} />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetail(null);
                    setReviewMode(null);
                    setReviewComment("");
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: tr("detailGpa"), value: Number(detail.gpa || 0).toFixed(2) },
                    { label: tr("studentGradeAverage"), value: `${Number(detail.average || 0).toFixed(1)}%` },
                    { label: tr("creditHours"), value: String(detail.credits || 0) },
                    { label: tr("honorStatus"), value: detail.honors || "—" },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{tile.label}</p>
                      <p className="text-base font-black text-slate-800 mt-1 truncate">{tile.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-black uppercase tracking-wider">{tr("colSubject")}</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider">{tr("colTerm")}</th>
                        <th className="px-4 py-3 text-center font-black uppercase tracking-wider">{tr("colScore")}</th>
                        <th className="px-4 py-3 text-center font-black uppercase tracking-wider">{tr("colGrade")}</th>
                        <th className="px-4 py-3 text-center font-black uppercase tracking-wider">{tr("colPoints")}</th>
                        <th className="px-4 py-3 text-right font-black uppercase tracking-wider">{tr("colCredits")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(detail.snapshot?.records || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-400 font-semibold">
                            {tr("noRecords")}
                          </td>
                        </tr>
                      ) : (
                        (detail.snapshot?.records || []).map((row, index) => (
                          <tr key={`${row.subjectName}-${row.term}-${index}`} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-800">{row.subjectName}</p>
                              {row.subjectCode && (
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">
                                  {row.subjectCode}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-semibold">{row.term}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                              {row.score === null ? "—" : `${row.score}%`}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-black">
                                {row.letter}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-600">
                              {row.points.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-600">
                              {row.credits}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-2xl border border-slate-100 p-4 space-y-1.5">
                    <p className="font-black text-slate-400 uppercase tracking-wider text-[11px]">
                      {tr("workflowTitle")}
                    </p>
                    <p className="text-slate-600 font-semibold">
                      {tr("preparedByLabel")}: {detail.preparedByName || "—"}
                    </p>
                    <p className="text-slate-600 font-semibold">
                      {tr("submittedOnLabel")}: {safeDate(detail.submittedAt)}
                    </p>
                    <p className="text-slate-600 font-semibold">
                      {tr("reviewedByLabel")}: {detail.reviewedByName || "—"}
                    </p>
                    <p className="text-slate-600 font-semibold">
                      {tr("reviewedOnLabel")}: {safeDate(detail.reviewedAt)}
                    </p>
                    {detail.reviewComment && (
                      <p className="text-rose-700 font-semibold bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 mt-2">
                        {tr("approvalComment")}: {detail.reviewComment}
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-black text-slate-400 uppercase tracking-wider text-[11px]">
                      {tr("issuanceTitle")}
                    </p>
                    {detail.status === "APPROVED" ? (
                      <p className="text-emerald-700 font-semibold mt-2 flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                        {tr("approvedHint")}
                      </p>
                    ) : detail.status === "SUBMITTED" ? (
                      <p className="text-amber-700 font-semibold mt-2 flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                        {tr("awaitingHint")}
                      </p>
                    ) : detail.status === "REJECTED" ? (
                      <p className="text-rose-700 font-semibold mt-2 flex items-start gap-2">
                        <RotateCcw className="w-4 h-4 mt-0.5 shrink-0" />
                        {tr("returnedHint")}
                      </p>
                    ) : (
                      <p className="text-slate-600 font-semibold mt-2 flex items-start gap-2">
                        <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                        {tr("draftHint")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {canPrepare && (detail.status === "DRAFT" || detail.status === "REJECTED") && (
                    <Button
                      type="button"
                      loading={busyAction === "submit"}
                      onClick={() => void handleSubmit(detail)}
                    >
                      <Send className="w-4 h-4" />
                      {tr("submitForApproval")}
                    </Button>
                  )}
                  {canPrepare && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const student =
                          students.find((entry) => entry.id === detail.studentId) || {
                            id: detail.studentId,
                            name: detail.studentName,
                            email: detail.studentEmail,
                            gradeLevel: detail.gradeLevel ? { name: detail.gradeLevel } : null,
                          };
                        setDetail(null);
                        openPrepare(student);
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      {tr("reprepare")}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canApprove && detail.status === "SUBMITTED" && (
                    <>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => {
                          setReviewMode("REJECT");
                          setReviewComment("");
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                        {tr("returnTranscript")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setReviewMode("APPROVE");
                          setReviewComment("");
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {tr("approveTranscript")}
                      </Button>
                    </>
                  )}
                  {detail.status === "APPROVED" && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        loading={downloading}
                        onClick={() => void handlePrint(detail)}
                      >
                        <Printer className="w-4 h-4" />
                        {tr("printTranscript")}
                      </Button>
                      <Button
                        type="button"
                        loading={downloading}
                        onClick={() => void handleDownload(detail)}
                      >
                        <Download className="w-4 h-4" />
                        {tr("downloadPdf")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewMode && detail && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900">
                  {reviewMode === "APPROVE" ? tr("approveTitle") : tr("returnTitle")}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {reviewMode === "APPROVE" ? tr("approveSubtitle") : tr("returnSubtitle")}
                </p>
              </div>
              <div className="p-6 space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    {reviewMode === "APPROVE" ? tr("commentOptional") : tr("commentRequiredLabel")}
                  </span>
                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 resize-none"
                    placeholder={
                      reviewMode === "APPROVE" ? tr("commentOptionalPlaceholder") : tr("commentRequiredPlaceholder")
                    }
                  />
                </label>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setReviewMode(null)}>
                  {tr("cancel")}
                </Button>
                <Button
                  type="button"
                  variant={reviewMode === "REJECT" ? "danger" : "primary"}
                  loading={busyAction === reviewMode}
                  onClick={() => void handleReview()}
                >
                  {reviewMode === "APPROVE" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {tr("approveTranscript")}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      {tr("returnTranscript")}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
