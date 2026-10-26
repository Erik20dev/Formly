
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  FormRecord,
  Question,
  QuestionCondition,
  Submission,
} from "@/lib/types";
import { getFormAnalytics } from "@/lib/analytics";

const DRAFT_STORAGE_KEY = "formly-editor-draft";

type AnalyticsEvent = {
  form_id: string;
  event_type: "view" | "start" | "completion";
  session_id: string;
  created_at: string;
};

const emptyForm = (): FormRecord => ({
  id: crypto.randomUUID(),
  title: "Untitled form",
  description: "",
  published: false,
  welcomeText: "Hi! Let's get started.",
  completionText: "Thanks for your response!",
  accentColor: "#4f46e5",
  questions: [
    {
      id: crypto.randomUUID(),
      label: "What would you like to tell us?",
      type: "text",
      required: true,
    },
  ],
  createdAt: new Date().toISOString(),
});

const FORM_TEMPLATES: {
  name: string;
  description: string;
  title: string;
  formDescription: string;
  welcomeText: string;
  completionText: string;
  questions: {
    label: string;
    type: Question["type"];
    required: boolean;
    options?: string[];
  }[];
}[] = [
  {
    name: "Contact form",
    description: "Collect contact details and enquiries.",
    title: "Contact us",
    formDescription: "Send our team a message.",
    welcomeText: "How can we help you?",
    completionText: "Thanks for contacting us!",
    questions: [
      { label: "Your name", type: "text", required: true },
      { label: "Your email", type: "email", required: true },
      {
        label: "What can we help you with?",
        type: "dropdown",
        required: true,
        options: ["General enquiry", "Support", "Partnership"],
      },
      { label: "Your message", type: "text", required: true },
    ],
  },
  {
    name: "Customer feedback",
    description: "Understand customer satisfaction.",
    title: "Customer feedback",
    formDescription: "Tell us about your experience.",
    welcomeText: "We value your feedback.",
    completionText: "Thank you for helping us improve!",
    questions: [
      {
        label: "How would you rate your experience?",
        type: "rating",
        required: true,
      },
      {
        label: "What did you like most?",
        type: "text",
        required: false,
      },
      {
        label: "Would you recommend us?",
        type: "yesno",
        required: true,
      },
      {
        label: "What could we improve?",
        type: "text",
        required: false,
      },
    ],
  },
  {
    name: "Event registration",
    description: "Register attendees for an event.",
    title: "Event registration",
    formDescription: "Register your interest in our event.",
    welcomeText: "Join our upcoming event!",
    completionText: "Your registration has been received.",
    questions: [
      { label: "Full name", type: "text", required: true },
      { label: "Email address", type: "email", required: true },
      {
        label: "Which session will you attend?",
        type: "dropdown",
        required: true,
        options: ["Morning", "Afternoon", "Full day"],
      },
      {
        label: "Registration date",
        type: "date",
        required: true,
      },
    ],
  },
  {
    name: "Job application",
    description: "Collect candidate details and applications.",
    title: "Job application",
    formDescription: "Apply to join our team.",
    welcomeText: "Tell us about yourself.",
    completionText: "Thank you for applying!",
    questions: [
      { label: "Full name", type: "text", required: true },
      { label: "Email address", type: "email", required: true },
      {
        label: "Position you are applying for",
        type: "text",
        required: true,
      },
      {
        label: "Available start date",
        type: "date",
        required: true,
      },
      {
        label: "Upload your CV",
        type: "file",
        required: true,
      },
    ],
  },
];

function createFormFromTemplate(
  template: (typeof FORM_TEMPLATES)[number],
): FormRecord {
  return {
    id: crypto.randomUUID(),
    title: template.title,
    description: template.formDescription,
    published: false,
    welcomeText: template.welcomeText,
    completionText: template.completionText,
    accentColor: "#4f46e5",
    createdAt: new Date().toISOString(),
    questions: template.questions.map((question) => ({
      ...question,
      id: crypto.randomUUID(),
    })),
  };
}

function defaultOptions(type: Question["type"]): string[] | undefined {
  return type === "choice" || type === "dropdown"
    ? ["Option 1", "Option 2"]
    : undefined;
}

function getConditionOptions(question: Question): string[] {
  if (question.type === "yesno") return ["Yes", "No"];

  if (question.type === "choice" || question.type === "dropdown") {
    return question.options ?? [];
  }

  if (question.type === "rating") return ["1", "2", "3", "4", "5"];

  return [];
}

export default function Dashboard() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editing, setEditing] = useState<FormRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"forms" | "responses">("forms");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [formSearch, setFormSearch] = useState("");
  const [formFilter, setFormFilter] = useState("all");
  const [widgetPosition, setWidgetPosition] = useState<"right" | "left">(
    "right",
  );
  const [widgetAvatar, setWidgetAvatar] = useState("✦");

  // Recover an unfinished form draft when the dashboard opens.
  useEffect(() => {
    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);

    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft) as {
        form?: FormRecord;
        savedAt?: string;
      };

      if (!parsed.form || typeof parsed.form.id !== "string") {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }

      const recover = window.confirm(
        `Recover your unfinished draft "${parsed.form.title}"?`,
      );

      if (recover) {
        setEditing(parsed.form);
        setMessage("Unfinished draft recovered.");
      } else {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  // Automatically save editor changes in this browser.
  useEffect(() => {
    if (!editing) return;

    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            form: editing,
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        setMessage("Could not save a local draft in this browser.");
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [editing]);

  const analytics = getFormAnalytics(
    forms,
    submissions,
    startDate || undefined,
    endDate || undefined,
  );

  const appUrl =
    typeof window === "undefined" ? "" : window.location.origin;

  async function refresh() {
    setLoading(true);

    try {
      const [formsResponse, submissionsResponse, analyticsResponse] =
        await Promise.all([
          fetch("/api/forms"),
          fetch("/api/submissions"),
          fetch("/api/analytics"),
        ]);

      if (!formsResponse.ok || !submissionsResponse.ok) {
        throw new Error("Could not load dashboard data.");
      }

      setForms(await formsResponse.json());
      setSubmissions(await submissionsResponse.json());

      if (analyticsResponse.ok) {
        const data = await analyticsResponse.json();
        setAnalyticsEvents(data.events ?? []);
      } else {
        setAnalyticsEvents([]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Loading failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function save() {
    if (!editing) return;

    if (!editing.questions.length) {
      setMessage("Add at least one question before saving.");
      return;
    }

    if (editing.questions.some((question) => !question.label.trim())) {
      setMessage("Every question needs a label.");
      return;
    }

    if (
      editing.questions.some(
        (question) =>
          (question.type === "choice" || question.type === "dropdown") &&
          !(question.options ?? []).some((option) => option.trim()),
      )
    ) {
      setMessage(
        "Add at least one option to each multiple-choice or dropdown question.",
      );
      return;
    }

    const questionIds = new Set(
      editing.questions.map((question) => question.id),
    );

    if (
      editing.questions.some(
        (question) =>
          question.condition &&
          (!questionIds.has(question.condition.questionId) ||
            question.condition.questionId === question.id),
      )
    ) {
      setMessage(
        "Each conditional rule must refer to a different question in this form.",
      );
      return;
    }

    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Could not save form.");
        return;
      }

      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      setEditing(null);
      setMessage("Form saved successfully.");
      await refresh();
    } catch {
      setMessage("Could not save form. Please check your connection.");
    }
  }

  async function remove(formId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this form? All saved submissions for this form will also be permanently deleted.",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Could not delete form.");
        return;
      }

      if (editing?.id === formId) {
        setEditing(null);
      }

      setMessage("Form deleted successfully.");
      await refresh();
    } catch {
      setMessage("Could not delete form. Please check your connection.");
    }
  }

  async function duplicateForm(form: FormRecord) {
    const questionIdMap = new Map(
      form.questions.map((question) => [
        question.id,
        crypto.randomUUID(),
      ]),
    );

    const duplicate: FormRecord = {
      ...form,
      id: crypto.randomUUID(),
      title: `${form.title} (Copy)`,
      published: false,
      createdAt: new Date().toISOString(),
      questions: form.questions.map((question) => ({
        ...question,
        id: questionIdMap.get(question.id)!,
        options: question.options ? [...question.options] : undefined,
        condition:
          question.condition &&
          questionIdMap.has(question.condition.questionId)
            ? {
                ...question.condition,
                questionId: questionIdMap.get(
                  question.condition.questionId,
                )!,
              }
            : undefined,
      })),
    };

    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicate),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Could not duplicate form.");
        return;
      }

      setMessage("Form duplicated successfully as a draft.");
      await refresh();
    } catch {
      setMessage("Could not duplicate form. Please check your connection.");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      // If clipboard access is blocked, show the code so it can be copied manually.
      setMessage("Clipboard access failed. The code is shown in the message below.");
      setMessage(text);
    }
  }

  function updateQuestion(index: number, patch: Partial<Question>) {
    if (!editing) return;

    setEditing({
      ...editing,
      questions: editing.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    });
  }

  function setQuestionCondition(
    index: number,
    condition: QuestionCondition | undefined,
  ) {
    updateQuestion(index, { condition });
  }

  function addQuestion() {
    if (!editing) return;

    setEditing({
      ...editing,
      questions: [
        ...editing.questions,
        {
          id: crypto.randomUUID(),
          label: "New question",
          type: "text",
          required: false,
        },
      ],
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    if (!editing) return;

    const questions = [...editing.questions];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= questions.length) return;

    [questions[index], questions[targetIndex]] = [
      questions[targetIndex],
      questions[index],
    ];

    setEditing({ ...editing, questions });
  }

  function deleteQuestion(id: string) {
    if (!editing) return;

    setEditing({
      ...editing,
      questions: editing.questions
        .filter((question) => question.id !== id)
        .map((question) =>
          question.condition?.questionId === id
            ? { ...question, condition: undefined }
            : question,
        ),
    });
  }

  function exportAnalyticsCsv() {
    const rows: string[][] = [
      [
        "Form",
        "Total Responses",
        "Question",
        "Total Answers",
        "Answer",
        "Count",
      ],
    ];

    for (const form of analytics) {
      for (const question of form.responsesByQuestion) {
        const answers = Object.entries(question.answerCounts);

        if (answers.length === 0) {
          rows.push([
            form.title,
            String(form.totalResponses),
            question.questionLabel,
            String(question.totalAnswers),
            "",
            "0",
          ]);
        } else {
          for (const [answer, count] of answers) {
            rows.push([
              form.title,
              String(form.totalResponses),
              question.questionLabel,
              String(question.totalAnswers),
              answer,
              String(count),
            ]);
          }
        }
      }
    }

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "formly-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen pb-12">
      <header className="border-b bg-white">
        <div className="shell flex items-center justify-between py-5">
          <Link href="/" className="text-2xl font-black">
            <span className="text-indigo-600">●</span> formly
          </Link>

          <Link href="/" className="text-sm font-semibold text-slate-600">
            ← Back to website
          </Link>
        </div>
      </header>

      <div className="shell py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-black">Dashboard</h1>
            <p className="mt-2 text-slate-500">
              Create forms, publish them and manage responses.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setShowTemplateGallery(true)}
            >
              ✦ Browse templates
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(emptyForm());
                setMessage("");
              }}
            >
              ＋ Create form
            </button>
          </div>
        </div>

        {showTemplateGallery && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            onClick={() => setShowTemplateGallery(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="template-gallery-title"
              className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="template-gallery-title"
                    className="text-2xl font-black"
                  >
                    Start with a template
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose a starting point, then customize it in the form
                    editor.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close template gallery"
                  className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  onClick={() => setShowTemplateGallery(false)}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {FORM_TEMPLATES.map((template, index) => (
                  <button
                    key={template.name}
                    type="button"
                    className="rounded-xl border border-slate-200 p-5 text-left transition hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={() => {
                      setEditing(createFormFromTemplate(template));
                      setMessage(
                        `${template.name} template opened as a new draft.`,
                      );
                      setShowTemplateGallery(false);
                    }}
                  >
                    <span className="text-sm font-bold text-indigo-600">
                      TEMPLATE {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-2 text-lg font-bold">{template.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {template.description}
                    </p>
                    <p className="mt-4 text-xs font-semibold text-slate-500">
                      {template.questions.length} questions · Unpublished draft
                    </p>
                    <span className="mt-4 inline-block text-sm font-bold text-indigo-700">
                      Use this template →
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-5 break-words rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800"
          >
            {message}
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <Stat label="Total forms" value={forms.length} />
          <Stat
            label="Published forms"
            value={forms.filter((form) => form.published).length}
          />
          <Stat label="Total responses" value={submissions.length} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Form views"
            value={
              analyticsEvents.filter((event) => event.event_type === "view")
                .length
            }
          />
          <Stat
            label="Form starts"
            value={
              analyticsEvents.filter((event) => event.event_type === "start")
                .length
            }
          />
          <Stat
            label="Form completions"
            value={
              analyticsEvents.filter(
                (event) => event.event_type === "completion",
              ).length
            }
          />
        </div>

        <section className="panel mt-6 p-5">
          <h2 className="text-xl font-black">Response analytics</h2>
          <p className="mt-1 text-sm text-slate-500">
            See how many responses each form has received and review answers by
            question.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2"
              />
            </label>

            <label className="block text-sm font-semibold">
              End date
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Clear date filters
            </button>

            <button
              type="button"
              onClick={exportAnalyticsCsv}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Export analytics CSV
            </button>
          </div>

          {analytics.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Create a form to start viewing analytics.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {analytics.map((form) => (
                <section key={form.formId} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{form.title}</h3>
                    <span className="text-sm text-slate-500">
                      {form.totalResponses} responses
                    </span>
                  </div>

                  {form.responsesByQuestion.map((question) => (
                    <div key={question.questionId} className="mt-4">
                      <p className="text-sm font-semibold">
                        {question.questionLabel}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {question.totalAnswers} answers
                      </p>

                      {Object.keys(question.answerCounts).length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {Object.entries(question.answerCounts).map(
                            ([answer, count]) => (
                              <li
                                key={answer}
                                className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                              >
                                <span className="break-words">{answer}</span>
                                <span className="shrink-0 font-bold">
                                  {count}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">
                          No answers recorded yet.
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 flex gap-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab("forms")}
            className={`px-4 py-3 text-sm font-bold ${
              activeTab === "forms"
                ? "border-b-2 border-indigo-600 text-indigo-700"
                : "text-slate-500"
            }`}
          >
            My forms
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("responses")}
            className={`px-4 py-3 text-sm font-bold ${
              activeTab === "responses"
                ? "border-b-2 border-indigo-600 text-indigo-700"
                : "text-slate-500"
            }`}
          >
            Submissions ({submissions.length})
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-slate-500">Loading workspace…</p>
        ) : activeTab === "forms" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="col-span-full flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={formSearch}
                onChange={(event) => setFormSearch(event.target.value)}
                placeholder="Search forms by title or description..."
                aria-label="Search forms"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm"
              />

              <select
                value={formFilter}
                onChange={(event) => setFormFilter(event.target.value)}
                aria-label="Filter forms by status"
                className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm sm:min-w-44"
              >
                <option value="all">All forms</option>
                <option value="published">Published forms</option>
                <option value="draft">Drafts only</option>
              </select>
            </div>

            {forms
              .filter((form) => {
                const search = formSearch.trim().toLowerCase();
                const matchesSearch =
                  form.title.toLowerCase().includes(search) ||
                  (form.description ?? "").toLowerCase().includes(search);

                const matchesFilter =
                  formFilter === "all" ||
                  (formFilter === "published" && form.published) ||
                  (formFilter === "draft" && !form.published);

                return matchesSearch && matchesFilter;
              })
              .map((form) => (
                <article className="panel p-5" key={form.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">{form.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {form.questions.length} questions ·{" "}
                        {
                          submissions.filter(
                            (submission) => submission.formId === form.id,
                          ).length
                        }{" "}
                        responses
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        form.published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {form.published ? "Published" : "Draft"}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-2 min-h-10 text-sm text-slate-600">
                    {form.description || "No description added yet."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-light text-sm"
                      onClick={() =>
                        setEditing({
                          ...form,
                          questions: form.questions.map((question) => ({
                            ...question,
                            options: question.options
                              ? [...question.options]
                              : undefined,
                            condition: question.condition
                              ? { ...question.condition }
                              : undefined,
                          })),
                        })
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-light text-sm"
                      onClick={() => void duplicateForm(form)}
                    >
                      Duplicate
                    </button>

                    <button
                      type="button"
                      className="btn btn-light text-sm"
                      onClick={() => void copy(`${appUrl}/forms/${form.id}`)}
                    >
                      Copy public link
                    </button>

                    <div className="w-full grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-600">
                        Widget position
                        <select
                          className="field mt-2"
                          value={widgetPosition}
                          onChange={(event) =>
                            setWidgetPosition(
                              event.target.value as "right" | "left",
                            )
                          }
                        >
                          <option value="right">Bottom right</option>
                          <option value="left">Bottom left</option>
                        </select>
                      </label>

                      <label className="text-sm font-semibold text-slate-600">
                        Widget avatar
                        <select
                          className="field mt-2"
                          value={widgetAvatar}
                          onChange={(event) =>
                            setWidgetAvatar(event.target.value)
                          }
                        >
                          <option value="✦">Star ✦</option>
                          <option value="💬">Chat bubble 💬</option>
                          <option value="?">Help ?</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-light text-sm"
                        onClick={() =>
                          void copy(
                            `<script src="${appUrl}/widget.js" data-form-id="${form.id}" data-color="${form.accentColor || "#4f46e5"}" data-position="${widgetPosition}" data-avatar="${widgetAvatar}" data-mode="floating" defer></script>`,
                          )
                        }
                      >
                        Copy floating widget code
                      </button>

                      <button
                        type="button"
                        className="btn btn-light text-sm"
                        onClick={() =>
                          void copy(
                            `<div id="formly-inline-${form.id}"></div>\n<script src="${appUrl}/widget.js" data-form-id="${form.id}" data-color="${form.accentColor || "#4f46e5"}" data-mode="inline" data-target="#formly-inline-${form.id}" defer></script>`,
                          )
                        }
                      >
                        Copy inline embed code
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-light text-sm text-rose-600"
                      onClick={() => void remove(form.id)}
                    >
                      Delete
                    </button>
                  </div>

                  {form.published && (
                    <Link
                      className="mt-4 inline-block text-sm font-bold text-indigo-700"
                      href={`/forms/${form.id}`}
                    >
                      Open public form ↗
                    </Link>
                  )}
                </article>
              ))}

            {forms.filter((form) => {
              const search = formSearch.trim().toLowerCase();
              const matchesSearch =
                form.title.toLowerCase().includes(search) ||
                (form.description ?? "").toLowerCase().includes(search);

              const matchesFilter =
                formFilter === "all" ||
                (formFilter === "published" && form.published) ||
                (formFilter === "draft" && !form.published);

              return matchesSearch && matchesFilter;
            }).length === 0 && (
              <div className="panel col-span-full p-10 text-center">
                <div className="text-4xl">✦</div>
                <h2 className="mt-3 text-xl font-bold">
                  {forms.length === 0
                    ? "Your workspace starts here"
                    : "No matching forms found"}
                </h2>
                <p className="mt-2 text-slate-500">
                  {forms.length === 0
                    ? "Create your first form to start collecting responses."
                    : "Try another search term or change the status filter."}
                </p>
                <button
                  type="button"
                  className="btn btn-primary mt-5"
                  onClick={() => setEditing(emptyForm())}
                >
                  Create a form
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {submissions.length === 0 ? (
              <div className="panel p-10 text-center text-slate-500">
                No submissions yet. Publish a form and share its link to
                collect responses.
              </div>
            ) : (
              submissions.map((submission) => (
                <article className="panel p-5" key={submission.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-bold">
                      {forms.find(
                        (form) => form.id === submission.formId,
                      )?.title ?? "Form response"}
                    </h3>
                    <time className="text-sm text-slate-500">
                      {new Date(submission.submittedAt).toLocaleString()}
                    </time>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {Object.entries(submission.answers).map(([id, answer]) => {
                      const question = forms
                        .find((form) => form.id === submission.formId)
                        ?.questions.find((item) => item.id === id);

                      const isFile = question?.type === "file";

                      return (
                        <div key={id} className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            {question?.label ?? "Answer"}
                          </p>
                          <p className="mt-1 break-words text-sm font-medium">
                            {isFile ? "Uploaded file" : answer}
                          </p>

                          {isFile && (
                            <button
                              type="button"
                              className="mt-2 text-sm font-semibold text-indigo-700 underline"
                              onClick={async () => {
                                try {
                                  const response = await fetch(
                                    `/api/file-access?path=${encodeURIComponent(answer)}`,
                                  );
                                  const result = await response.json();

                                  if (!response.ok || !result.url) {
                                    alert(
                                      result.error ??
                                        "Could not download this file.",
                                    );
                                    return;
                                  }

                                  window.open(
                                    result.url,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                } catch {
                                  alert(
                                    "Could not download this file. Please try again.",
                                  );
                                }
                              }}
                            >
                              Download uploaded file
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 sm:p-8">
            <div className="mx-auto my-4 max-w-3xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-indigo-600">
                    FORM BUILDER
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {forms.some((form) => form.id === editing.id)
                      ? "Edit form"
                      : "Create a form"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-xl text-slate-500"
                  onClick={() => setEditing(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Form title
                  <input
                    className="field mt-2 font-normal"
                    value={editing.title}
                    onChange={(event) =>
                      setEditing({ ...editing, title: event.target.value })
                    }
                    required
                  />
                </label>

                <label className="text-sm font-bold">
                  Description
                  <textarea
                    className="field mt-2 font-normal"
                    rows={2}
                    value={editing.description}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        description: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="text-sm font-bold">
                  Welcome message
                  <input
                    className="field mt-2 font-normal"
                    value={editing.welcomeText}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        welcomeText: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="text-sm font-bold">
                  Completion message
                  <input
                    className="field mt-2 font-normal"
                    value={editing.completionText}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        completionText: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="text-sm font-bold">
                  Accent color
                  <input
                    className="field mt-2 h-11 p-1"
                    type="color"
                    value={editing.accentColor}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        accentColor: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="flex items-center gap-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={editing.published}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        published: event.target.checked,
                      })
                    }
                  />
                  Publish form
                </label>
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">Questions</h3>
                <button
                  type="button"
                  className="btn btn-light text-sm"
                  onClick={addQuestion}
                >
                  ＋ Add question
                </button>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Conditional logic lets you show a question based on an answer
                to another question. Configure a rule below each question.
              </p>

              <div className="mt-4 space-y-4">
                {editing.questions.map((question, index) => {
                  const availableTriggers = editing.questions.filter(
                    (candidate, candidateIndex) =>
                      candidateIndex < index &&
                      (candidate.type === "yesno" ||
                        candidate.type === "choice" ||
                        candidate.type === "dropdown" ||
                        candidate.type === "rating"),
                  );

                  const selectedTrigger = availableTriggers.find(
                    (candidate) =>
                      candidate.id === question.condition?.questionId,
                  );

                  const triggerOptions = selectedTrigger
                    ? getConditionOptions(selectedTrigger)
                    : [];

                  return (
                    <div
                      className="rounded-xl border border-slate-200 p-4"
                      key={question.id}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-3 text-sm font-black text-slate-400">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_170px]">
                          <input
                            className="field"
                            value={question.label}
                            aria-label="Question label"
                            onChange={(event) =>
                              updateQuestion(index, {
                                label: event.target.value,
                              })
                            }
                          />

                          <select
                            className="field"
                            aria-label="Question type"
                            value={question.type}
                            onChange={(event) => {
                              const type = event.target.value as Question["type"];

                              updateQuestion(index, {
                                type,
                                options:
                                  type === "choice" || type === "dropdown"
                                    ? question.options?.length
                                      ? question.options
                                      : defaultOptions(type)
                                    : undefined,
                              });
                            }}
                          >
                            <option value="text">Short text</option>
                            <option value="email">Email</option>
                            <option value="choice">Multiple choice</option>
                            <option value="yesno">Yes / No</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="rating">Rating</option>
                            <option value="date">Date</option>
                            <option value="file">File upload</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          className="px-2 py-2 text-rose-600"
                          onClick={() => deleteQuestion(question.id)}
                          aria-label="Delete question"
                        >
                          ✕
                        </button>
                      </div>

                      {(question.type === "choice" ||
                        question.type === "dropdown") && (
                        <label className="mt-3 block pl-8 text-sm font-semibold">
                          Options (separate with commas)
                          <input
                            className="field mt-2 font-normal"
                            value={(question.options ?? []).join(", ")}
                            placeholder="Option 1, Option 2, Option 3"
                            onChange={(event) =>
                              updateQuestion(index, {
                                options: event.target.value
                                  .split(",")
                                  .map((value) => value.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </label>
                      )}

                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <label className="flex items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={Boolean(question.condition)}
                            disabled={availableTriggers.length === 0}
                            onChange={(event) => {
                              if (!event.target.checked) {
                                setQuestionCondition(index, undefined);
                                return;
                              }

                              const trigger = availableTriggers[0];
                              const options = getConditionOptions(trigger);

                              setQuestionCondition(index, {
                                questionId: trigger.id,
                                operator: "equals",
                                value: options[0] ?? "",
                              });
                            }}
                          />
                          Show this question only when a condition is met
                        </label>

                        {availableTriggers.length === 0 && (
                          <p className="mt-2 text-xs text-slate-500">
                            Add an earlier Yes / No, Multiple choice, Dropdown,
                            or Rating question to use conditional logic here.
                          </p>
                        )}

                        {question.condition &&
                          availableTriggers.length > 0 && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                              <label className="text-xs font-semibold text-slate-600">
                                When the answer to
                                <select
                                  className="field mt-1 text-sm font-normal"
                                  value={
                                    selectedTrigger?.id ??
                                    question.condition.questionId
                                  }
                                  onChange={(event) => {
                                    const trigger = availableTriggers.find(
                                      (candidate) =>
                                        candidate.id === event.target.value,
                                    );

                                    if (!trigger) return;

                                    const options = getConditionOptions(trigger);

                                    setQuestionCondition(index, {
                                      questionId: trigger.id,
                                      operator:
                                        question.condition?.operator ??
                                        "equals",
                                      value: options[0] ?? "",
                                    });
                                  }}
                                >
                                  {availableTriggers.map((trigger) => (
                                    <option
                                      key={trigger.id}
                                      value={trigger.id}
                                    >
                                      {trigger.label || "Untitled question"}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="text-xs font-semibold text-slate-600">
                                Comparison
                                <select
                                  className="field mt-1 text-sm font-normal"
                                  value={question.condition.operator}
                                  onChange={(event) =>
                                    setQuestionCondition(index, {
                                      ...question.condition!,
                                      operator: event.target.value as
                                        | "equals"
                                        | "not_equals",
                                    })
                                  }
                                >
                                  <option value="equals">Equals</option>
                                  <option value="not_equals">
                                    Does not equal
                                  </option>
                                </select>
                              </label>

                              <label className="text-xs font-semibold text-slate-600">
                                This answer
                                {triggerOptions.length > 0 ? (
                                  <select
                                    className="field mt-1 text-sm font-normal"
                                    value={question.condition.value}
                                    onChange={(event) =>
                                      setQuestionCondition(index, {
                                        ...question.condition!,
                                        value: event.target.value,
                                      })
                                    }
                                  >
                                    {triggerOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    className="field mt-1 text-sm font-normal"
                                    value={question.condition.value}
                                    onChange={(event) =>
                                      setQuestionCondition(index, {
                                        ...question.condition!,
                                        value: event.target.value,
                                      })
                                    }
                                  />
                                )}
                              </label>
                            </div>
                          )}
                      </div>

                      <label className="mt-3 flex items-center gap-2 pl-8 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(event) =>
                            updateQuestion(index, {
                              required: event.target.checked,
                            })
                          }
                        />
                        Required question
                      </label>

                      <div className="mt-3 flex gap-2 pl-8">
                        <button
                          type="button"
                          className="text-xs font-bold text-indigo-700 disabled:text-slate-300"
                          disabled={index === 0}
                          onClick={() => moveQuestion(index, -1)}
                        >
                          ↑ Move up
                        </button>

                        <button
                          type="button"
                          className="text-xs font-bold text-indigo-700 disabled:text-slate-300"
                          disabled={index === editing.questions.length - 1}
                          onClick={() => moveQuestion(index, 1)}
                        >
                          ↓ Move down
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void save()}
                >
                  Save form
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
