import { NextResponse } from "next/server";
import { listForms, saveForm } from "@/lib/store";
import type { FormRecord } from "@/lib/types";

export async function GET() {
  try { return NextResponse.json(await listForms()); }
  catch (error) { return NextResponse.json({ error: message(error) }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<FormRecord>;
    if (!body.title?.trim()) return NextResponse.json({ error: "Form title is required." }, { status: 400 });
    const now = new Date().toISOString();
    const form: FormRecord = {
      id: body.id || crypto.randomUUID(), title: body.title.trim(),
      description: body.description?.trim() ?? "", published: Boolean(body.published),
      welcomeText: body.welcomeText?.trim() || "Hi! Let's get started.",
      completionText: body.completionText?.trim() || "Thanks for your response!",
      accentColor: /^#[0-9a-fA-F]{6}$/.test(body.accentColor ?? "") ? body.accentColor! : "#4f46e5",
      questions: Array.isArray(body.questions) ? body.questions : [], createdAt: body.createdAt || now
    };
    if (form.questions.some(q => !q.label?.trim())) return NextResponse.json({ error: "Every question needs a label." }, { status: 400 });
    return NextResponse.json(await saveForm(form), { status: 201 });
  } catch (error) { return NextResponse.json({ error: message(error) }, { status: 500 }); }
}
function message(error: unknown) { return error instanceof Error ? error.message : "Unexpected server error."; }
