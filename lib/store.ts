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


export async function listForms(ownerId?: string): Promise<FormRecord[]> {
  const client = db();

  if (client) {
    let query = client
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });

    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data ?? []).map(rowToForm);
  }

  const forms = memory.demoForms!;

  if (ownerId) {
    return forms.filter((form) => form.ownerId === ownerId);
  }

  return forms;
}



export async function getForm(
  id: string,
  ownerId?: string
): Promise<FormRecord | null> {
  const client = db();

  if (client) {
    let query = client
      .from("forms")
      .select("*")
      .eq("id", id);

    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw new Error(error.message);

    return data ? rowToForm(data) : null;
  }

  const form = memory.demoForms!.find((item) => item.id === id);

  if (!form) return null;

  if (ownerId && form.ownerId !== ownerId) {
    return null;
  }

  return form;
}



export async function saveForm(form: FormRecord): Promise<FormRecord> {
  const client = db();

  if (client) {
    let ownerId = form.ownerId;

    // Preserve the existing owner when no owner is supplied.
    if (ownerId === undefined) {
      const { data: existing, error: lookupError } = await client
        .from("forms")
        .select("owner_id")
        .eq("id", form.id)
        .maybeSingle();

      if (lookupError) throw new Error(lookupError.message);

      ownerId =
        typeof existing?.owner_id === "string"
          ? existing.owner_id
          : null;
    }

    const row = formToRow({ ...form, ownerId });

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

  const formToSave =
    form.ownerId === undefined && index >= 0
      ? { ...form, ownerId: memory.demoForms![index].ownerId ?? null }
      : form;

  if (index >= 0) {
    memory.demoForms![index] = formToSave;
  } else {
    memory.demoForms!.unshift(formToSave);
  }

  return formToSave;
}


export async function removeForm(id: string, ownerId?: string) {
  const client = db();

  if (client) {
    let query = client.from("forms").delete().eq("id", id);

    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { error } = await query;

    if (error) throw new Error(error.message);

    return;
  }

  const form = memory.demoForms!.find((item) => item.id === id);

  if (!form) return;

  if (ownerId && form.ownerId !== ownerId) {
    return;
  }

  memory.demoForms = memory.demoForms!.filter(
    (item) => item.id !== id
  );

  memory.demoSubmissions = memory.demoSubmissions!.filter(
    (item) => item.formId !== id
  );
}



export async function listSubmissions(
  formId?: string,
  ownerId?: string
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

    if (ownerId) {
      const { data: forms, error: formsError } = await client
        .from("forms")
        .select("id")
        .eq("owner_id", ownerId);

      if (formsError) throw new Error(formsError.message);

      const ownedFormIds = (forms ?? []).map((form) => form.id);

      if (formId && !ownedFormIds.includes(formId)) {
        return [];
      }

      if (ownedFormIds.length === 0) {
        return [];
      }

      query = query.in("form_id", ownedFormIds);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data ?? []).map(rowToSubmission);
  }

  const ownedFormIds = ownerId
    ? memory.demoForms!
        .filter((form) => form.ownerId === ownerId)
        .map((form) => form.id)
    : null;

  return memory.demoSubmissions!.filter(
    (item) =>
      (!formId || item.formId === formId) &&
      (!ownedFormIds || ownedFormIds.includes(item.formId))
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
    ownerId:
      typeof row.owner_id === "string" ? row.owner_id : null,
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
    owner_id: form.ownerId ?? null,
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
