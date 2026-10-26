
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/user-auth";
import { checkLoginRateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      !body.email.trim() ||
      !body.password
    ) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }
const requestIp = request.headers.get("x-real-ip")?.trim();
const ip =
  requestIp ||
  (process.env.NODE_ENV === "development" ? "127.0.0.1" : "");

if (!ip) {
  return NextResponse.json(
    { error: "Unable to verify login request." },
    { status: 400 }
  );
}

const { success, reset } = await checkLoginRateLimit(`user:${ip}`);

if (!success) {
  return NextResponse.json(
    { error: "Too many login attempts. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(1, Math.ceil((reset - Date.now()) / 1000))
        ),
      },
    }
  );
}
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: body.email.trim(),
      password: body.password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const profile = await getCurrentUserProfile();

    if (!profile || profile.status !== "active") {
      await supabase.auth.signOut();

      return NextResponse.json(
        { error: "Your account is not active. Please contact an administrator." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      role: profile.role,
    });
  } catch (error) {
    console.error("User login error:", error);

    return NextResponse.json(
      { error: "Unable to sign in right now. Please try again." },
      { status: 500 }
    );
  }
}
