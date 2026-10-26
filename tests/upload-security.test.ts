
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getFormMock,
  checkUploadRateLimitMock,
  uploadMock,
  fileTypeFromBufferMock,
} = vi.hoisted(() => ({
  getFormMock: vi.fn(),
  checkUploadRateLimitMock: vi.fn(),
  uploadMock: vi.fn(),
  fileTypeFromBufferMock: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  getForm: getFormMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkUploadRateLimit: checkUploadRateLimitMock,
}));

vi.mock("@/lib/question-visibility", () => ({
  getVisibleQuestions: (
    questions: Array<{
      id: string;
      condition?: {
        questionId: string;
        operator: "equals" | "not_equals";
        value: string;
      };
    }>,
    answers: Record<string, string>,
  ) =>
    questions.filter((question) => {
      if (!question.condition) return true;

      const answer = answers[question.condition.questionId] ?? "";
      const matches = answer === question.condition.value;

      return question.condition.operator === "equals"
        ? matches
        : !matches;
    }),
}));

vi.mock("file-type", () => ({
  fileTypeFromBuffer: fileTypeFromBufferMock,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
      })),
    },
  })),
}));

import { POST } from "../app/api/uploads/route";

const publishedForm = {
  id: "form-1",
  title: "Upload test",
  description: "",
  published: true,
  welcomeText: "",
  completionText: "Thank you",
  accentColor: "#4f46e5",
  createdAt: "2026-01-01T00:00:00.000Z",
  questions: [
    {
      id: "q1",
      label: "Upload your file",
      type: "file",
      required: true,
    },
    {
      id: "q2",
      label: "Optional file",
      type: "file",
      required: false,
      condition: {
        questionId: "q3",
        operator: "equals" as const,
        value: "Yes",
      },
    },
    {
      id: "q3",
      label: "Do you want to upload another file?",
      type: "yesno",
      required: true,
    },
  ],
};

function makeRequest(options: {
  file?: File;
  formId?: string;
  questionId?: string;
  answers?: string;
  ip?: string;
} = {}) {
  const data = new FormData();

  if (options.file) data.set("file", options.file);
  if (options.formId !== undefined) data.set("formId", options.formId);
  if (options.questionId !== undefined) {
    data.set("questionId", options.questionId);
  }
  if (options.answers !== undefined) {
    data.set("answers", options.answers);
  }

  const headers = new Headers();

  if (options.ip !== "") {
    headers.set("x-real-ip", options.ip ?? "203.0.113.10");
  }

  return new Request("http://localhost/api/uploads", {
    method: "POST",
    headers,
    body: data,
  });
}

function pngFile(size = 8, name = "test.png", type = "image/png") {
  return new File(
    [new Uint8Array(size).fill(1)],
    name,
    { type },
  );
}

describe("POST /api/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    checkUploadRateLimitMock.mockResolvedValue({
      success: true,
      reset: Date.now() + 60_000,
    });

    getFormMock.mockResolvedValue(publishedForm);
    fileTypeFromBufferMock.mockResolvedValue({ mime: "image/png" });
    uploadMock.mockResolvedValue({ error: null });
  });

  it("rejects a request without an IP address", async () => {
    const response = await POST(makeRequest({ ip: "" }));

    expect(response.status).toBe(400);
    expect(checkUploadRateLimitMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects uploads when rate limited", async () => {
    checkUploadRateLimitMock.mockResolvedValue({
      success: false,
      reset: Date.now() + 60_000,
    });

    const response = await POST(
      makeRequest({
        file: pngFile(),
        formId: "form-1",
        questionId: "q1",
      }),
    );

    expect(response.status).toBe(429);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects a missing file", async () => {
    const response = await POST(
      makeRequest({ formId: "form-1", questionId: "q1" }),
    );

    expect(response.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects an empty file", async () => {
    const response = await POST(
      makeRequest({
        file: pngFile(0),
        formId: "form-1",
        questionId: "q1",
      }),
    );

    expect(response.status).toBe(400);
    expect(fileTypeFromBufferMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects a file larger than 5 MB", async () => {
    const oversizedFile = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "large.png",
      { type: "image/png" },
    );

    const response = await POST(
      makeRequest({
        file: oversizedFile,
        formId: "form-1",
        questionId: "q1",
      }),
    );

    expect(response.status).toBe(400);
    expect(fileTypeFromBufferMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects files with unrecognized contents", async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);

    const response = await POST(
      makeRequest({
        file: pngFile(),
        formId: "form-1",
        questionId: "q1",
      }),
    );

    expect(response.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects a mismatch between file contents and MIME type", async () => {
    fileTypeFromBufferMock.mockResolvedValue({ mime: "image/jpeg" });

    const response = await POST(
      makeRequest({
        file: pngFile(),
        formId: "form-1",
        questionId: "q1",
      }),
    );

    expect(response.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects an unpublished form", async () => {
    getFormMock.mockResolvedValue({
      ...publishedForm,
      published: false,
    });

    const response = await POST(
      makeRequest({
        file: pngFile(),
        formId: "form-1",
        questionId: "q1",
      }),
    );

    expect(response.status).toBe(404);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects a question that is not a file-upload question", async () => {
    const response = await POST(
      makeRequest({
        file: pngFile(),
        formId: "form-1",
        questionId: "q3",
      }),
    );

    expect(response.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects malformed answers", async () => {
    const response = await POST(
      makeRequest({
        file: pngFile(),
        formId: "form-1",
        questionId: "q1",
        answers: "{invalid-json",
      }),
    );

    expect(response.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects uploads for hidden conditional questions", async () => {
    const response = await POST(
      makeRequest({
        file: pngFile(),
        formId: "form-1",
        questionId: "q2",
        answers: JSON.stringify({ q3: "No" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("uploads a valid file", async () => {
    const response = await POST(
      makeRequest({
        file: pngFile(),
        formId: "form-1",
        questionId: "q1",
      }),
    );

    expect(response.status).toBe(201);
    expect(uploadMock).toHaveBeenCalledOnce();

    const body = await response.json();

    expect(body.path).toContain("form-1/q1/");
    expect(body.name).toBe("test.png");
    expect(body.type).toBe("image/png");
  });
});
