import { describe, expect, it } from "vitest";
import { buildProcedureRows, buildStructuredProcedure, listProcedures } from "./procedures";
import type { JsonValue } from "@sandy/shared-types";

const catalogProcedure = buildStructuredProcedure({ name: "Do-not-call request", trigger: "Caller asks to stop.", message: "Understood." });

describe("listProcedures", () => {
  it("returns an empty array when procedures is absent", () => {
    expect(listProcedures({})).toEqual([]);
  });

  it("ignores malformed entries instead of throwing", () => {
    const config: Record<string, JsonValue> = { procedures: ["not an object", 42, { name: "Valid" }] };
    expect(listProcedures(config)).toHaveLength(1);
  });
});

describe("buildProcedureRows", () => {
  it("marks a procedure present in both raw and mapped config as an included catalog row", () => {
    const rawConfig = { procedures: [catalogProcedure as unknown as JsonValue] };
    const mappedConfig = { procedures: [catalogProcedure as unknown as JsonValue] };
    const rows = buildProcedureRows(rawConfig, mappedConfig);
    expect(rows).toEqual([{ procedure: catalogProcedure, source: "catalog", included: true }]);
  });

  it("marks a procedure present only in rawConfig as an excluded catalog row", () => {
    const rawConfig = { procedures: [catalogProcedure as unknown as JsonValue] };
    const mappedConfig = { procedures: [] as JsonValue[] };
    const rows = buildProcedureRows(rawConfig, mappedConfig);
    expect(rows).toEqual([{ procedure: catalogProcedure, source: "catalog", included: false }]);
  });

  it("marks a procedure present only in mappedConfig as a custom (always-included) row", () => {
    const custom = buildStructuredProcedure({ name: "Pricing question", trigger: "x", message: "y" });
    const rawConfig = {};
    const mappedConfig = { procedures: [custom as unknown as JsonValue] };
    const rows = buildProcedureRows(rawConfig, mappedConfig);
    expect(rows).toEqual([{ procedure: custom, source: "custom", included: true }]);
  });
});
