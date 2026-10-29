import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../../academics-shared/PageToast";
import { api } from "../../../services/api";

type Props = {
  examId: string;
  onClose: () => void;
};

type SeatRow = {
  studentId: string;
  studentName: string;
  seatNumber: string;
  room?: string | null;
};

export function ExamSeatingModal({ examId, onClose }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const { toast, showToast } = usePageToast();
  const [loading] = useState(false);
  const [students] = useState<unknown[]>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [skipped, setSkipped] = useState(0);

  const handleGenerate = async () => {
    setGenerateLoading(true);
    try {
      const result = await api.post(`/api/exams/${examId}/seats/generate`);
      setEligibleCount(Number(result?.eligibleCount) || 0);
      setSkipped(Number(result?.skipped) || 0);
      if (Array.isArray(result?.seats)) setSeats(result.seats);
      showToast(t("exams.toast.seatsGenerated"), "success");
    } catch (err: any) {
      showToast(err?.message || t("exams.toast.seatGenerationFailed"), "error");
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleDownloadAdmitCards = async () => {
    setGenerateLoading(true);
    try {
      showToast(t("exams.toast.admitCardsReady"), "success");
    } catch (err: any) {
      showToast(err?.message || t("exams.toast.admitCardFailed"), "error");
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <FeatureModalShell
      title={t("examDetails.seatingModalTitle")}
      subtitle={t("examDetails.seatingModalSubtitle")}
      onClose={onClose}
    >
      <PageToast toast={toast} />
      <div className="p-6">
        {loading ? (
          <p>{t("examDetails.loading")}</p>
        ) : students.length === 0 && seats.length === 0 ? (
          <p>{t("examDetails.noStudents")}</p>
        ) : (
          <>
            <p className="font-medium mb-2">
              {t("examDetails.seatedStudents", { count: eligibleCount })}{" "}
              {t("examDetails.eligible")}
            </p>
            <span className="text-sm text-slate-500">
              {t("examDetails.skipped", { count: skipped })} {t("examDetails.notEligible")}
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-600">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-slate-500 uppercase font-bold border-b-2 border-slate-200 bg-slate-100 sticky top-0">
                      {t("examDetails.student")}
                    </th>
                    <th className="text-left text-xs text-slate-500 uppercase font-bold border-b-2 border-slate-200 bg-slate-100">
                      {t("examDetails.seatNumber")}
                    </th>
                    <th className="text-left text-xs text-slate-500 uppercase font-bold border-b-2 border-slate-200 bg-slate-100">
                      {t("examDetails.room")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seats.map((s) => (
                    <tr key={s.studentId}>
                      <td className="font-medium">{s.studentName}</td>
                      <td className="font-mono">{s.seatNumber}</td>
                      <td>{s.room || t("examDetails.unspecified")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generateLoading}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {generateLoading ? t("common:saving") : t("examDetails.generateSeats")}
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadAdmitCards()}
              className="mt-4 ml-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              {t("examDetails.downloadAdmitCards")}
            </button>
          </>
        )}
      </div>
    </FeatureModalShell>
  );
}
