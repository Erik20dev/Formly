import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { FormRecord, Question, Submission } from "./types";

let supabase: SupabaseClient | null = null;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  if (!supabase) {
    supabase = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  return supabase;
}

// Supabase is used when configured. Local in-memory storage keeps the demo usable
// during development, but resets whenever the server restarts.
const memory = globalThis as typeof globalThis & {
  demoForms?: FormRecord[];
  demoSubmissions?: Submission[];
};

memory.demoForms ??= [];
memory.demoSubmissions ??= [];

export async function listForms(): Promise<FormRecord[]> {
  const client = db();

  if (client) {
    const { data, error } = await client
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map(rowToForm);
  }

  return memory.demoForms!;
}

export async function getForm(id: string): Promise<FormRecord | null> {
  const client = db();

  if (client) {
    const { data, error } = await client
      .from("forms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return data ? rowToForm(data) : null;
  }

  return memory.demoForms!.find((form) => form.id === id) ?? null;
}

export async function saveForm(form: FormRecord): Promise<FormRecord> {
  const client = db();

  if (client) {
    const row = formToRow(form);

    const { data, error } = await client
      .from("forms")
      .upsert(row)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return rowToForm(data);
  }

  const index = memory.demoForms!.findIndex(
    (item) => item.id === form.id
  );

  if (index >= 0) {
    memory.demoForms![index] = form;
  } else {
    memory.demoForms!.unshift(form);
  }

  return form;
}

export async function removeForm(id: string) {
  const client = db();

  if (client) {
    const { error } = await client.from("forms").delete().eq("id", id);

    if (error) throw new Error(error.message);

    return;
  }

  memory.demoForms = memory.demoForms!.filter(
    (form) => form.id !== id
  );

  memory.demoSubmissions = memory.demoSubmissions!.filter(
    (item) => item.formId !== id
  );
}

export async function listSubmissions(
  formId?: string
): Promise<Submission[]> {
  const client = db();

  if (client) {
    let query = client
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (formId) {
      query = query.eq("form_id", formId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data ?? []).map(rowToSubmission);
  }

  return memory.demoSubmissions!.filter(
    (item) => !formId || item.formId === formId
  );
}

export async function saveSubmission(submission: Submission) {
  const client = db();

  if (client) {
    const { error } = await client.from("submissions").insert({
      id: submission.id,
      form_id: submission.formId,
      answers: submission.answers,
      submitted_at: submission.submittedAt,
    });

    if (error) throw new Error(error.message);

    return;
  }

  memory.demoSubmissions!.unshift(submission);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is Question => {
    if (typeof item !== "object" || item === null) return false;

    const q = item as Record<string, unknown>;

    return (
      typeof q.id === "string" &&
      typeof q.label === "string" &&
     [
  "text",
  "email",
  "choice",
  "yesno",
  "dropdown",
  "rating",
  "date",
  "file",
].includes(String(q.type)) &&
      typeof q.required === "boolean" &&
      (q.options === undefined ||
        (Array.isArray(q.options) &&
          q.options.every((option) => typeof option === "string")))
    );
  });
}

function asAnswers(value: unknown): Record<string, string> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, answer] of Object.entries(value)) {
    if (typeof answer === "string") {
      result[key] = answer;
    }
  }

  return result;
}

function rowToForm(row: Record<string, unknown>): FormRecord {
  return {
    id: asString(row.id),
    title: asString(row.title),
    description: asString(row.description),
    published: row.published === true,
    welcomeText: asString(
      row.welcome_text,
      "Hi! Let's get started."
    ),
    completionText: asString(
      row.completion_text,
      "Thanks for your response!"
    ),
    accentColor: asString(row.accent_color, "#4f46e5"),
    questions: asQuestions(row.questions),
    createdAt: asString(row.created_at),
  };
}

function formToRow(form: FormRecord) {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    published: form.published,
    welcome_text: form.welcomeText,
    completion_text: form.completionText,
    accent_color: form.accentColor,
    questions: form.questions,
    created_at: form.createdAt,
  };
}

function rowToSubmission(
  row: Record<string, unknown>
): Submission {
  return {
    id: asString(row.id),
    formId: asString(row.form_id),
    answers: asAnswers(row.answers),
    submittedAt: asString(row.submitted_at),
  };
}
