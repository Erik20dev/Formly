import type { Question } from "@/lib/types";

export function getVisibleQuestions(
  questions: Question[],
  answers: Record<string, string>
): Question[] {
  const visibleQuestions: Question[] = [];
  const visibleIds = new Set<string>();

  for (const question of questions) {
    const condition = question.condition;

    if (condition) {
      // A condition must refer to an earlier visible question.
      if (!visibleIds.has(condition.questionId)) {
        continue;
      }

      const triggerAnswer = answers[condition.questionId] ?? "";
      const matches = triggerAnswer === condition.value;

      if (
        (condition.operator === "equals" && !matches) ||
        (condition.operator === "not_equals" && matches)
      ) {
        continue;
      }
    }

    visibleQuestions.push(question);
    visibleIds.add(question.id);
  }

  return visibleQuestions;
}