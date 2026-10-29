/**
 * Generates a PDF admit‑card table for an exam.
 * Uses the newly‑added `GET /api/exams/:id/seats` endpoint which returns
 * an array of seat objects:
 *   [
 *     { studentId: "s1", studentName: "Alice", seatNumber: "001", room: "Room A" },
 *     …
 *   ]
 *
 * The PDF is built with `jspdf` and `autotable` (already dependencies).
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useAuthStore } from "../../store/authStore";
import { examsApi } from "../../services/api";

export async function generateAdmitCardPdf(examId: string): Promise<string> {
  // 1️⃣  Pull the exam data (title, dates, delivery mode, etc.)
  const exam = await examsApi.getExamById(examId);

  // 2️⃣  Fetch the seat allocations for this exam.
  //    The backend now exposes `GET /api/exams/:id/seats`.
  const seatsResp = await fetch(`/api/exams/${examId}/seats`, {
    headers: {
      Authorization: `Bearer ${(useAuthStore.getState() as any).accessToken}`,
    },
  });
  if (!seatsResp.ok) {
    throw new Error(`Failed to fetch seats: ${seatsResp.statusText}`);
  }
  const seats: Array<{
    studentId: string;
    studentName: string;
    seatNumber: string;
    room: string | null;
  }> = await seatsResp.json();

  // 3️⃣  Build the rows for the table – one row per student.
  const rows: unknown[][] = seats.map((s) => [s.studentName, s.seatNumber, s.room ?? ""]);

  // 4️⃣  Create the PDF document.
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - 20; // 10 mm margin on each side

  // Header
  doc.setFontSize(12);
  doc.text(`Exam: ${exam.title}`, 10, 10);
  doc.text(
    `Date: ${format(new Date(exam.startDate), "MMM d, yyyy")} – ${format(new Date(exam.endDate), "MMM d, yyyy")}`,
    10,
    15
  );

  // 5️⃣  Render the table with autoTable.
  (doc as any).autoTable({
    head: [["Student", "Seat Number", "Room"]],
    body: rows,
    startY: 20,
    margin: { left: 10, right: 10 },
    columnWidth: "auto",
  });

  // 6️⃣  Return the PDF as a data‑URI so the caller can trigger a download.
  const pdfDataUrl = doc.output("datauri");
  return pdfDataUrl;
}