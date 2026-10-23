import type { JsonDiffEntry, JsonValue } from "@sandy/shared-types";

function isPlainObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(a: JsonValue, b: JsonValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Produces a flat list of path-level differences between two JSON documents.
 * Walks objects recursively; arrays are compared by value (not diffed element-by-element)
 * since agent configuration arrays (tools, services, etc.) are small and order-sensitive.
 */
export function diffJson(
  before: Record<string, JsonValue>,
  after: Record<string, JsonValue>,
): JsonDiffEntry[] {
  const entries: JsonDiffEntry[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  function walk(path: string, beforeValue: JsonValue | undefined, afterValue: JsonValue | undefined) {
    const hasBefore = beforeValue !== undefined;
    const hasAfter = afterValue !== undefined;

    if (!hasBefore && hasAfter) {
      entries.push({ path, kind: "added", after: afterValue });
      return;
    }
    if (hasBefore && !hasAfter) {
      entries.push({ path, kind: "removed", before: beforeValue });
      return;
    }
    if (!hasBefore || !hasAfter) return;

    if (isPlainObject(beforeValue) && isPlainObject(afterValue)) {
      const nestedKeys = new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]);
      for (const key of nestedKeys) {
        walk(path ? `${path}.${key}` : key, beforeValue[key], afterValue[key]);
      }
      return;
    }

    if (deepEqual(beforeValue, afterValue)) {
      entries.push({ path, kind: "unchanged", before: beforeValue, after: afterValue });
    } else {
      entries.push({ path, kind: "changed", before: beforeValue, after: afterValue });
    }
  }

  for (const key of keys) {
    walk(key, before[key], after[key]);
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export function summarizeDiff(entries: JsonDiffEntry[]) {
  return {
    changed: entries.filter((e) => e.kind === "changed").map((e) => e.path),
    added: entries.filter((e) => e.kind === "added").map((e) => e.path),
    removed: entries.filter((e) => e.kind === "removed").map((e) => e.path),
    unchanged: entries.filter((e) => e.kind === "unchanged").map((e) => e.path),
  };
}
