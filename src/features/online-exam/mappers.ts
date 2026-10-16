import {
  emptyQuestion,
  type DraftQuestion,
  type QuestionType,
} from "./types";
import type { BankItem, OnlineQuestionInput } from "./api";

/** Map API question rows (exam or bank shape) to editable drafts. */
export function fromApiQuestions(rows: any[]): DraftQuestion[] {
  return (rows || []).map((q) => {
    const base = emptyQuestion(q.type as QuestionType);
    return {
      ...base,
      key: q.id || crypto.randomUUID(),
      type: q.type,
      prompt: q.prompt || "",
      points: String(q.points ?? 1),
      correctAnswer: q.correctAnswer || "",
      correctBoolean:
        q.type === "TRUE_FALSE"
          ? q.choices?.find((c: any) => c.isCorrect)?.text === "True"
            ? "true"
            : "false"
          : "",
      caseSensitive: Boolean(q.caseSensitive),
      choices:
        q.type === "MULTIPLE_CHOICE"
          ? (q.choices || []).map((c: any, i: number) => ({
              key: c.id || crypto.randomUUID(),
              label: c.label || String.fromCharCode(65 + i),
              text: c.text || "",
              isCorrect: Boolean(c.isCorrect),
            }))
          : [],
    };
  });
}

/** Map a single bank item to an editable draft (stable React key). */
export function bankItemToDraft(item: BankItem): DraftQuestion {
  const draft = fromApiQuestions([{ ...item, id: item.id }])[0];
  return { ...draft, key: crypto.randomUUID() };
}

/** Map editable drafts to the API question input shape. */
export function toApiQuestions(drafts: DraftQuestion[]): OnlineQuestionInput[] {
  return drafts.map((q) => {
    const points = Number(q.points);
    if (q.type === "MULTIPLE_CHOICE") {
      return {
        type: q.type,
        prompt: q.prompt.trim(),
        points,
        choices: q.choices.map((c) => ({
          label: c.label,
          text: c.text.trim(),
          isCorrect: c.isCorrect,
        })),
      };
    }
    if (q.type === "TRUE_FALSE") {
      return {
        type: q.type,
        prompt: q.prompt.trim(),
        points,
        correctBoolean: q.correctBoolean === "true",
      };
    }
    if (q.type === "FILL_BLANK") {
      return {
        type: q.type,
        prompt: q.prompt.trim(),
        points,
        correctAnswer: q.correctAnswer.trim(),
        caseSensitive: q.caseSensitive,
      };
    }
    return {
      type: "ESSAY",
      prompt: q.prompt.trim(),
      points,
    };
  });
}
