
import { describe, expect, it } from "vitest";
import { validateQuestions } from "../lib/question-validation";

const validQuestions = [
  {
    id: "q1",
    label: "Do you need follow-up?",
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
];

describe("validateQuestions", () => {
  it("accepts valid questions and conditions", () => {
    expect(validateQuestions(validQuestions)).toBe(true);
  });

  it("rejects duplicate question IDs", () => {
    expect(
      validateQuestions([
        validQuestions[0],
        { ...validQuestions[1], id: "q1" },
      ]),
    ).toBe(false);
  });

  it("rejects question IDs with surrounding whitespace", () => {
    expect(
      validateQuestions([
        { id: " q1 ", label: "Question", type: "text", required: false },
      ]),
    ).toBe(false);
  });

  it("rejects duplicate options", () => {
    expect(
      validateQuestions([
        {
          id: "q1",
          label: "Choose one",
          type: "choice",
          required: true,
          options: ["A", "A"],
        },
      ]),
    ).toBe(false);
  });

  it("rejects unsupported question types", () => {
    expect(
      validateQuestions([
        { ...validQuestions[0], type: "unsupported" },
      ]),
    ).toBe(false);
  });

  it("rejects choice questions without options", () => {
    expect(
      validateQuestions([
        { id: "q1", label: "Choose one", type: "choice", required: true },
      ]),
    ).toBe(false);
  });

  it("rejects conditions referencing a later question", () => {
    expect(
      validateQuestions([
        {
          id: "q2",
          label: "Follow-up",
          type: "text",
          required: false,
          condition: {
            questionId: "q1",
            operator: "equals",
            value: "Yes",
          },
        },
        validQuestions[0],
      ]),
    ).toBe(false);
  });

  it("rejects conditions referencing file questions", () => {
    expect(
      validateQuestions([
        {
          id: "q1",
          label: "Upload a file",
          type: "file",
          required: false,
        },
        {
          id: "q2",
          label: "Follow-up",
          type: "text",
          required: false,
          condition: {
            questionId: "q1",
            operator: "equals",
            value: "Yes",
          },
        },
      ]),
    ).toBe(false);
  });

  it("rejects invalid yes/no condition values", () => {
    expect(
      validateQuestions([
        { id: "q1", label: "Continue?", type: "yesno", required: true },
        {
          id: "q2",
          label: "Follow-up",
          type: "text",
          required: false,
          condition: {
            questionId: "q1",
            operator: "equals",
            value: "Maybe",
          },
        },
      ]),
    ).toBe(false);
  });

  it("rejects condition values not in choice options", () => {
    expect(
      validateQuestions([
        {
          id: "q1",
          label: "Choose one",
          type: "choice",
          required: true,
          options: ["A", "B"],
        },
        {
          id: "q2",
          label: "Follow-up",
          type: "text",
          required: false,
          condition: {
            questionId: "q1",
            operator: "equals",
            value: "C",
          },
        },
      ]),
    ).toBe(false);
  });

  it("rejects invalid rating condition values", () => {
    expect(
      validateQuestions([
        { id: "q1", label: "Rate this", type: "rating", required: true },
        {
          id: "q2",
          label: "Follow-up",
          type: "text",
          required: false,
          condition: {
            questionId: "q1",
            operator: "equals",
            value: "6",
          },
        },
      ]),
    ).toBe(false);
  });

  it("accepts valid dropdown and rating condition values", () => {
    expect(
      validateQuestions([
        {
          id: "q1",
          label: "Choose one",
          type: "dropdown",
          required: true,
          options: ["A", "B"],
        },
        {
          id: "q2",
          label: "Rate this",
          type: "rating",
          required: true,
          condition: {
            questionId: "q1",
            operator: "equals",
            value: "A",
          },
        },
        {
          id: "q3",
          label: "Follow-up",
          type: "text",
          required: false,
          condition: {
            questionId: "q2",
            operator: "equals",
            value: "5",
          },
        },
      ]),
    ).toBe(true);
  });

  it("rejects a non-array value", () => {
    expect(validateQuestions(null)).toBe(false);
  });
});
