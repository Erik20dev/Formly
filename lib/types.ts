export type QuestionType = "text" | "email" | "choice" | "yesno";
export type Question = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
};
export type FormRecord = {
  id: string;
  title: string;
  description: string;
  published: boolean;
  welcomeText: string;
  completionText: string;
  accentColor: string;
  questions: Question[];
  createdAt: string;
};
export type Submission = {
  id: string;
  formId: string;
  answers: Record<string, string>;
  submittedAt: string;
};
