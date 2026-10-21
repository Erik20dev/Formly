
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormRecord, Question, QuestionCondition, Submission } from "@/lib/types";

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

function defaultOptions(type: Question["type"]): string[] | undefined {
  if (type === "choice" || type === "dropdown") {
    return ["Option 1", "Option 2"];
  }
  return undefined;
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
  const [editing, setEditing] = useState<FormRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"forms" | "responses">("forms");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const appUrl =
    typeof window === "undefined" ? "" : window.location.origin;

  async function refresh() {
    setLoading(true);

    try {
      const [formsResponse, submissionsResponse] = await Promise.all([
        fetch("/api/forms"),
        fetch("/api/submissions"),
      ]);

      if (!formsResponse.ok || !submissionsResponse.ok) {
        throw new Error("Could not load dashboard data.");
      }

      setForms(await formsResponse.json());
      setSubmissions(await submissionsResponse.json());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Loading failed."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function save() {
    if (!editing?.title.trim()) {
      setMessage("Please enter a form title.");
      return;
    }

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
          !(question.options ?? []).some((option) => option.trim())
      )
    ) {
      setMessage(
        "Add at least one option to each multiple-choice or dropdown question."
      );
      return;
    }

    const questionIds = new Set(editing.questions.map((question) => question.id));

    if (
      editing.questions.some(
        (question) =>
          question.condition &&
          (!questionIds.has(question.condition.questionId) ||
            question.condition.questionId === question.id)
      )
    ) {
      setMessage(
        "Each conditional rule must refer to a different question in this form."
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

      setEditing(null);
      setMessage("Form saved successfully.");
      await refresh();
    } catch {
      setMessage("Could not save form. Please check your connection.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this form and its saved responses?")) return;

    const response = await fetch(`/api/forms/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage("Could not delete form.");
      return;
    }

    await refresh();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage(text);
    }
  }

  function updateQuestion(
    index: number,
    patch: Partial<Question>
  ) {
    if (!editing) return;

    setEditing({
      ...editing,
      questions: editing.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question
      ),
    });
  }

  function setQuestionCondition(
    index: number,
    condition: QuestionCondition | undefined
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
            : question
        ),
    });
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
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(emptyForm());
              setMessage("");
            }}
          >
            ＋ Create form
          </button>
        </div>

        {message && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800"
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

        <div className="mt-8 flex gap-2 border-b">
          <button
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
            {forms.map((form) => (
              <article className="panel p-5" key={form.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{form.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {form.questions.length} questions ·{" "}
                      {
                        submissions.filter(
                          (submission) => submission.formId === form.id
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
                    className="btn btn-light text-sm"
                    onClick={() => void copy(`${appUrl}/forms/${form.id}`)}
                  >
                    Copy public link
                  </button>
                  <button
                    className="btn btn-light text-sm"
                    onClick={() =>
                      void copy(
                        `<script src="${appUrl}/widget.js" data-form-id="${form.id}" defer></script>`
                      )
                    }
                  >
                    Copy embed code
                  </button>
                  <button
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

            {forms.length === 0 && (
              <div className="panel col-span-full p-10 text-center">
                <div className="text-4xl">✦</div>
                <h2 className="mt-3 text-xl font-bold">
                  Your workspace starts here
                </h2>
                <p className="mt-2 text-slate-500">
                  Create your first form to start collecting responses.
                </p>
                <button
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
            {submissions.map((submission) => (
              <article className="panel p-5" key={submission.id}>
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-bold">
                    {forms.find((form) => form.id === submission.formId)
                      ?.title ?? "Form response"}
                  </h3>
                  <time className="text-sm text-slate-500">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </time>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  
{Object.entries(submission.answers).map(([id, answer]) => {
  const question = forms
    .find((form) => form.id === submission.formId)
    ?.questions.find((question) => question.id === id);

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
          `/api/file-access?path=${encodeURIComponent(answer)}`
        );

        const result = await response.json();

        if (!response.ok || !result.url) {
          alert(result.error ?? "Could not download this file.");
          return;
        }

        window.open(result.url, "_blank", "noopener,noreferrer");
      } catch {
        alert("Could not download this file. Please try again.");
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

                
                {submissions.length === 0 && (
                  <div className="panel p-10 text-center text-slate-500">
                    No submissions yet. Publish a form and share its link to
                    collect responses.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>


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
              <button className="btn btn-light text-sm" onClick={addQuestion}>
                ＋ Add question
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Conditional logic lets you show a question based on an answer to
              another question. Configure a rule below each question.
            </p>

            <div className="mt-4 space-y-4">
              {editing.questions.map((question, index) => {
                const availableTriggers = editing.questions.filter(
                  (candidate, candidateIndex) =>
                    candidateIndex < index &&
                    (candidate.type === "yesno" ||
                      candidate.type === "choice" ||
                      candidate.type === "dropdown" ||
                      candidate.type === "rating")
                );

                const selectedTrigger = availableTriggers.find(
                  (candidate) =>
                    candidate.id === question.condition?.questionId
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

                      {question.condition && availableTriggers.length > 0 && (
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
                                    candidate.id === event.target.value
                                );
                                if (!trigger) return;

                                const options = getConditionOptions(trigger);
                                setQuestionCondition(index, {
                                  questionId: trigger.id,
                                  operator:
                                    question.condition?.operator ?? "equals",
                                  value: options[0] ?? "",
                                });
                              }}
                            >
                              {availableTriggers.map((trigger) => (
                                <option key={trigger.id} value={trigger.id}>
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
                              <option value="not_equals">Does not equal</option>
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
                        className="text-xs font-bold text-indigo-700 disabled:text-slate-300"
                        disabled={index === 0}
                        onClick={() => moveQuestion(index, -1)}
                      >
                        ↑ Move up
                      </button>
                      <button
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
                className="btn btn-light"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => void save()}>
                Save form
              </button>
            </div>
          </div>
        </div>
      )}
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
