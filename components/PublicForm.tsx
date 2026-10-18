
"use client";

import { useState } from "react";
import Link from "next/link";
import type { FormRecord } from "@/lib/types";

export default function PublicForm({
  form,
  embedded = false,
}: {
  form: FormRecord;
  embedded?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const question = form.questions[step];

  function answer(value: string) {
    if (!question) return;
    setAnswers((old) => ({ ...old, [question.id]: value }));
    setError("");
  }

  async function next() {
    if (submitting) return;

    if (!question) return;

    const currentAnswer = answers[question.id]?.trim() ?? "";

    if (question.required && !currentAnswer) {
      setError("Please answer this question to continue.");
      return;
    }

    if (
      question.type === "email" &&
      currentAnswer &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentAnswer)
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    if (step < form.questions.length - 1) {
      setStep(step + 1);
      setError("");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          answers,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Could not submit your response.");
        return;
      }

      setDone(true);
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const mainClass = embedded
    ? "flex min-h-full items-start justify-center p-2"
    : "flex min-h-screen items-center justify-center p-4";

  const cardClass = embedded
    ? "panel w-full max-w-xl overflow-hidden"
    : "panel w-full max-w-xl overflow-hidden";

  return (
    <main
      className={mainClass}
      style={{
        background: embedded
          ? "#ffffff"
          : `linear-gradient(135deg, ${form.accentColor}14, #f8fafc 55%)`,
      }}
    >
      <section className={cardClass}>
        <div
          className="h-2"
          style={{ background: form.accentColor }}
        />

        <div className={embedded ? "p-4" : "p-6 sm:p-10"}>
          {!embedded && (
            <Link
              href="/"
              className="text-sm font-bold text-slate-500"
            >
              ← Formly
            </Link>
          )}

          <h1
            className={`${embedded ? "mt-2 text-2xl" : "mt-5 text-3xl"} font-black`}
          >
            {form.title}
          </h1>

          {form.description && (
            <p className="mt-3 leading-7 text-slate-600">
              {form.description}
            </p>
          )}

          {done ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
              <div className="text-3xl">✓</div>

              <h2 className="mt-3 text-xl font-bold">
                Response submitted
              </h2>

              <p className="mt-2 text-slate-700">
                {form.completionText}
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>
                  {step < 0
                    ? "WELCOME"
                    : `QUESTION ${step + 1} OF ${form.questions.length}`}
                </span>

                <span>
                  {step < 0
                    ? 0
                    : Math.round(
                        ((step + 1) /
                          Math.max(form.questions.length, 1)) *
                          100
                      )}
                  %
                </span>
              </div>

              {step < 0 ? (
                <>
                  <h2 className="text-xl font-bold">
                    {form.welcomeText}
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    This should only take a minute.
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary mt-6"
                    style={{ background: form.accentColor }}
                    onClick={() => {
                      setStep(0);
                      setError("");
                    }}
                  >
                    Start →
                  </button>
                </>
              ) : question ? (
                <>
                  <label className="block text-lg font-bold">
                    {question.label}
                    {question.required && (
                      <span className="text-rose-500"> *</span>
                    )}
                  </label>

                  {question.type === "choice" ? (
                    <div className="mt-4 grid gap-2">
                      {(question.options?.length
                        ? question.options
                        : ["Option 1", "Option 2"]
                      ).map((option) => (
                        <button
                          type="button"
                          key={option}
                          className={`rounded-xl border bg-white p-3 text-left text-sm font-semibold ${
                            answers[question.id] === option
                              ? "border-indigo-400 ring-2 ring-indigo-100"
                              : ""
                          }`}
                          onClick={() => answer(option)}
                        >
                          {answers[question.id] === option
                            ? "◉"
                            : "○"}{" "}
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : question.type === "yesno" ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {["Yes", "No"].map((option) => (
                        <button
                          type="button"
                          key={option}
                          className={`rounded-xl border bg-white p-4 font-bold ${
                            answers[question.id] === option
                              ? "border-indigo-400 ring-2 ring-indigo-100"
                              : ""
                          }`}
                          onClick={() => answer(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      autoFocus={!embedded}
                      className="field mt-4 bg-white"
                      type={
                        question.type === "email" ? "email" : "text"
                      }
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
                      disabled={step === 0 || submitting}
                      onClick={() => {
                        setStep(step - 1);
                        setError("");
                      }}
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
                        : step === form.questions.length - 1
                          ? "Submit response"
                          : "Continue →"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  This form has no questions yet.
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-3 text-sm font-semibold text-rose-600"
                >
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
