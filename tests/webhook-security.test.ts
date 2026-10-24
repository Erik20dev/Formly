import { describe, expect, it } from "vitest";
import { validateWebhookUrl } from "../lib/webhook-security";

describe("validateWebhookUrl", () => {
  it("accepts a public HTTPS webhook URL", () => {
    const url = validateWebhookUrl("https://hooks.example.com/events");

    expect(url.hostname).toBe("hooks.example.com");
    expect(url.protocol).toBe("https:");
  });

  it("rejects HTTP URLs", () => {
    expect(() =>
      validateWebhookUrl("http://hooks.example.com/events"),
    ).toThrow(/HTTPS/);
  });

  it("rejects localhost", () => {
    expect(() =>
      validateWebhookUrl("https://localhost/webhook"),
    ).toThrow(/local or internal hostname/);
  });

  it("rejects private IPv4 addresses", () => {
    expect(() =>
      validateWebhookUrl("https://192.168.1.10/webhook"),
    ).toThrow(/private or reserved IPv4/);
  });

  it("rejects URLs with embedded credentials", () => {
    expect(() =>
      validateWebhookUrl("https://user:password@example.com/webhook"),
    ).toThrow(/embedded credentials/);
  });

   it("rejects invalid URLs", () => {
    expect(() => validateWebhookUrl("not-a-url")).toThrow(/valid URL/);
  });

  it("rejects IPv4 loopback addresses", () => {
    expect(() =>
      validateWebhookUrl("https://127.0.0.1/webhook"),
    ).toThrow();
  });

  it("rejects IPv6 loopback addresses", () => {
    expect(() =>
      validateWebhookUrl("https://[::1]/webhook"),
    ).toThrow();
  });

  it("rejects IPv6 unique-local addresses", () => {
    expect(() =>
      validateWebhookUrl("https://[fc00::1]/webhook"),
    ).toThrow();
  });
});