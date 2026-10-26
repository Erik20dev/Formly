"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FormRecord, Question } from "@/lib/types";
function getAnalyticsSessionId() {
  const key = "formly-analytics-session";

  try {
    let sessionId = sessionStorage.getItem(key);

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(key, sessionId);
    }

    return sessionId;
  } catch {
    return crypto.randomUUID();
  }
}
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export default function PublicForm({
  form,
  embedded = false,
}: {
  form: FormRecord;
  embedded?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
useEffect(() => {
  const sessionId = getAnalyticsSessionId();

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      formId: form.id,
      eventType: "view",
      sessionId,
    }),
  }).catch(() => {});
}, [form.id]);
  const visibleQuestions = useMemo(() => {
    const visible: Question[] = [];
    const visibleIds = new Set<string>();

    for (const currentQuestion of form.questions) {
      const condition = currentQuestion.condition;

      if (condition) {
        // Conditional questions can only depend on an earlier visible question.
        if (!visibleIds.has(condition.questionId)) continue;

        const triggerAnswer = answers[condition.questionId] ?? "";
        const matches = triggerAnswer === condition.value;

        if (
          (condition.operator === "equals" && !matches) ||
          (condition.operator === "not_equals" && matches)
        ) {
          continue;
        }
      }

      visible.push(currentQuestion);
      visibleIds.add(currentQuestion.id);
    }

    return visible;
  }, [form.questions, answers]);

  const question = visibleQuestions[step];

  useEffect(() => {
    if (step >= visibleQuestions.length && visibleQuestions.length > 0) {
      setStep(visibleQuestions.length - 1);
    }
  }, [step, visibleQuestions.length]);

  function answer(value: string) {
    if (!question) return;
    setAnswers((old) => ({ ...old, [question.id]: value }));
    setError("");
  }

  function validateQuestion(currentQuestion: Question): string | null {
    const currentAnswer = (answers[currentQuestion.id] ?? "").trim();

    if (currentQuestion.required && !currentAnswer) {
      return "Please answer this question to continue.";
    }

    if (
      currentQuestion.type === "email" &&
      currentAnswer &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentAnswer)
    ) {
      return "Please enter a valid email address.";
    }

    if (
      currentQuestion.type === "rating" &&
      currentAnswer &&
      !["1", "2", "3", "4", "5"].includes(currentAnswer)
    ) {
      return "Please select a rating from 1 to 5.";
    }

    if (
      (currentQuestion.type === "choice" ||
        currentQuestion.type === "dropdown") &&
      currentAnswer &&
      !(currentQuestion.options ?? ["Option 1", "Option 2"]).includes(
        currentAnswer
      )
    ) {
      return "Please select one of the available options.";
    }

    if (
      currentQuestion.type === "yesno" &&
      currentAnswer &&
      !["Yes", "No"].includes(currentAnswer)
    ) {
      return "Please select Yes or No.";
    }

    if (currentQuestion.type === "file") {
      const file = selectedFiles[currentQuestion.id];
      if (currentQuestion.required && !file) {
        return "Please choose a file to continue.";
      }
      if (file && file.size > MAX_FILE_SIZE) {
        return "The file must be 5 MB or smaller.";
      }
      if (file && !ALLOWED_FILE_TYPES.has(file.type)) {
        return "Choose a JPG, PNG, WebP, PDF, DOC, or DOCX file.";
      }
    }

    return null;
  }

  async function next() {
    if (submitting || !question) return;

    const validationError = validateQuestion(question);
    if (validationError) {
      setError(validationError);
      return;
    }

    const currentVisibleIds = new Set(visibleQuestions.map((item) => item.id));
    const currentIndex = visibleQuestions.findIndex(
      (item) => item.id === question.id
    );
    const nextQuestion = visibleQuestions
      .slice(currentIndex + 1)
      .find((item) => currentVisibleIds.has(item.id));

    if (nextQuestion) {
      const nextIndex = visibleQuestions.findIndex(
        (item) => item.id === nextQuestion.id
      );
      setStep(nextIndex);
      setError("");
      return;
    }

    for (const visibleQuestion of visibleQuestions) {
      const questionError = validateQuestion(visibleQuestion);
      if (questionError) {
        const invalidIndex = visibleQuestions.findIndex(
          (item) => item.id === visibleQuestion.id
        );
        setStep(invalidIndex);
        setError(questionError);
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      // Upload selected files first and store their private Storage paths as answers.
      const visibleAnswers: Record<string, string> = {};

      for (const visibleQuestion of visibleQuestions) {
        const value = answers[visibleQuestion.id];

        if (visibleQuestion.type === "file") {
          const file = selectedFiles[visibleQuestion.id];
          if (!file) continue;

          const uploadData = new FormData();
          uploadData.append("file", file);
          uploadData.append("formId", form.id);
          uploadData.append("questionId", visibleQuestion.id);
uploadData.append("answers", JSON.stringify(answers));
          const uploadResponse = await fetch("/api/uploads", {
            method: "POST",
            body: uploadData,
          });
          const uploadResult = await uploadResponse.json();

          if (!uploadResponse.ok) {
            setError(uploadResult.error || `Could not upload ${file.name}.`);
            return;
          }

          if (typeof uploadResult.path !== "string") {
            setError(`The upload response for ${file.name} was invalid.`);
            return;
          }

          visibleAnswers[visibleQuestion.id] = uploadResult.path;
        } else if (value !== undefined && value !== "") {
          visibleAnswers[visibleQuestion.id] = value;
        }
      }

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: form.id, answers: visibleAnswers }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Could not submit your response.");
        return;
      }
const sessionId = getAnalyticsSessionId();

void fetch("/api/analytics", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    formId: form.id,
    eventType: "completion",
    sessionId,
  }),
}).catch(() => {});
      setDone(true);
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function back() {
    if (step <= 0 || submitting) return;
    setStep(step - 1);
    setError("");
  }

  const mainClass = embedded
    ? "flex min-h-full items-start justify-center p-2"
    : "flex min-h-screen items-center justify-center p-4";

  const progress =
    step < 0 || visibleQuestions.length === 0
      ? 0
      : Math.round(((step + 1) / visibleQuestions.length) * 100);

  return (
    <main
      className={mainClass}
      style={{
        background: embedded
          ? "#ffffff"
          : `linear-gradient(135deg, ${form.accentColor}14, #f8fafc 55%)`,
      }}
    >
      <section className="panel w-full max-w-xl overflow-hidden">
        <div className="h-2" style={{ background: form.accentColor }} />

        <div className={embedded ? "p-4" : "p-6 sm:p-10"}>
          {!embedded && (
            <Link href="/" className="text-sm font-bold text-slate-500">
              ← Formly
            </Link>
          )}

          <h1
            className={`${embedded ? "mt-2 text-2xl" : "mt-5 text-3xl"} font-black`}
          >
            {form.title}
          </h1>

          {form.description && (
            <p className="mt-3 leading-7 text-slate-600">{form.description}</p>
          )}

          {done ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
              <div className="text-3xl">✓</div>
              <h2 className="mt-3 text-xl font-bold">Response submitted</h2>
              <p className="mt-2 text-slate-700">{form.completionText}</p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>
                  {step < 0
                    ? "WELCOME"
                    : `QUESTION ${step + 1} OF ${visibleQuestions.length}`}
                </span>
                <span>{progress}%</span>
              </div>

              {step < 0 ? (
                <>
                  <h2 className="text-xl font-bold">{form.welcomeText}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    This should only take a minute.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary mt-6"
                    style={{ background: form.accentColor }}
                    onClick={() => {
  const sessionId = getAnalyticsSessionId();

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      formId: form.id,
      eventType: "start",
      sessionId,
    }),
  }).catch(() => {});

  setStep(0);
  setError("");
}}
                  >
                    Start →
                  </button>
                </>
              ) : question ? (
                <>
                  <label
                    htmlFor={`question-${question.id}`}
                    className="block text-lg font-bold"
                  >
                    {question.label}
                    {question.required && <span className="text-rose-500"> *</span>}
                  </label>

                  {question.type === "dropdown" ? (
                    <select
                      id={`question-${question.id}`}
                      className="field mt-4 bg-white"
                      value={answers[question.id] ?? ""}
                      onChange={(event) => answer(event.target.value)}
                    >
                      <option value="">Select an option…</option>
                      {(question.options?.length
                        ? question.options
                        : ["Option 1", "Option 2"]
                      ).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : question.type === "rating" ? (
                    <div className="mt-4 flex gap-2" role="group" aria-label="Choose a rating from 1 to 5">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          type="button"
                          key={rating}
                          aria-pressed={answers[question.id] === String(rating)}
                          className={`rounded-xl border bg-white px-4 py-3 font-bold ${
                            answers[question.id] === String(rating)
                              ? "border-indigo-400 ring-2 ring-indigo-100"
                              : ""
                          }`}
                          onClick={() => answer(String(rating))}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  ) : question.type === "choice" ? (
                    <div className="mt-4 grid gap-2">
                      {(question.options?.length
                        ? question.options
                        : ["Option 1", "Option 2"]
                      ).map((option) => (
                        <button
                          type="button"
                          key={option}
                          aria-pressed={answers[question.id] === option}
                          className={`rounded-xl border bg-white p-3 text-left text-sm font-semibold ${
                            answers[question.id] === option
                              ? "border-indigo-400 ring-2 ring-indigo-100"
                              : ""
                          }`}
                          onClick={() => answer(option)}
                        >
                          {answers[question.id] === option ? "◉" : "○"} {option}
                        </button>
                      ))}
                    </div>
                  ) : question.type === "yesno" ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {["Yes", "No"].map((option) => (
                        <button
                          type="button"
                          key={option}
                          aria-pressed={answers[question.id] === option}
                          className={`rounded-xl border p-4 font-bold ${
  answers[question.id] === option
    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
    : "border-gray-200 bg-white"
}`}
                          onClick={() => answer(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : question.type === "date" ? (
                    <input
                      id={`question-${question.id}`}
                      className="field mt-4 bg-white"
                      type="date"
                      value={answers[question.id] ?? ""}
                      onChange={(event) => answer(event.target.value)}
                    />
                  ) : question.type === "file" ? (
                    <div className="mt-4">
                      <input
                        id={`question-${question.id}`}
                        className="field bg-white"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
                        disabled={submitting}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          setSelectedFiles((old) => {
                            if (!file) {
                              const updated = { ...old };
                              delete updated[question.id];
                              return updated;
                            }
                            return { ...old, [question.id]: file };
                          });
                          answer(file?.name ?? "");
                        }}
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Choose a JPG, PNG, WebP, PDF, or Word document (maximum 5 MB). Your file will upload when you submit the form.
                      </p>
                      {selectedFiles[question.id] && (
                        <p className="mt-2 text-sm text-slate-600">
                          Selected: {selectedFiles[question.id].name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <input
                      id={`question-${question.id}`}
                      autoFocus={!embedded}
                      className="field mt-4 bg-white"
                      type={question.type === "email" ? "email" : "text"}
                      value={answers[question.id] ?? ""}
                      onChange={(event) => answer(event.target.value)}
                      placeholder={
                        question.type === "email"
                          ? "name@example.com"
                          : "Type your answer…"
                      }
                    />
                  )}

                  <div className="mt-5 flex justify-between gap-3">
                    <button
                      type="button"
                      className="btn btn-light"
                      disabled={step <= 0 || submitting}
                      onClick={back}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ background: form.accentColor }}
                      disabled={submitting}
                      onClick={() => void next()}
                    >
                      {submitting
                        ? "Submitting…"
                        : step === visibleQuestions.length - 1
                          ? "Submit response"
                          : "Continue →"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    {visibleQuestions.length === 0
                      ? "This form has no questions to answer."
                      : "There are no more questions to display."}
                  </p>
                  {visibleQuestions.length === 0 && (
                    <button
                      type="button"
                      className="btn btn-primary mt-5"
                      style={{ background: form.accentColor }}
                      onClick={() => void next()}
                    >
                      Submit response
                    </button>
                  )}
                </>
              )}

              {error && (
                <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
