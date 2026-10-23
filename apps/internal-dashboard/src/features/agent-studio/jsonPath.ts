import type { JsonValue } from "@sandy/shared-types";

/** Reads a dot-separated path from a JSON object. Returns undefined if any segment is missing. */
export function getAtPath(obj: Record<string, JsonValue>, path: string): JsonValue | undefined {
  const segments = path.split(".");
  let current: JsonValue | undefined = obj;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) return undefined;
    if (!(segment in current)) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Returns a new object with `value` set at `path`, creating intermediate
 * objects as needed. Never mutates the input. Only walks through plain
 * objects — it refuses to overwrite a non-object intermediate value, since
 * that would silently corrupt an unrelated field.
 */
export function setAtPath(
  obj: Record<string, JsonValue>,
  path: string,
  value: JsonValue,
): Record<string, JsonValue> {
  const segments = path.split(".");
  const [head, ...rest] = segments;
  if (head === undefined) return obj;

  if (rest.length === 0) {
    return { ...obj, [head]: value };
  }

  const existing = obj[head];
  const nested =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? existing
      : {};

  return { ...obj, [head]: setAtPath(nested, rest.join("."), value) };
}

/** Collects every leaf (and object/array) path present in a JSON object, used to detect unknown fields. */
export function collectTopLevelPaths(obj: Record<string, JsonValue>): string[] {
  return Object.keys(obj);
}
