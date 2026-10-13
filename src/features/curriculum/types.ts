interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface GradeLevel {
  id: string;
  name: string;
  _count?: {
    classrooms: number;
  };
}

interface Classroom {
  id: string;
  name: string;
  subjectId: string;
  gradeLevelId: string;
  ownerTeacherId: string;
}

interface SyllabusPlan {
  id: string;
  schoolId: string;
  subjectId: string;
  gradeLevelId: string;
  teacherId: string;
  teacherName: string;
  subjectName: string;
  gradeLevelName: string;
  title: string;
  academicYear: string;
  standardsFramework: string;
  objectives: string; // stringified JSON array
  units: string; // stringified JSON array
  textbooks?: string;
  differentiation?: string;
  accommodations?: string;
  gradingCriteria?: string; // stringified JSON array
  status: string; // DRAFT, PENDING, APPROVED, REJECTED
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}
