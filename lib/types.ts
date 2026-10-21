
export type QuestionType =
  | "text"
  | "email"
  | "choice"
  | "yesno"
  | "dropdown"
  | "rating"
  | "date"
  | "file";

export type QuestionCondition = {
  questionId: string;
  operator: "equals" | "not_equals";
  value: string;
};

export type Question = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  condition?: QuestionCondition;
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
