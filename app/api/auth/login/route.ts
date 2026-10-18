
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminSession } from "@/lib/auth";

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
  } catch {
    return NextResponse.json(
      { error: "Unable to log in right now." },
      { status: 500 }
    );
  }
}
