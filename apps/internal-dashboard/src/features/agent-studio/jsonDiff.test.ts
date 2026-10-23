import { describe, expect, it } from "vitest";
import { diffJson, summarizeDiff } from "@sandy/shared-utils";

describe("diffJson", () => {
  it("detects added, removed and changed top-level fields", () => {
    const before = { name: "Old", keep: "same" };
    const after = { name: "New", keep: "same", added: "field" };
    const entries = diffJson(before, after);

    expect(entries.find((e) => e.path === "name")).toMatchObject({ kind: "changed", before: "Old", after: "New" });
    expect(entries.find((e) => e.path === "added")).toMatchObject({ kind: "added", after: "field" });
    expect(entries.find((e) => e.path === "keep")).toMatchObject({ kind: "unchanged" });
  });

  it("recurses into nested objects and reports dotted paths", () => {
    const before = { conversation_config: { agent: { first_message: "Hi" } } };
    const after = { conversation_config: { agent: { first_message: "Hello there" } } };
    const entries = diffJson(before, after);
    expect(entries).toEqual([
      { path: "conversation_config.agent.first_message", kind: "changed", before: "Hi", after: "Hello there" },
    ]);
  });

  it("reports a removed nested field", () => {
    const before = { a: { b: "value" } };
    const after = { a: {} };
    const entries = diffJson(before, after);
    expect(entries).toEqual([{ path: "a.b", kind: "removed", before: "value" }]);
  });
});

describe("summarizeDiff", () => {
  it("groups paths by kind", () => {
    const entries = diffJson({ a: 1, b: 2, c: 3 }, { a: 1, b: 99, d: 4 });
    const summary = summarizeDiff(entries);
    expect(summary.unchanged).toEqual(["a"]);
    expect(summary.changed).toEqual(["b"]);
    expect(summary.removed).toEqual(["c"]);
    expect(summary.added).toEqual(["d"]);
  });
});
