export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";

export type DraftChoice = {
  key: string;
  label: string;
  text: string;
  isCorrect: boolean;
};

export type DraftQuestion = {
  key: string;
  type: QuestionType;
  prompt: string;
  points: string;
  correctAnswer: string;
  correctBoolean: "true" | "false" | "";
  caseSensitive: boolean;
  choices: DraftChoice[];
};

export function emptyChoice(label: string): DraftChoice {
  return {
    key: crypto.randomUUID(),
    label,
    text: "",
    isCorrect: false,
  };
}

export function emptyQuestion(type: QuestionType = "MULTIPLE_CHOICE"): DraftQuestion {
  if (type === "TRUE_FALSE") {
    return {
      key: crypto.randomUUID(),
      type,
      prompt: "",
      points: "1",
      correctAnswer: "",
      correctBoolean: "true",
      caseSensitive: false,
      choices: [],
    };
  }
  if (type === "MULTIPLE_CHOICE") {
    return {
      key: crypto.randomUUID(),
      type,
      prompt: "",
      points: "1",
      correctAnswer: "",
      correctBoolean: "",
      caseSensitive: false,
      choices: [emptyChoice("A"), emptyChoice("B"), emptyChoice("C"), emptyChoice("D")],
    };
  }
  return {
    key: crypto.randomUUID(),
    type,
    prompt: "",
    points: "1",
    correctAnswer: "",
    correctBoolean: "",
    caseSensitive: false,
    choices: [],
  };
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
