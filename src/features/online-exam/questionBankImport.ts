import { validateImportRows } from "../../../services/academic/src/lib/questionImport";
import type { OnlineQuestionInput } from "./api";

export const QUESTION_BANK_IMPORT_LIMIT = 100;

export function prepareQuestionBankImport(rows: Record<string, unknown>[]) {
  const validation = validateImportRows(rows);
  const questions: OnlineQuestionInput[] = validation.validQuestions.map((question) => ({
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    caseSensitive: question.caseSensitive,
    ...(question.type === "MULTIPLE_CHOICE"
      ? {
          choices: question.choices.map(({ label, text, isCorrect }) => ({
            label,
            text,
            isCorrect,
          })),
        }
      : {}),
    ...(question.type === "TRUE_FALSE"
      ? { correctBoolean: question.choices[0]?.isCorrect === true }
      : {}),
    ...(question.type === "FILL_BLANK"
      ? { correctAnswer: question.correctAnswer }
      : {}),
  }));
  return { validation, questions };
}
