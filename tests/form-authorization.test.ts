
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getApiActorMock, listFormsMock, getFormMock, saveFormMock } =
  vi.hoisted(() => ({
    getApiActorMock: vi.fn(),
    listFormsMock: vi.fn(),
    getFormMock: vi.fn(),
    saveFormMock: vi.fn(),
  }));

vi.mock("@/lib/api-auth", () => ({
  getApiActor: getApiActorMock,
}));

vi.mock("@/lib/store", () => ({
  listForms: listFormsMock,
  getForm: getFormMock,
  saveForm: saveFormMock,
  default: {},
}));

import { GET, POST } from "../app/api/forms/route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/forms authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFormsMock.mockResolvedValue([]);
    getFormMock.mockResolvedValue(null);
    saveFormMock.mockImplementation(async (form) => form);
  });

  it("rejects listing forms when unauthenticated", async () => {
    getApiActorMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listFormsMock).not.toHaveBeenCalled();
  });

  it("lists only the signed-in user's forms", async () => {
    getApiActorMock.mockResolvedValue({
      kind: "user",
      userId: "user-123",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(listFormsMock).toHaveBeenCalledWith("user-123");
  });

  it("rejects creating a form when unauthenticated", async () => {
    getApiActorMock.mockResolvedValue(null);

    const response = await POST(postRequest({ title: "Test form" }));

    expect(response.status).toBe(401);
    expect(saveFormMock).not.toHaveBeenCalled();
  });

  it("does not allow a user to update another user's form", async () => {
    getApiActorMock.mockResolvedValue({
      kind: "user",
      userId: "user-123",
    });
    getFormMock.mockResolvedValue(null);

    const response = await POST(
      postRequest({
        id: "form-owned-by-someone-else",
        title: "Attempted update",
        questions: [],
      }),
    );
console.log("Authorization error:", await response.clone().text());
    expect(response.status).toBe(404);
    expect(getFormMock).toHaveBeenCalledWith(
      "form-owned-by-someone-else",
      "user-123",
    );
    expect(saveFormMock).not.toHaveBeenCalled();
  });

  it("creates a form owned by the signed-in user", async () => {
    getApiActorMock.mockResolvedValue({
      kind: "user",
      userId: "user-123",
    });

    const response = await POST(
      postRequest({
        title: "My new form",
        questions: [],
      }),
    );

    expect(response.status).toBe(201);
    expect(saveFormMock).toHaveBeenCalledOnce();
    expect(saveFormMock.mock.calls[0][0].ownerId).toBe("user-123");
  });
});
