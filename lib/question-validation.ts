
import type { Question, QuestionType } from "@/lib/types";

const QUESTION_TYPES: QuestionType[] = [
  "text",
  "email",
  "choice",
  "yesno",
  "dropdown",
  "rating",
  "date",
  "file",
];

export function validateQuestions(value: unknown): value is Question[] {
  if (!Array.isArray(value)) return false;

  const ids = new Set<string>();
  const earlierQuestions = new Map<string, Question>();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }

    const question = item as Record<string, unknown>;

    if (
      typeof question.id !== "string" ||
      !question.id.trim() ||
      question.id !== question.id.trim() ||
      ids.has(question.id) ||
      typeof question.label !== "string" ||
      !question.label.trim() ||
      !QUESTION_TYPES.includes(question.type as QuestionType) ||
      typeof question.required !== "boolean"
    ) {
      return false;
    }

    if (question.options !== undefined) {
      if (
        !Array.isArray(question.options) ||
        !question.options.every(
          (option) => typeof option === "string" && option.trim() !== "",
        )
      ) {
        return false;
      }

      const options = question.options as string[];

      if (new Set(options).size !== options.length) {
        return false;
      }
    }

    if (
      (question.type === "choice" || question.type === "dropdown") &&
      (!Array.isArray(question.options) || question.options.length === 0)
    ) {
      return false;
    }

    if (question.condition !== undefined) {
      if (
        !question.condition ||
        typeof question.condition !== "object" ||
        Array.isArray(question.condition)
      ) {
        return false;
      }

      const condition = question.condition as Record<string, unknown>;
      const trigger =
        typeof condition.questionId === "string"
          ? earlierQuestions.get(condition.questionId)
          : undefined;

      if (
        !trigger ||
        trigger.type === "file" ||
        (condition.operator !== "equals" &&
          condition.operator !== "not_equals") ||
        typeof condition.value !== "string"
      ) {
        return false;
      }

      if (trigger.type === "yesno" && !["Yes", "No"].includes(condition.value)) {
        return false;
      }

      if (
        (trigger.type === "choice" || trigger.type === "dropdown") &&
        (!trigger.options || !trigger.options.includes(condition.value))
      ) {
        return false;
      }

      if (
        trigger.type === "rating" &&
        !["1", "2", "3", "4", "5"].includes(condition.value)
      ) {
        return false;
      }
    }

    ids.add(question.id);
    earlierQuestions.set(question.id, question as unknown as Question);
  }

  return true;
}
