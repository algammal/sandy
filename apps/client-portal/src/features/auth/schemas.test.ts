import { describe, expect, it } from "vitest";
import { registerSchema, signInSchema } from "./schemas";

describe("signInSchema", () => {
  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = signInSchema.safeParse({ email: "user@example.com", password: "123" });
    expect(result.success).toBe(false);
  });

  it("accepts valid credentials", () => {
    const result = signInSchema.safeParse({ email: "user@example.com", password: "secret123" });
    expect(result.success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "secret123",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  it("accepts matching passwords", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    });
    expect(result.success).toBe(true);
  });
});
