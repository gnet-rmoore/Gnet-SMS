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

function buildDemoPaper() {
  return {
    exam: {
      id: "demo-exam",
      title: "End of Term Examination — Integrated Science",
      startDate: "2026-06-15T09:00:00.000Z",
      duration: 90,
      instructions:
        "Read all instructions carefully before you begin.\n• Answer all questions in the spaces provided.\n• Write clearly and legibly; show all necessary working where applicable.\n• Calculators may be used unless otherwise stated.\n• Manage your time wisely and review your answers before submission.",
      deliveryMode: "ONLINE",
    },
    package: {
      status: "APPROVED",
      deliveryMode: "ONLINE",
      revision: 1,
    },
  };
}

function buildDemoQuestions(): PaperQuestion[] {
  return [
    {
      id: "demo-q1",
      type: "MULTIPLE_CHOICE",
      prompt:
        "Which process do green plants use to manufacture their own food using energy from sunlight?",
      points: 2,
      orderIndex: 0,
      choices: [
        { id: "demo-q1a", label: "A", text: "Respiration" },
        { id: "demo-q1b", label: "B", text: "Photosynthesis" },
        { id: "demo-q1c", label: "C", text: "Transpiration" },
        { id: "demo-q1d", label: "D", text: "Germination" },
      ],
    },
    {
      id: "demo-q2",
      type: "MULTIPLE_CHOICE",
      prompt: "What is the SI unit of electric current?",
      points: 2,
      orderIndex: 1,
      choices: [
        { id: "demo-q2a", label: "A", text: "Volt (V)" },
        { id: "demo-q2b", label: "B", text: "Ohm (Ω)" },
        { id: "demo-q2c", label: "C", text: "Ampere (A)" },
        { id: "demo-q2d", label: "D", text: "Watt (W)" },
      ],
    },
    {
      id: "demo-q3",
      type: "TRUE_FALSE",
      prompt: "Sound waves can travel through a vacuum.",
      points: 1,
      orderIndex: 2,
      choices: [],
    },
    {
      id: "demo-q4",
      type: "FILL_BLANK",
      prompt: "The chemical symbol for sodium is ________.",
      points: 1,
      orderIndex: 3,
      choices: [],
    },
    {
      id: "demo-q5",
      type: "MULTIPLE_CHOICE",
      prompt:
        "Which organ in the human body is primarily responsible for pumping blood throughout the circulatory system?",
      points: 1,
      orderIndex: 4,
      choices: [
        { id: "demo-q5a", label: "A", text: "Lungs" },
        { id: "demo-q5b", label: "B", text: "Liver" },
        { id: "demo-q5c", label: "C", text: "Heart" },
        { id: "demo-q5d", label: "D", text: "Kidneys" },
      ],
    },
    {
      id: "demo-q6",
      type: "ESSAY",
      prompt:
        "Explain the stages of the water cycle. In your response, describe evaporation, condensation, precipitation, and collection, and state why the water cycle is important to living organisms.",
      points: 8,
      orderIndex: 5,
      choices: [],
    },
  ];
}

export default function ExamPaperPreviewPage() {
  const [params] = useSearchParams();
  const examId = (params.get("examId") || "").trim();
  const demoMode = params.get("demo") === "1";
  const autoDownload = params.get("download") === "1";
  const { school } = useAuthStore();
  const [loading, setLoading] = React.useState(!demoMode);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [paper, setPaper] = React.useState<any>(demoMode ? buildDemoPaper() : null);
  const [questions, setQuestions] = React.useState<PaperQuestion[]>(
    demoMode ? buildDemoQuestions() : []
  );
  const docRef = React.useRef<HTMLDivElement>(null);
  const autoTriggered = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    if (demoMode) {
      setPaper(buildDemoPaper());
      setQuestions(buildDemoQuestions());
      setError(null);
      setLoading(false);
      return;
    }
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
  }, [examId, demoMode]);

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
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {demoMode ? "Demo question paper" : "Question paper"}
              </p>
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
              {downloading ? "Generating PDF…" : "Download PDF"}
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
              exam={paper.exam || { id: "demo-exam", title: "Examination" }}
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
