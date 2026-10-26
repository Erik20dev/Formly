
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiActor } from "@/lib/api-auth";
import { getForm, listSubmissions } from "@/lib/store";
import { getVisibleQuestions } from "@/lib/question-visibility";

export const runtime = "nodejs";

const BUCKET = "form-uploads";
const SIGNED_URL_SECONDS = 60;

export async function GET(request: Request) {
  const actor = await getApiActor();

  if (!actor) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const requestUrl = new URL(request.url);
    const path = requestUrl.searchParams.get("path");

    if (!path || path.length > 1024) {
      return NextResponse.json(
        { error: "A valid file path is required." },
        { status: 400 }
      );
    }

    const parts = path.split("/");

    if (
      parts.length !== 3 ||
      parts.some(
        (part) => !part || part === "." || part === ".."
      )
    ) {
      return NextResponse.json(
        { error: "Invalid file path." },
        { status: 400 }
      );
    }

    const [formId, questionId] = parts;

    const form = await getForm(
      formId,
      actor.kind === "user" ? actor.userId : undefined
    );

    if (
      !form ||
      !form.questions.some(
        (question) =>
          question.id === questionId &&
          String(question.type) === "file"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This file does not belong to a valid file-upload question.",
        },
        { status: 404 }
      );
    }

    const submissions = await listSubmissions(
      formId,
      actor.kind === "user" ? actor.userId : undefined
    );

    const belongsToSubmission = submissions.some((submission) => {
      const answer = submission.answers[questionId];

      if (answer !== path) {
        return false;
      }

      const visibleQuestions = getVisibleQuestions(
        form.questions,
        submission.answers
      );

      return visibleQuestions.some(
        (visibleQuestion) => visibleQuestion.id === questionId
      );
    });

    if (!belongsToSubmission) {
      return NextResponse.json(
        { error: "This file is not attached to a submission." },
        { status: 404 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "File storage is not configured." },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS, {
        download: true,
      });

    if (error || !data?.signedUrl) {
      console.error(
        "Could not create file link:",
        error?.message
      );

      return NextResponse.json(
        { error: "Could not create a download link for this file." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: data.signedUrl,
      expiresIn: SIGNED_URL_SECONDS,
    });
  } catch (error) {
    console.error("File access request failed:", error);

    return NextResponse.json(
      { error: "The file access request could not be processed." },
      { status: 500 }
    );
  }
}
