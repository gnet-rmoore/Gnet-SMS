/**
 * School question bank service.
 *
 * Reusable questions live in `QuestionBankItem`/`QuestionBankChoice`. Inserting
 * a bank item into an exam COPIES it, so later edits never change a live exam.
 * Visibility is subject/grade scoped (see lib/questionBank.ts).
 */
import prisma from "../lib/prisma";
import {
  normalizeQuestion,
  type NormalizedQuestion,
} from "../lib/questionImport";
import {
  bankVisibilityWhere,
  canManageBankItem,
  canViewBankItem,
  normalizeVisibility,
  parseBankTags,
  serializeBankTags,
  type BankItemScope,
  type BankRoom,
  type QuestionBankVisibility,
} from "../lib/questionBank";
import {
  getClassroomsByMember,
  getClassroomsOwnedByTeacher,
} from "../lib/classroomClient";

export type QuestionBankActor = { id: string; role: string };

/** Cap on a single bulk create / save-from-exam request. */
export const MAX_BANK_ITEMS_PER_REQUEST = 200;

function httpError(message: string, status: number, code?: string) {
  return Object.assign(new Error(message), { status, code });
}

function asString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/** The actor's teaching rooms, used for subject/grade scoped visibility. */
async function resolveRooms(schoolId: string, actor: QuestionBankActor): Promise<BankRoom[]> {
  if (actor.role !== "TEACHER") return [];
  const [memberRooms, ownedRooms] = await Promise.all([
    getClassroomsByMember(actor.id, ["TEACHER", "CO_TEACHER"], schoolId),
    getClassroomsOwnedByTeacher(schoolId, actor.id),
  ]);
  return [...memberRooms, ...ownedRooms];
}

type SerializedChoice = {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
};

type SerializedBankItem = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  correctAnswer: string | null;
  caseSensitive: boolean;
  subjectId: string | null;
  gradeLevelId: string | null;
  topic: string | null;
  tags: string[];
  visibility: string;
  createdBy: string;
  updatedBy: string | null;
  sourceExamId: string | null;
  sourceQuestionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  choices: SerializedChoice[];
};

function serializeItem(item: any): SerializedBankItem {
  return {
    id: item.id,
    type: item.type,
    prompt: item.prompt,
    points: item.points,
    correctAnswer: item.correctAnswer ?? null,
    caseSensitive: Boolean(item.caseSensitive),
    subjectId: item.subjectId ?? null,
    gradeLevelId: item.gradeLevelId ?? null,
    topic: item.topic ?? null,
    tags: parseBankTags(item.tags),
    visibility: item.visibility,
    createdBy: item.createdBy,
    updatedBy: item.updatedBy ?? null,
    sourceExamId: item.sourceExamId ?? null,
    sourceQuestionId: item.sourceQuestionId ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    choices: (item.choices || []).map((c: any) => ({
      id: c.id,
      label: c.label,
      text: c.text,
      isCorrect: Boolean(c.isCorrect),
    })),
  };
}

export type BankTaxonomyInput = {
  subjectId?: string | null;
  gradeLevelId?: string | null;
  topic?: string | null;
  tags?: unknown;
  visibility?: unknown;
};

function taxonomyData(input: BankTaxonomyInput) {
  return {
    subjectId: input.subjectId ? String(input.subjectId) : null,
    gradeLevelId: input.gradeLevelId ? String(input.gradeLevelId) : null,
    topic: input.topic ? String(input.topic).trim().slice(0, 200) : null,
    tags: serializeBankTags(input.tags) || null,
    visibility: normalizeVisibility(input.visibility),
  };
}

function choicesCreate(choices: NormalizedQuestion["choices"], schoolId: string) {
  if (!choices.length) return undefined;
  return {
    create: choices.map((c, ci) => ({
      schoolId,
      label: c.label,
      text: c.text,
      isCorrect: c.isCorrect,
      orderIndex: ci,
    })),
  };
}

export const questionBankService = {
  /**
   * Items visible to the actor, newest first. Subject/grade scoped for teachers.
   */
  async listItems(
    schoolId: string,
    actor: QuestionBankActor,
    filters: {
      type?: string;
      subjectId?: string;
      gradeLevelId?: string;
      visibility?: string;
      mine?: boolean;
      search?: string;
    } = {}
  ) {
    const rooms = await resolveRooms(schoolId, actor);
    const visibilityWhere = bankVisibilityWhere({
      userId: actor.id,
      role: actor.role,
      rooms,
      schoolId,
    });

    const search = asString(filters.search).trim();
    const and: any[] = [{ OR: visibilityWhere.OR }];
    if (search) {
      and.push({
        OR: [
          { prompt: { contains: search, mode: "insensitive" } },
          { topic: { contains: search, mode: "insensitive" } },
          { tags: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const where: any = { schoolId, AND: and };
    if (filters.type) where.type = String(filters.type);
    if (filters.subjectId) where.subjectId = String(filters.subjectId);
    if (filters.gradeLevelId) where.gradeLevelId = String(filters.gradeLevelId);
    if (filters.visibility) where.visibility = normalizeVisibility(filters.visibility);
    if (filters.mine) where.createdBy = actor.id;

    const items = await prisma.questionBankItem.findMany({
      where,
      include: { choices: { orderBy: { orderIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return { items: items.map(serializeItem), total: items.length };
  },

  async getItem(id: string, schoolId: string, actor: QuestionBankActor) {
    const rooms = await resolveRooms(schoolId, actor);
    const item = await prisma.questionBankItem.findFirst({
      where: { id, schoolId },
      include: { choices: { orderBy: { orderIndex: "asc" } } },
    });
    if (!item) throw httpError("Question not found", 404, "BANK_ITEM_NOT_FOUND");
    if (
      !canViewBankItem({
        item: item as BankItemScope,
        userId: actor.id,
        role: actor.role,
        rooms,
        schoolId,
      })
    ) {
      throw httpError("Forbidden", 403, "BANK_ITEM_FORBIDDEN");
    }
    return { item: serializeItem(item) };
  },

  /**
   * Create one or more bank items from an array of question inputs (same shape
   * as the exam question API). Validates through normalizeQuestion.
   */
  async createItems(
    schoolId: string,
    actor: QuestionBankActor,
    inputs: any[],
    taxonomy: BankTaxonomyInput = {}
  ) {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw httpError("At least one question is required", 400, "BANK_EMPTY");
    }
    if (inputs.length > MAX_BANK_ITEMS_PER_REQUEST) {
      throw httpError(
        `At most ${MAX_BANK_ITEMS_PER_REQUEST} questions can be saved at once`,
        400,
        "BANK_TOO_MANY"
      );
    }

    const normalized: NormalizedQuestion[] = inputs.map((raw, index) => {
      const result = normalizeQuestion(raw, index);
      if (!result.ok || !result.normalized) {
        throw httpError(`Question ${index + 1}: ${result.errors[0]}`, 400, "BANK_INVALID");
      }
      return result.normalized;
    });

    const tax = taxonomyData(taxonomy);
    const created = await prisma.$transaction(
      normalized.map((n) =>
        prisma.questionBankItem.create({
          data: {
            schoolId,
            type: n.type,
            prompt: n.prompt,
            points: n.points,
            correctAnswer: n.correctAnswer,
            caseSensitive: n.caseSensitive,
            createdBy: actor.id,
            ...tax,
            choices: choicesCreate(n.choices, schoolId),
          },
          include: { choices: { orderBy: { orderIndex: "asc" } } },
        })
      )
    );

    return { items: created.map(serializeItem), created: created.length };
  },

  async updateItem(
    id: string,
    schoolId: string,
    actor: QuestionBankActor,
    payload: any,
    taxonomy: BankTaxonomyInput = {}
  ) {
    const existing = await prisma.questionBankItem.findFirst({ where: { id, schoolId } });
    if (!existing) throw httpError("Question not found", 404, "BANK_ITEM_NOT_FOUND");
    if (
      !canManageBankItem({
        item: existing as BankItemScope,
        userId: actor.id,
        role: actor.role,
        schoolId,
      })
    ) {
      throw httpError("Forbidden", 403, "BANK_ITEM_FORBIDDEN");
    }

    const result = normalizeQuestion(payload, 0);
    if (!result.ok || !result.normalized) {
      throw httpError(result.errors[0] || "Invalid question", 400, "BANK_INVALID");
    }
    const n = result.normalized;
    const tax = taxonomyData(taxonomy);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.questionBankChoice.deleteMany({ where: { itemId: id, schoolId } });
      return tx.questionBankItem.update({
        where: { id },
        data: {
          type: n.type,
          prompt: n.prompt,
          points: n.points,
          correctAnswer: n.correctAnswer,
          caseSensitive: n.caseSensitive,
          updatedBy: actor.id,
          ...tax,
          choices: choicesCreate(n.choices, schoolId),
        },
        include: { choices: { orderBy: { orderIndex: "asc" } } },
      });
    });

    return { item: serializeItem(updated) };
  },

  async deleteItem(id: string, schoolId: string, actor: QuestionBankActor) {
    const existing = await prisma.questionBankItem.findFirst({ where: { id, schoolId } });
    if (!existing) throw httpError("Question not found", 404, "BANK_ITEM_NOT_FOUND");
    if (
      !canManageBankItem({
        item: existing as BankItemScope,
        userId: actor.id,
        role: actor.role,
        schoolId,
      })
    ) {
      throw httpError("Forbidden", 403, "BANK_ITEM_FORBIDDEN");
    }
    await prisma.questionBankItem.delete({ where: { id } });
    return { deleted: true };
  },

  /**
   * Copy questions from an exam into the bank (copy-on-insert source).
   * Defaults the taxonomy to the exam's subject when not provided.
   */
  async saveFromExam(
    schoolId: string,
    actor: QuestionBankActor,
    examId: string,
    options: BankTaxonomyInput & { questionIds?: string[] } = {}
  ) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: { id: true, subjectId: true },
    });
    if (!exam) throw httpError("Exam not found", 404, "EXAM_NOT_FOUND");

    const questionIds = Array.isArray(options.questionIds)
      ? options.questionIds.map((x) => String(x)).filter(Boolean)
      : [];
    if (questionIds.length > MAX_BANK_ITEMS_PER_REQUEST) {
      throw httpError(
        `At most ${MAX_BANK_ITEMS_PER_REQUEST} questions can be saved at once`,
        400,
        "BANK_TOO_MANY"
      );
    }

    const questions = await prisma.examQuestion.findMany({
      where: {
        examId,
        schoolId,
        ...(questionIds.length ? { id: { in: questionIds } } : {}),
      },
      include: { choices: { orderBy: { orderIndex: "asc" } } },
      orderBy: { orderIndex: "asc" },
    });
    if (!questions.length) {
      throw httpError("No questions to save", 400, "BANK_EMPTY");
    }

    const tax = taxonomyData({
      subjectId: options.subjectId ?? exam.subjectId,
      gradeLevelId: options.gradeLevelId,
      topic: options.topic,
      tags: options.tags,
      visibility: options.visibility,
    });

    const created = await prisma.$transaction(
      questions.map((q) =>
        prisma.questionBankItem.create({
          data: {
            schoolId,
            type: q.type,
            prompt: q.prompt,
            points: q.points,
            correctAnswer: q.correctAnswer ?? null,
            caseSensitive: Boolean(q.caseSensitive),
            createdBy: actor.id,
            sourceExamId: examId,
            sourceQuestionId: q.id,
            ...tax,
            choices: q.choices.length
              ? {
                  create: q.choices.map((c, ci) => ({
                    schoolId,
                    label: c.label,
                    text: c.text,
                    isCorrect: c.isCorrect,
                    orderIndex: ci,
                  })),
                }
              : undefined,
          },
          include: { choices: { orderBy: { orderIndex: "asc" } } },
        })
      )
    );

    return { items: created.map(serializeItem), created: created.length };
  },
};
