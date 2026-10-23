import { describe, expect, it } from "vitest";
import { getAtPath, setAtPath } from "./jsonPath";

describe("getAtPath", () => {
  it("reads a nested value", () => {
    expect(getAtPath({ a: { b: { c: "hello" } } }, "a.b.c")).toBe("hello");
  });

  it("returns undefined for a missing path", () => {
    expect(getAtPath({ a: {} }, "a.b.c")).toBeUndefined();
  });

  it("returns undefined when an intermediate value is not an object", () => {
    expect(getAtPath({ a: "not an object" }, "a.b")).toBeUndefined();
  });
});

describe("setAtPath", () => {
  it("sets a top-level value without mutating the input", () => {
    const original = { a: 1 };
    const next = setAtPath(original, "b", 2);
    expect(original).toEqual({ a: 1 });
    expect(next).toEqual({ a: 1, b: 2 });
  });

  it("creates intermediate objects as needed", () => {
    const next = setAtPath({}, "a.b.c", "value");
    expect(next).toEqual({ a: { b: { c: "value" } } });
  });

  it("preserves sibling keys when setting a nested value", () => {
    const next = setAtPath({ a: { b: 1, c: 2 } }, "a.b", 99);
    expect(next).toEqual({ a: { b: 99, c: 2 } });
  });

  it("overwrites a non-object intermediate value with a fresh object rather than crashing", () => {
    const next = setAtPath({ a: "not an object" }, "a.b", "value");
    expect(next).toEqual({ a: { b: "value" } });
  });
});
