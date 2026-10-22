
import type { FormRecord, Submission } from "@/lib/types";

export type FormAnalytics = {
  formId: string;
  title: string;
  totalResponses: number;
  responsesByQuestion: {
    questionId: string;
    questionLabel: string;
    totalAnswers: number;
    answerCounts: Record<string, number>;
  }[];
};

export function getFormAnalytics(
  forms: FormRecord[],
  submissions: Submission[],
  startDate?: string,
  endDate?: string,
): FormAnalytics[] {
  const filteredSubmissions = submissions.filter((submission) => {
    const date = new Date(submission.submittedAt);

    if (Number.isNaN(date.getTime())) return false;
    if (startDate && date < new Date(`${startDate}T00:00:00`)) return false;

    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999`);
      if (date > end) return false;
    }

    return true;
  });

  return forms.map((form) => {
    const formSubmissions = filteredSubmissions.filter(
      (submission) => submission.formId === form.id,
    );

    return {
      formId: form.id,
      title: form.title,
      totalResponses: formSubmissions.length,
      responsesByQuestion: form.questions.map((question) => {
        const answers = formSubmissions
          .map((submission) => submission.answers[question.id])
          .filter(
            (answer): answer is string =>
              typeof answer === "string" && answer.trim().length > 0,
          );

        const answerCounts: Record<string, number> = {};

        for (const answer of answers) {
          answerCounts[answer] = (answerCounts[answer] ?? 0) + 1;
        }

        return {
          questionId: question.id,
          questionLabel: question.label,
          totalAnswers: answers.length,
          answerCounts,
        };
      }),
    };
  });
}
