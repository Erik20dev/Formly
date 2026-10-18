
import { NextResponse } from "next/server";
import { getForm, removeForm } from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const form = await getForm(id);

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
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    await removeForm(id);
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
