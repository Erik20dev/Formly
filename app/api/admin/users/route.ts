
import { NextResponse } from "next/server";
import { getApiActor } from "@/lib/api-auth";
import {
  listManagedUsers,
  setManagedUserStatus,
} from "@/lib/admin-users";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const actor = await getApiActor();

  if (!actor) {
    return {
      actor: null,
      response: NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 },
      ),
    };
  }

  if (actor.kind !== "admin") {
    return {
      actor: null,
      response: NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      ),
    };
  }

  return { actor, response: null };
}

export async function GET() {
  const { actor, response } = await requireAdmin();

  if (!actor) {
    return response!;
  }

  try {
    const users = await listManagedUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin user listing failed:", error);

    return NextResponse.json(
      { error: "Could not load users." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const { actor, response } = await requireAdmin();

  if (!actor) {
    return response!;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("id" in body) ||
    !("status" in body) ||
    typeof body.id !== "string" ||
    (body.status !== "active" && body.status !== "suspended")
  ) {
    return NextResponse.json(
      { error: "A valid user ID and account status are required." },
      { status: 400 },
    );
  }

  const origin = request.headers.get("origin");

  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json(
          { error: "Request origin is not allowed." },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }
  }

  try {
    const user = await setManagedUserStatus(body.id, body.status);

    return NextResponse.json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update user.";

    if (message === "User not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (
      message === "Invalid user ID." ||
      message === "Invalid account status."
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (message === "Administrator accounts cannot be changed here.") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error("Admin user update failed:", error);

    return NextResponse.json(
      { error: "Could not update the account status." },
      { status: 500 },
    );
  }
}
