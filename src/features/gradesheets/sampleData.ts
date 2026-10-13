import type { GradeSheetData, GradeSheetSubject } from "./types";

const PREVIEW_SUBJECT_NAMES = [
  "English Language",
  "Mathematics",
  "Integrated Science",
  "Social Studies",
  "French",
  "ICT",
  "Biology",
  "Chemistry",
  "Physics",
  "Geography",
  "History",
  "Literature",
  "Religious Education",
  "Physical Education",
  "Art & Design",
  "Music",
  "Agriculture",
] as const;

function previewSubjects(): GradeSheetSubject[] {
  const scores = [88, 76, 91, 69, 58, 94, 82, 71, 85, 73, 67, 79, 90, 84, 75, 80, 72];
  const grades = ["A", "B", "A", "C", "D", "A", "B", "B", "A", "B", "C", "B", "A", "A", "B", "B", "B"];
  return PREVIEW_SUBJECT_NAMES.map((name, i) => {
    const obtained = scores[i] ?? 70;
    const ca = Math.round(obtained * 0.3);
    const exam = Math.round(obtained * 0.7);
    return {
      name,
      max: 100,
      obtained,
      classAvg: Math.max(50, obtained - 8 + (i % 5)),
      grade: grades[i] ?? "C",
      remark: i % 3 === 0 ? "Steady progress" : "",
      ca,
      exam,
    };
  });
}

/** Sample payload for Settings preview — 17 subjects to exercise dense / multi-page layout. */
export function sampleGradeSheetData(
  schoolName = "Greendale Academy",
  address = "14 Independence Avenue, Monrovia, Liberia"
): GradeSheetData {
  const subjects = previewSubjects();
  const obtainedTotal =
    Math.round(subjects.reduce((s, x) => s + x.obtained, 0) * 10) / 10;
  const percentage =
    Math.round((obtainedTotal / subjects.length) * 10) / 10;

  return {
    school: {
      name: schoolName || "Greendale Academy",
      address: address || "14 Independence Avenue, Monrovia, Liberia",
      contact: "+231 77 000 0000",
      crestInitials: "GA",
    },
    term: {
      label: "Term 2 · 2025/2026 Academic Year",
      examName: "End-of-Term Examination",
      issueDate: "12 Dec 2025",
      nextTermStart: "05 Jan 2026",
      academicYear: "2025/2026",
    },
    student: {
      name: "Sample Student",
      admissionNo: "GA-2024-0187",
      classLabel: "Grade 9 — Section B",
      section: "B",
      dob: "03 May 2011",
      guardian: "Guardian Name",
    },
    subjects,
    summary: {
      maxTotal: subjects.length * 100,
      obtainedTotal,
      percentage,
      gpa: 3.2,
      overallGrade: "B",
      rank: "3rd of 41",
      conduct: "Excellent",
      promotionStatus: "Promoted to Grade 10",
    },
    attendance: {
      present: 83,
      total: 88,
      absent: 5,
      percentage: 94,
    },
    remarks: {
      teacher:
        "Consistent improvement this term across a full subject load. Continue vocabulary practice in French.",
      principal: "A commendable result across seventeen subjects. Keep up the diligence shown this term.",
    },
  };
}
