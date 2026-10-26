import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { validateWebhookUrl } from "../../../lib/webhook-security";
import { getVisibleQuestions } from "@/lib/question-visibility";
async function notifyNewSubmission(
  formId: string,
  submissionId: string,
  formTitle: string,
  answers: Record<string, string>
) {
  const destination = process.env.FORM_NOTIFICATION_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!destination || !apiKey || !from || !supabaseUrl || !serviceKey) {
    console.error("Email notification settings are incomplete.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let deliveryId: string | undefined;

  try {
    const { data, error } = await supabase
      .from("integration_deliveries")
      .insert({
        form_id: formId,
        submission_id: submissionId,
        integration_type: "email",
        destination,
        status: "pending",
        attempts: 0,
      })
      .select("id")
      .single();

    if (error) throw error;
    deliveryId = data.id;

    const resend = new Resend(apiKey);
    const emailText = Object.entries(answers)
      .map(([questionId, answer]) => `${questionId}: ${answer}`)
      .join("\n");

    const { error: emailError } = await resend.emails.send({
      from,
      to: [destination],
      subject: `New response: ${formTitle}`,
      text: `A new form submission was received.\n\nForm: ${formTitle}\nSubmission ID: ${submissionId}\n\nAnswers:\n${emailText}`,
    });

    if (emailError) throw new Error(emailError.message);

    const { error: updateError } = await supabase
      .from("integration_deliveries")
      .update({
        status: "success",
        attempts: 1,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);

    if (updateError) {
      console.error("Email sent, but delivery status update failed:", updateError);
    }
  } catch (error) {
    console.error("Email notification failed:", error);

    if (deliveryId) {
      const { error: logError } = await supabase
        .from("integration_deliveries")
        .update({
          status: "failed",
          attempts: 1,
          last_error:
            error instanceof Error ? error.message : "Unknown delivery error",
        })
        .eq("id", deliveryId);

      if (logError) console.error("Could not update delivery log:", logError);
    }
  }
}

async function recordWebhookDelivery(
  formId: string,
  submissionId: string,
  destination: string,
  answers: Record<string, string>
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Webhook delivery: Supabase settings are missing.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let deliveryId: string | undefined;

  try {
    const url = validateWebhookUrl(destination);

    const { data, error } = await supabase
      .from("integration_deliveries")
      .insert({
        form_id: formId,
        submission_id: submissionId,
        integration_type: "webhook",
        destination,
        status: "pending",
        attempts: 0,
      })
      .select("id")
      .single();

    if (error) throw error;
    deliveryId = data.id;

        const response = await fetch(url.toString(), {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "form.submission.created",
        formId,
        submissionId,
        answers,
      }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Webhook returned HTTP ${response.status}`);
    }

    const { error: updateError } = await supabase
      .from("integration_deliveries")
      .update({
        status: "success",
        attempts: 1,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);

    if (updateError) {
      console.error("Webhook sent, but logging its status failed:", updateError);
    }
  } catch (error) {
    console.error("Webhook delivery failed:", error);

    if (deliveryId) {
      const { error: logError } = await supabase
        .from("integration_deliveries")
        .update({
          status: "failed",
          attempts: 1,
          last_error:
            error instanceof Error ? error.message : "Unknown webhook error",
        })
        .eq("id", deliveryId);

      if (logError) {
        console.error("Could not update webhook delivery log:", logError);
      }
    }
  }
}

import { NextResponse } from "next/server";
import {
  getForm,
  listSubmissions,
  saveSubmission,
} from "@/lib/store";
import { getApiActor } from "@/lib/api-auth";
import type { Submission } from "@/lib/types";
import { checkPublicRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const actor = await getApiActor();

  if (!actor) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const formId = url.searchParams.get("formId") || undefined;

    const submissions = await listSubmissions(
      formId,
      actor.kind === "user" ? actor.userId : undefined
    );

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Submission processing failed:", error);

    return NextResponse.json(
      { error: "Unable to process your submission. Please try again." },
      { status: 500 }
    );
  }
}



export async function POST(request: Request) {
  try {
  const forwardedFor = request.headers.get("x-forwarded-for");
    const ip =
      request.headers.get("x-real-ip")?.trim() ||
      forwardedFor?.split(",")[0]?.trim() ||
      (process.env.NODE_ENV === "development" ? "127.0.0.1" : "");


    if (!ip) {
      return NextResponse.json(
        { error: "Unable to verify your request. Please try again." },
        { status: 400 }
      );
    }

    let rateLimit: Awaited<ReturnType<typeof checkPublicRateLimit>>;

    try {
      rateLimit = await checkPublicRateLimit(`submission:${ip}`);
    } catch (error) {
      console.error("Submission rate limiter unavailable:", error);

      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait a minute and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

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

    // Verify that each file answer refers to an uploaded object
    // belonging to this exact form and question.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    for (const question of visibleQuestions) {
      if (question.type !== "file") continue;

      const answer = (answers[question.id] ?? "").trim();
      if (!answer) continue;

      const parts = answer.split("/");
      if (
        parts.length !== 3 ||
        parts[0] !== form.id ||
        parts[1] !== question.id ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.+$/i.test(parts[2])
      ) {
        return NextResponse.json(
          { error: `The uploaded file for "${question.label}" is invalid.` },
          { status: 400 }
        );
      }

      if (!supabaseUrl || !serviceKey) {
        return NextResponse.json(
          { error: "File verification is temporarily unavailable." },
          { status: 503 }
        );
      }

      const storageClient = createClient(supabaseUrl, serviceKey);
      const { data, error } = await storageClient.storage
        .from("form-uploads")
        .list(`${form.id}/${question.id}`, {
          search: parts[2],
          limit: 100,
        });

      if (error || !data?.some((file) => file.name === parts[2])) {
        return NextResponse.json(
          { error: `The uploaded file for "${question.label}" could not be verified.` },
          { status: 400 }
        );
      }
    }

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
    const webhookUrl = process.env.FORM_WEBHOOK_URL;

if (webhookUrl) {
  await recordWebhookDelivery(
    form.id,
    submission.id,
    webhookUrl,
    visibleAnswers
  );
}
await notifyNewSubmission(
  form.id,
  submission.id,
  form.title,
  visibleAnswers
);
    return NextResponse.json(
      { ok: true, submissionId: submission.id },
      { status: 201 }
    );
    } catch (error) {
    console.error("Submission processing failed:", error);

    return NextResponse.json(
      { error: "Unable to process your submission. Please try again." },
      { status: 500 }
    );
  }
}
