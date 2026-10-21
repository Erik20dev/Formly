
import { NextResponse } from "next/server";
import {
  getForm,
  listSubmissions,
  saveSubmission,
} from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";
import type { Question, Submission } from "@/lib/types";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);

    return NextResponse.json(
      await listSubmissions(
        url.searchParams.get("formId") || undefined
      )
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server error.",
      },
      { status: 500 }
    );
  }
}

function getVisibleQuestions(
  questions: Question[],
  answers: Record<string, string>
): Question[] {
  const visibleQuestions: Question[] = [];
  const visibleIds = new Set<string>();

  for (const question of questions) {
    const condition = question.condition;

    if (condition) {
      // Conditions may only depend on an earlier, visible question.
      if (!visibleIds.has(condition.questionId)) {
        continue;
      }

      const triggerAnswer = answers[condition.questionId] ?? "";

      const matches =
        condition.operator === "equals"
          ? triggerAnswer === condition.value
          : triggerAnswer !== condition.value;

      if (!matches) {
        continue;
      }
    }

    visibleQuestions.push(question);
    visibleIds.add(question.id);
  }

  return visibleQuestions;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body.formId !== "string" ||
      !body.formId.trim() ||
      typeof body.answers !== "object" ||
      body.answers === null ||
      Array.isArray(body.answers)
    ) {
      return NextResponse.json(
        { error: "Valid form ID and answers are required." },
        { status: 400 }
      );
    }

    const form = await getForm(body.formId);

    if (!form || !form.published) {
      return NextResponse.json(
        { error: "This form is not available." },
        { status: 404 }
      );
    }

    const submittedAnswers: unknown = body.answers;
    const answerEntries = Object.entries(
      submittedAnswers as Record<string, unknown>
    );

    // Every submitted answer must belong to a real question
    // and must be a string.
    const questionIds = new Set(
      form.questions.map((question) => question.id)
    );

    const answers: Record<string, string> = {};

    for (const [questionId, value] of answerEntries) {
      if (!questionIds.has(questionId)) {
        return NextResponse.json(
          { error: "The submission contains an unknown question." },
          { status: 400 }
        );
      }

      if (typeof value !== "string") {
        return NextResponse.json(
          { error: "Answers must be text." },
          { status: 400 }
        );
      }

      answers[questionId] = value;
    }

    // Calculate visibility on the server instead of trusting
    // the questions shown in the browser.
    const visibleQuestions = getVisibleQuestions(
      form.questions,
      answers
    );

    const visibleIds = new Set(
      visibleQuestions.map((question) => question.id)
    );

    // Reject answers to questions that should be hidden.
    for (const questionId of Object.keys(answers)) {
      if (!visibleIds.has(questionId)) {
        return NextResponse.json(
          {
            error:
              "The submission contains an answer to a hidden question. Please refresh and try again.",
          },
          { status: 400 }
        );
      }
    }

    // Validate required fields and supported answer formats.
    for (const question of visibleQuestions) {
      const answer = (answers[question.id] ?? "").trim();

      if (question.required && !answer) {
        return NextResponse.json(
          { error: `"${question.label}" is required.` },
          { status: 400 }
        );
      }

      if (
        question.type === "email" &&
        answer &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)
      ) {
        return NextResponse.json(
          {
            error: `Enter a valid email for "${question.label}".`,
          },
          { status: 400 }
        );
      }

      if (
        answer &&
        (question.type === "choice" ||
          question.type === "dropdown")
      ) {
        if (
          !question.options ||
          !question.options.includes(answer)
        ) {
          return NextResponse.json(
            {
              error: `Select a valid option for "${question.label}".`,
            },
            { status: 400 }
          );
        }
      }

      if (
        answer &&
        question.type === "yesno" &&
        answer !== "Yes" &&
        answer !== "No"
      ) {
        return NextResponse.json(
          {
            error: `Select a valid answer for "${question.label}".`,
          },
          { status: 400 }
        );
      }

      if (
        answer &&
        question.type === "rating" &&
        !/^[1-5]$/.test(answer)
      ) {
        return NextResponse.json(
          {
            error: `Select a valid rating for "${question.label}".`,
          },
          { status: 400 }
        );
      }
    }

    // Store only answers to questions visible under the
    // server-calculated conditional rules.
    const visibleAnswers: Record<string, string> = {};

    for (const question of visibleQuestions) {
      if (answers[question.id] !== undefined) {
        visibleAnswers[question.id] = answers[question.id];
      }
    }

    const submission: Submission = {
      id: crypto.randomUUID(),
      formId: form.id,
      answers: visibleAnswers,
      submittedAt: new Date().toISOString(),
    };

    await saveSubmission(submission);

    return NextResponse.json(
      { ok: true, submissionId: submission.id },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server error.",
      },
      { status: 500 }
    );
  }
}
