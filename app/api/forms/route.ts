
import { NextResponse } from "next/server";
import { getForm, listForms, saveForm } from "@/lib/store";
import { getApiActor } from "@/lib/api-auth";
import type { FormRecord } from "@/lib/types";
import { validateQuestions } from "@/lib/question-validation";

export async function GET() {
  try {
    const actor = await getApiActor();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forms = await listForms(
      actor.kind === "user" ? actor.userId : undefined
    );

    return NextResponse.json(forms);
  } catch (error) {
    return NextResponse.json(
      { error: message(error) },
      { status: 500 }
    );
  }
}



export async function POST(request: Request) {
  try {
    const actor = await getApiActor();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as Partial<FormRecord>;


    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "A form title is required." },
        { status: 400 }
      );
    }

    const questions = body.questions === undefined ? [] : body.questions;

    if (!validateQuestions(questions)) {
      return NextResponse.json(
        { error: "One or more questions have an invalid configuration." },
        { status: 400 }
      );
    }

    if (actor.kind === "user" && body.id) {
      const existingForm = await getForm(body.id, actor.userId);

      if (!existingForm) {
        return NextResponse.json(
          { error: "Form not found." },
          { status: 404 }
        );
      }
    }

    const now = new Date().toISOString();

    const form: FormRecord = {
      id: body.id || crypto.randomUUID(),
      ownerId: actor.kind === "user" ? actor.userId : undefined,
      title: body.title.trim(),
      description: body.description?.trim() ?? "",
      published: Boolean(body.published),
      welcomeText: body.welcomeText?.trim() || "Hi! Let's get started.",
      completionText:
        body.completionText?.trim() || "Thanks for your response!",
      accentColor: /^#[0-9a-fA-F]{6}$/.test(body.accentColor ?? "")
        ? body.accentColor!
        : "#4f46e5",
      questions,
      createdAt: body.createdAt || now,
    };



    const savedForm = await saveForm(form);

    return NextResponse.json(savedForm, {
      status: body.id ? 200 : 201,
    });
  } catch (error) {
    return NextResponse.json(
      { error: message(error) },
      { status: 500 }
    );
  }
}


function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unexpected server error.";
}
