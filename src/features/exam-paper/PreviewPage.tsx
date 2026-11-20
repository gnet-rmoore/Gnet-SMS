import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Printer, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { examPaperApi } from "./api";
import {
  ExamPaperDocument,
  downloadExamPaperPdf,
  type PaperQuestion,
} from "./ExamPaperDocument";

function sanitizeFilename(value: string) {
  return (
    String(value || "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "Exam_Paper"
  );
}

export default function ExamPaperPreviewPage() {
  const [params] = useSearchParams();
  const examId = (params.get("examId") || "").trim();
  const autoDownload = params.get("download") === "1";
  const { school } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [paper, setPaper] = React.useState<any>(null);
  const [questions, setQuestions] = React.useState<PaperQuestion[]>([]);
  const docRef = React.useRef<HTMLDivElement>(null);
  const autoTriggered = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    if (!examId) {
      setError("No exam selected. Open a paper from Exam Paper Review to preview its document.");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [paperData, qData] = await Promise.all([
          examPaperApi.get(examId),
          examPaperApi.getQuestions(examId),
        ]);
        if (cancelled) return;
        setPaper(paperData);
        const rows = Array.isArray(qData?.questions) ? qData.questions : [];
        setQuestions(
          rows.map((q: any) => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt || "",
            points: Number(q.points) || 0,
            orderIndex: q.orderIndex,
            choices: Array.isArray(q.choices)
              ? q.choices.map((c: any) => ({
                  id: c.id,
                  label: c.label,
                  text: c.text || "",
                }))
              : [],
          }))
        );
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Could not load this exam paper.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const handleDownload = React.useCallback(async () => {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      const title = paper?.exam?.title || "Exam_Paper";
      await downloadExamPaperPdf(docRef.current, `${sanitizeFilename(title)}_Question_Paper.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setDownloading(false);
    }
  }, [paper]);

  React.useEffect(() => {
    if (!autoDownload || loading || error || !paper || autoTriggered.current) return;
    autoTriggered.current = true;
    const t = window.setTimeout(() => {
      void handleDownload();
    }, 350);
    return () => window.clearTimeout(t);
  }, [autoDownload, loading, error, paper, handleDownload]);

  const backTo = `/${school?.slug}/exam-paper-review`;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading question paper…
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mb-2">Unable to open paper</h2>
        <p className="text-slate-500 mb-8">{error || "This exam paper could not be found."}</p>
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold px-5 py-3 hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to review
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 pb-16">
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur no-print">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={backTo}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-700"
            >
              <ArrowLeft className="w-4 h-4" /> Back to review
            </Link>
            <span className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Question paper</p>
              <p className="font-extrabold tracking-tight text-slate-900 truncate">
                {paper.exam?.title || "Examination"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-center overflow-x-auto pb-6">
          <div
            className="shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_60px_rgba(15,23,42,0.12)] rounded-sm ring-1 ring-slate-200/70"
            style={{ background: "#fff" }}
          >
            <ExamPaperDocument
              ref={docRef}
              school={{
                name: school?.name,
                logoUrl: school?.logoUrl,
                address: school?.address,
                contactPhone: school?.contactPhone,
                contactEmail: school?.contactEmail,
                brandColor: school?.brandColor,
              }}
              exam={paper.exam || { id: examId, title: "Examination" }}
              pkg={paper.package}
              questions={questions}
            />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}
