
import { NextResponse } from "next/server";
import {
  getForm,
  listSubmissions,
  saveSubmission,
} from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";
import type { Submission } from "@/lib/types";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body.formId !== "string" ||
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

    const answers = body.answers as Record<string, string>;

    for (const question of form.questions) {
      const rawAnswer = answers[question.id];

      if (rawAnswer !== undefined && typeof rawAnswer !== "string") {
        return NextResponse.json(
          { error: "Answers must be text." },
          { status: 400 }
        );
      }

      const answer = (rawAnswer ?? "").trim();

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
          { error: `Enter a valid email for "${question.label}".` },
          { status: 400 }
        );
      }
    }

    const submission: Submission = {
      id: crypto.randomUUID(),
      formId: form.id,
      answers,
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

