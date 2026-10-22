import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getForm } from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body.formId !== "string" ||
      !body.formId.trim() ||
      !["view", "start", "completion"].includes(body.eventType) ||
      typeof body.sessionId !== "string" ||
      !body.sessionId.trim()
    ) {
      return NextResponse.json(
        { error: "Invalid analytics event." },
        { status: 400 },
      );
    }

    const form = await getForm(body.formId);

    if (!form || !form.published) {
      return NextResponse.json(
        { error: "Form not available." },
        { status: 404 },
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Analytics storage is not configured." },
        { status: 503 },
      );
    }

    const supabase = createClient(url, key);
    const { error } = await supabase
      .from("form_analytics_events")
      .insert({
        form_id: form.id,
        event_type: body.eventType,
        session_id: body.sessionId.trim(),
      });

    if (error) {
      console.error("Analytics event storage failed:", error.message);
      return NextResponse.json(
        { error: "Could not record analytics event." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Analytics event failed:", error);
    return NextResponse.json(
      { error: "Could not record analytics event." },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Analytics storage is not configured." },
      { status: 503 },
    );
  }

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("form_analytics_events")
      .select("form_id, event_type, session_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Analytics retrieval failed:", error.message);
      return NextResponse.json(
        { error: "Could not load analytics." },
        { status: 500 },
      );
    }

    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    console.error("Analytics retrieval failed:", error);
    return NextResponse.json(
      { error: "Could not load analytics." },
      { status: 500 },
    );
  }
}