
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getForm } from "@/lib/store";
import { checkUploadRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-real-ip")?.trim();

    if (!ip) {
      return NextResponse.json(
        { error: "Unable to verify upload request." },
        { status: 400 }
      );
    }

    let rateLimit: Awaited<ReturnType<typeof checkUploadRateLimit>>;

    try {
      rateLimit = await checkUploadRateLimit(ip);
    } catch (error) {
      console.error("Upload rate limiter unavailable:", error);

      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))
            ),
          },
        }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "File storage is not configured." },
        { status: 500 }
      );
    }

    const data = await request.formData();
    const file = data.get("file");
    const formId = data.get("formId");
    const questionId = data.get("questionId");

    if (
      !(file instanceof File) ||
      typeof formId !== "string" ||
      typeof questionId !== "string" ||
      !formId.trim() ||
      !questionId.trim()
    ) {
      return NextResponse.json(
        { error: "A file, form ID, and question ID are required." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Files must be between 1 byte and 5 MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "This file type is not allowed." },
        { status: 400 }
      );
    }

    const form = await getForm(formId);

    if (!form || !form.published) {
      return NextResponse.json(
        { error: "This form is not available." },
        { status: 404 }
      );
    }

    const question = form.questions.find(
      (item) => item.id === questionId && item.type === "file"
    );

    if (!question) {
      return NextResponse.json(
        { error: "This file question does not exist." },
        { status: 400 }
      );
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath =
      `${formId}/${questionId}/${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage
      .from("form-uploads")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload failed:", error);

      return NextResponse.json(
        { error: "The file could not be uploaded." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        path: storagePath,
        name: file.name,
        size: file.size,
        type: file.type,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload request failed:", error);

    return NextResponse.json(
      { error: "The upload request could not be processed." },
      { status: 500 }
    );
  }
}
