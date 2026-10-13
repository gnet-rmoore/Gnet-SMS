import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { ReportCardTemplate } from "../../components/ReportCardTemplates";
import { Download, ArrowLeft, Printer, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { api } from "../../services/api";
import type { GradeLegendLike } from "../../lib/gradeLegend";
import {
  getReportCardTemplateDef,
  isLiberianReportCardTemplate,
} from "../../features/report-cards";
import { useAcademicCalendarQuery } from "../../features/academic-calendar/hooks/useAcademicCalendarQuery";
import { useDocumentOfficialSignatures } from "../../hooks/useDocumentOfficialSignatures";

interface GradeEntry {
  id: string;
  score: number;
  status: string;
  subjectId?: string;
  examId?: string;
  exam?: { title?: string; startDate?: string } | null;
  subject: { id?: string; name: string; code: string };
  classroom?: { name: string };
  examComponent?: { id?: string; label?: string; shortCode?: string | null } | null;
}

export const ReportCard = () => {
  const { examId, studentId: paramStudentId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, school } = useAuthStore();
  const [grades, setGrades] = React.useState<GradeEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [studentName, setStudentName] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);
  const [gradeLegends, setGradeLegends] = React.useState<GradeLegendLike[]>([]);

  const studentId = paramStudentId || user?.id;
  const templateId = school?.reportCardTemplate || "TEMPLATE_1";
  const templateDef = getReportCardTemplateDef(templateId);
  const liberian = isLiberianReportCardTemplate(templateId);
  const { calendar } = useAcademicCalendarQuery();
  const calendarPeriods = calendar?.periods ?? null;
  const academicYearLabel = calendar?.name || undefined;
  const { officialSignatures } = useDocumentOfficialSignatures(
    school?.id,
    school?.documentSignatories,
    accessToken
  );

  const fetchData = React.useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}/grades`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const allGrades = await response.json();
        // Liberian year booklet: all released grades; international: filter by exam when present
        const next = liberian
          ? allGrades
          : examId
            ? allGrades.filter((g: GradeEntry) => g.examId === examId)
            : allGrades;
        setGrades(Array.isArray(next) ? next : []);
      }

      if (paramStudentId && paramStudentId !== user?.id) {
        const userRes = await fetch(`/api/users/${paramStudentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setStudentName(userData.name);
        }
      } else {
        setStudentName(user?.name || "");
      }

      if (school?.id) {
        try {
          const legends = await api.get(`/api/schools/${school.id}/grade-legends`);
          setGradeLegends(Array.isArray(legends) ? legends : []);
        } catch {
          setGradeLegends([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    studentId,
    examId,
    accessToken,
    user?.id,
    user?.name,
    paramStudentId,
    school?.id,
    liberian,
  ]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadPDF = async () => {
    // Try server-side PDF generation first
    try {
      setDownloading(true);
      const response = await fetch(`/api/exams/${examId}/report-card/${studentId}/pdf`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${studentName.replace(/\s+/g, "_")}_ReportCard_${grades[0]?.exam?.title?.replace(/\s+/g, "_") || templateDef.key || "Report"}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setDownloading(false);
        return;
      }
      console.warn("Server PDF generation failed, falling back to client-side:", response.status);
    } catch (serverError) {
      console.warn("Server PDF generation error, falling back to client-side:", serverError);
    }

    // Fallback to client-side html2canvas + jsPDF
    const element = document.getElementById("report-card");
    if (!element) {
      setDownloading(false);
      return;
    }

    try {
      // Liberian bifolds: portrait A4 sheets; international: single A4 card
      const sheetSel = liberian
        ? ".a4-portrait-sheet, .grades-inside-spread, .grading-spread"
        : ".intl-a4-page, .report-card-sheet, #report-card > div, .report-card-page";
      let targets = Array.from(element.querySelectorAll(sheetSel)) as HTMLElement[];
      if (liberian) {
        targets = targets.filter(
          (n) => !(n.classList.contains("grades-sheet") && n.querySelector(".grades-inside-spread"))
        );
      }
      if (targets.length === 0) targets = [element];

      const orientation = "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: "a4",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < targets.length; i++) {
        const node = targets[i] as HTMLElement;
        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: node.offsetWidth,
          height: node.offsetHeight,
        });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage("a4", orientation);
        pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
      }

      const examLabel =
        grades[0]?.exam?.title?.replace(/\s+/g, "_") ||
        templateDef.key ||
        "Report";
      pdf.save(`${studentName.replace(/\s+/g, "_")}_ReportCard_${examLabel}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // International exam-scoped cards still require grades; Liberian booklets can print blank matrices
  if (!liberian && grades.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
          No assessment data found
        </h3>
        <p className="text-slate-500 mt-2 mb-8">
          We could not find any released assessment results for this term.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const subtitle = liberian
    ? `${templateDef.label} · ${grades.length} grade${grades.length === 1 ? "" : "s"} loaded`
    : `Status: Released · ${grades[0]?.exam?.title || "Report"}`;

  return (
    <div className="max-w-[900px] mx-auto space-y-8 pb-20 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-3 bg-white border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 rounded-2xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
              Official Report Card
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer className="w-5 h-5" />
            Print Report
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {downloading ? "Processing..." : "Download PDF"}
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-x-auto pb-8 rounded-[32px] border border-slate-200 bg-slate-50/50 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
      >
        <div className={liberian ? "p-4 flex justify-center overflow-x-auto" : "min-w-[900px]"}>
          <ReportCardTemplate
            studentName={studentName}
            examTitle={grades[0]?.exam?.title || templateDef.label}
            examDate={grades[0]?.exam?.startDate || new Date().toISOString()}
            grades={grades}
            school={school}
            templateId={templateId}
            gradeLegends={gradeLegends}
            studentId={studentId}
            academicYearLabel={academicYearLabel}
            calendarPeriods={calendarPeriods}
            officialSignatures={officialSignatures}
          />
        </div>
      </motion.div>

      <style
        dangerouslySetInnerHTML={{
          __html: liberian
            ? `
        @media print {
          @page { size: A4 landscape; margin: 0; }
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .max-w-\\[1000px\\] { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          #report-card { box-shadow: none !important; border: none !important; width: auto !important; margin: 0 !important; border-radius: 0 !important; }
          .overflow-x-auto { overflow: visible !important; border: none !important; box-shadow: none !important; background: white !important; padding: 0 !important; border-radius: 0 !important; }
        }
      `
            : `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .max-w-\\[1000px\\] { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          #report-card { box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
          .overflow-x-auto { overflow: visible !important; border: none !important; box-shadow: none !important; background: white !important; }
        }
      `,
        }}
      />
    </div>
  );
};
