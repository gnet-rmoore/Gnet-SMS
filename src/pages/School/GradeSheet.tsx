import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { GradeSheetTemplate } from "../../components/GradeSheetTemplates";
import {
  getGradeSheetTemplateDef,
  resolveGradeSheetTemplateKey,
} from "../../features/gradesheets";
import { useDocumentOfficialSignatures } from "../../hooks/useDocumentOfficialSignatures";
import { useAcademicCalendarQuery } from "../../features/academics-shared/calendar/useAcademicCalendar";
import { academicYearLabel } from "../../features/academics-shared/calendar/selectors";
import { Download, ArrowLeft, Printer, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface GradeEntry {
  id: string;
  score: number;
  status: string;
  exam: { title: string; startDate: string };
  subject: { name: string; code: string };
  classroom: { name: string };
}

export const GradeSheet = () => {
  const { examId, studentId: paramStudentId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, school } = useAuthStore();
  const [grades, setGrades] = React.useState<GradeEntry[]>([]);
  const [legends, setLegends] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [studentName, setStudentName] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);

  const studentId = paramStudentId || user?.id;
  const templateKey = resolveGradeSheetTemplateKey(school?.gradeSheetTemplate);
  const templateDef = getGradeSheetTemplateDef(templateKey);
  const { calendar } = useAcademicCalendarQuery();
  const yearLabel = academicYearLabel(calendar);
  const { officialSignatures } = useDocumentOfficialSignatures(
    school?.id,
    school?.documentSignatories,
    accessToken
  );

  const fetchData = React.useCallback(async () => {
    if (!studentId || !examId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}/grades`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const allGrades = await response.json();
        const examGrades = allGrades.filter((g: any) => g.examId === examId);
        setGrades(examGrades);
      }

      if (school?.id) {
        const legRes = await fetch(`/api/schools/${school.id}/grade-legends`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (legRes.ok) {
          setLegends(await legRes.json());
        }
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
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [studentId, examId, accessToken, user?.id, user?.name, paramStudentId, school?.id]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadPDF = async () => {
    // Try server-side PDF generation first (higher quality)
    try {
      setDownloading(true);
      const response = await fetch(`/api/exams/${examId}/gradesheet/${studentId}/pdf`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${studentName.replace(/\s+/g, "_")}_GradeSheet_${grades[0]?.exam.title.replace(/\s+/g, "_")}.pdf`;
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
    const element = document.getElementById("grade-sheet");
    if (!element) {
      setDownloading(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: templateDef.pdfFormat,
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `${studentName.replace(/\s+/g, "_")}_GradeSheet_${grades[0]?.exam.title.replace(/\s+/g, "_")}.pdf`
      );
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

  if (grades.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">No Grades Found</h3>
        <p className="text-slate-500 mt-2 mb-8">
          We couldn&apos;t find any released grades for this examination.
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

  const pageSizeLabel =
    templateDef.pageSize === "legal"
      ? "Legal · 8.5 × 14 in"
      : "A4 · 210 × 297 mm";

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-6 sm:px-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-dashboard">
              Official Grade Sheet
            </h1>
            <p className="text-slate-500 font-medium">
              {templateDef.name} · {pageSizeLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-x-auto pb-8"
      >
        <div className="min-w-min mx-auto">
          <GradeSheetTemplate
            studentName={studentName}
            examTitle={grades[0].exam.title}
            examDate={grades[0].exam.startDate}
            grades={grades}
            school={school}
            templateId={templateKey}
            gradeLegends={legends}
            academicYearLabel={yearLabel || undefined}
            signatures={{
              principal: officialSignatures.principal,
            }}
          />
        </div>
      </motion.div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: ${templateDef.cssPageSize}; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .max-w-6xl { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          #grade-sheet { box-shadow: none !important; }
          .gs-ledger .stage, .gs-mastery .stage { padding: 0 !important; }
          .gs-ledger .sheet, .gs-mastery .sheet {
            box-shadow: none !important;
            margin: 0 !important;
          }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `,
        }}
      />
    </div>
  );
};
