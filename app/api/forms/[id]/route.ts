
import { NextResponse } from "next/server";
import { getForm, removeForm } from "@/lib/store";
import { getApiActor } from "@/lib/api-auth";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getApiActor();

if (!actor) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}
  const { id } = await params;

  try {
    const form = await getForm(
  id,
  actor.kind === "user" ? actor.userId : undefined
);

    return form
      ? NextResponse.json(form)
      : NextResponse.json(
          { error: "Form not found." },
          { status: 404 }
        );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server error.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getApiActor();

if (!actor) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}

  const { id } = await params;

  try {
    const form = await getForm(
  id,
  actor.kind === "user" ? actor.userId : undefined
);

if (!form) {
  return NextResponse.json(
    { error: "Form not found." },
    { status: 404 }
  );
}

await removeForm(
  id,
  actor.kind === "user" ? actor.userId : undefined
);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server error.",
      },
      { status: 500 }
    );
  }
}
