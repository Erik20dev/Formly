
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getFormMock,
  saveSubmissionMock,
  isAdminAuthenticatedMock,
  checkPublicRateLimitMock,
} = vi.hoisted(() => ({
  getFormMock: vi.fn(),
  saveSubmissionMock: vi.fn(),
  isAdminAuthenticatedMock: vi.fn(),
  checkPublicRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  getForm: getFormMock,
  saveSubmission: saveSubmissionMock,
  listSubmissions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isAdminAuthenticated: isAdminAuthenticatedMock,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkPublicRateLimit: checkPublicRateLimitMock,
}));
import { POST } from "../app/api/submissions/route";

const publishedForm = {
  id: "form-1",
  title: "Customer feedback",
  description: "",
  published: true,
  welcomeText: "Welcome",
  completionText: "Thank you",
  accentColor: "#4f46e5",
  createdAt: "2026-01-01T00:00:00.000Z",
  questions: [
    {
      id: "q1",
      label: "Do you need a follow-up?",
      type: "yesno",
      required: true,
    },
    {
      id: "q2",
      label: "Your email",
      type: "email",
      required: true,
      condition: {
        questionId: "q1",
        operator: "equals",
        value: "Yes",
      },
    },
  ],
};

function request(body: unknown) {
  return new Request("http://localhost/api/submissions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}
describe("POST /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkPublicRateLimitMock.mockResolvedValue({ success: true });
    getFormMock.mockResolvedValue(publishedForm);
    saveSubmissionMock.mockResolvedValue(undefined);
  });

  it("rejects a missing form ID", async () => {
    const response = await POST(request({ answers: {} }));

    expect(response.status).toBe(400);
    expect(saveSubmissionMock).not.toHaveBeenCalled();
  });

  it("rejects an unpublished or unavailable form", async () => {
    getFormMock.mockResolvedValue({
      ...publishedForm,
      published: false,
    });

    const response = await POST(
      request({ formId: "form-1", answers: {} }),
    );

    expect(response.status).toBe(404);
    expect(saveSubmissionMock).not.toHaveBeenCalled();
  });

  it("rejects missing required answers", async () => {
    const response = await POST(
      request({
        formId: "form-1",
        answers: {},
      }),
    );

    expect(response.status).toBe(400);
    expect(saveSubmissionMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email address", async () => {
    const response = await POST(
      request({
        formId: "form-1",
        answers: {
          q1: "Yes",
          q2: "not-an-email",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(saveSubmissionMock).not.toHaveBeenCalled();
  });

  it("saves a valid submission", async () => {
    const response = await POST(
      request({
        formId: "form-1",
        answers: {
          q1: "Yes",
          q2: "alex@example.com",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(saveSubmissionMock).toHaveBeenCalledOnce();
    expect(saveSubmissionMock.mock.calls[0][0].answers).toEqual({
      q1: "Yes",
      q2: "alex@example.com",
    });
  });

  it("rejects answers to a hidden conditional question", async () => {
    const response = await POST(
      request({
        formId: "form-1",
        answers: {
          q1: "No",
          q2: "alex@example.com",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(saveSubmissionMock).not.toHaveBeenCalled();
  });

  it("rejects answers that are not strings", async () => {
    const response = await POST(
      request({
        formId: "form-1",
        answers: {
          q1: "Yes",
          q2: 123,
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(saveSubmissionMock).not.toHaveBeenCalled();
  });

  it("rejects answers for unknown questions", async () => {
    const response = await POST(
      request({
        formId: "form-1",
        answers: {
          q1: "No",
          unknown: "unexpected",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(saveSubmissionMock).not.toHaveBeenCalled();
  });
});
