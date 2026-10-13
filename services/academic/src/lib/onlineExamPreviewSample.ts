/**
 * Built-in sample online exam used by the staff preview/demo flow.
 *
 * Pure data only — no DB access — so it is safe to unit test and to serve to
 * staff without touching any school's exam records. Question/choice shapes
 * mirror the Prisma `ExamQuestion` / `ExamChoice` rows so the same scoring and
 * key-stripping helpers can be reused.
 */

export const SAMPLE_PREVIEW_EXAM_ID = "sample";

const SAMPLE_EXAM = {
  id: SAMPLE_PREVIEW_EXAM_ID,
  title: "Sample online exam (demo)",
  isOnline: true,
  showResultsImmediately: true,
  maxViolations: 3,
  duration: 10,
  instructions:
    "This is a built-in demo paper for previewing the student experience. Nothing you answer here is saved.",
};

type SampleChoice = {
  id: string;
  label: string;
  text: string;
  orderIndex: number;
  isCorrect: boolean;
};

type SampleQuestion = {
  id: string;
  examId: string;
  schoolId: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";
  prompt: string;
  points: number;
  orderIndex: number;
  correctAnswer: string | null;
  caseSensitive: boolean;
  choices: SampleChoice[];
};

function choice(
  qid: string,
  label: string,
  text: string,
  orderIndex: number,
  isCorrect: boolean
): SampleChoice {
  return { id: `${qid}-${label.toLowerCase()}`, label, text, orderIndex, isCorrect };
}

export function sampleExamMeta() {
  return { ...SAMPLE_EXAM };
}

export function sampleQuestions(): SampleQuestion[] {
  return [
    {
      id: "sample-q1",
      examId: SAMPLE_PREVIEW_EXAM_ID,
      schoolId: SAMPLE_PREVIEW_EXAM_ID,
      type: "MULTIPLE_CHOICE",
      prompt: "What is 2 + 2?",
      points: 1,
      orderIndex: 0,
      correctAnswer: null,
      caseSensitive: false,
      choices: [
        choice("sample-q1", "A", "3", 0, false),
        choice("sample-q1", "B", "4", 1, true),
        choice("sample-q1", "C", "5", 2, false),
        choice("sample-q1", "D", "22", 3, false),
      ],
    },
    {
      id: "sample-q2",
      examId: SAMPLE_PREVIEW_EXAM_ID,
      schoolId: SAMPLE_PREVIEW_EXAM_ID,
      type: "TRUE_FALSE",
      prompt: "The Earth orbits the Sun.",
      points: 1,
      orderIndex: 1,
      correctAnswer: null,
      caseSensitive: false,
      choices: [
        choice("sample-q2", "T", "True", 0, true),
        choice("sample-q2", "F", "False", 1, false),
      ],
    },
    {
      id: "sample-q3",
      examId: SAMPLE_PREVIEW_EXAM_ID,
      schoolId: SAMPLE_PREVIEW_EXAM_ID,
      type: "FILL_BLANK",
      prompt: "What is the capital of France?",
      points: 1,
      orderIndex: 2,
      correctAnswer: "Paris",
      caseSensitive: false,
      choices: [],
    },
    {
      id: "sample-q4",
      examId: SAMPLE_PREVIEW_EXAM_ID,
      schoolId: SAMPLE_PREVIEW_EXAM_ID,
      type: "ESSAY",
      prompt: "In a few sentences, describe the water cycle.",
      points: 2,
      orderIndex: 3,
      correctAnswer: null,
      caseSensitive: false,
      choices: [],
    },
  ];
}
