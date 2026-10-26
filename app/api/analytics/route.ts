import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getForm } from "@/lib/store";
import { getApiActor } from "@/lib/api-auth";
import { checkPublicRateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-real-ip")?.trim();

    if (!ip) {
      return NextResponse.json(
        { error: "Unable to verify your request. Please try again." },
        { status: 400 },
      );
    }

    let rateLimit: Awaited<ReturnType<typeof checkPublicRateLimit>>;

    try {
      rateLimit = await checkPublicRateLimit(`analytics:${ip}`);
    } catch (error) {
      console.error("Analytics rate limiter unavailable:", error);

      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many analytics events. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        },
      );
    }

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
  const actor = await getApiActor();

if (!actor) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
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
    let query = supabase
  .from("form_analytics_events")
  .select("form_id, event_type, session_id, created_at")
  .order("created_at", { ascending: false });

if (actor.kind === "user") {
  const { data: ownedForms, error: formsError } = await supabase
    .from("forms")
    .select("id")
    .eq("owner_id", actor.userId);

  if (formsError) {
    return NextResponse.json(
      { error: "Unable to load analytics." },
      { status: 500 }
    );
  }

  const ownedFormIds = (ownedForms ?? []).map((form) => form.id);

  if (ownedFormIds.length === 0) {
    return NextResponse.json({ events: [] });
  }

  query = query.in("form_id", ownedFormIds);
}

const { data, error } = await query;

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