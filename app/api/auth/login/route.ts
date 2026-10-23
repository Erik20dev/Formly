
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminSession } from "@/lib/auth";
import { checkLoginRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const configuredPassword = process.env.ADMIN_PASSWORD;

    if (!configuredPassword) {
      return NextResponse.json(
        { error: "Admin login is not configured." },
        { status: 500 }
      );
    }

    const ip = request.headers.get("x-real-ip")?.trim();

    if (!ip) {
      return NextResponse.json(
        { error: "Unable to verify login request." },
        { status: 400 }
      );
    }

    const { success, reset } = await checkLoginRateLimit(ip);

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

    const body = await request.json();
    const password = body?.password;

    if (typeof password !== "string" || password.length > 1024) {
      return NextResponse.json(
        { error: "Enter a valid password." },
        { status: 400 }
      );
    }

    const supplied = Buffer.from(password);
    const expected = Buffer.from(configuredPassword);

    const matches =
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected);

    if (!matches) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 }
      );
    }

    await createAdminSession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login failed:", error);

    return NextResponse.json(
      { error: "Unable to log in right now." },
      { status: 500 }
    );
  }
}
