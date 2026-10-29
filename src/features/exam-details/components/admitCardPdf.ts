/**
 * Generates a PDF admit-card table for an exam.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { api } from "../../../services/api";
import { examDetailsApi } from "../api";

export async function generateAdmitCardPdf(examId: string): Promise<string> {
  const exam = await examDetailsApi.fetchExam(examId);
  const seatsRaw = await api.get(`/api/exams/${examId}/seats`);
  const seats: Array<{
    studentId: string;
    studentName: string;
    seatNumber: string;
    room: string | null;
  }> = Array.isArray(seatsRaw) ? seatsRaw : [];

  const rows = seats.map((s) => [s.studentName, s.seatNumber, s.room ?? ""]);

  const doc = new jsPDF("p", "mm", "a4");
  doc.setFontSize(12);
  doc.text(`Exam: ${exam.title}`, 10, 10);
  doc.text(
    `Date: ${format(new Date(exam.startDate), "MMM d, yyyy")} – ${format(new Date(exam.endDate), "MMM d, yyyy")}`,
    10,
    15
  );

  autoTable(doc, {
    head: [["Student", "Seat Number", "Room"]],
    body: rows,
    startY: 20,
    margin: { left: 10, right: 10 },
  });

  return doc.output("datauristring");
}
