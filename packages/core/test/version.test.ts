import { describe, it, expect } from "vitest";
import { schemaVer, parseSchemaVer, isBreaking } from "../src/version";

describe("SchemaVer", () => {
  it("accepts MODEL-REVISION-ADDITION", () => {
    expect(schemaVer.safeParse("1-0-0").success).toBe(true);
    expect(schemaVer.safeParse("0-1-0").success).toBe(true);
    expect(schemaVer.safeParse("12-3-45").success).toBe(true);
  });

  it("rejects SemVer and garbage", () => {
    expect(schemaVer.safeParse("1.0.0").success).toBe(false);
    expect(schemaVer.safeParse("v1-0-0").success).toBe(false);
    expect(schemaVer.safeParse("1-0").success).toBe(false);
  });

  it("parses components", () => {
    expect(parseSchemaVer("2-3-4")).toEqual({ model: 2, revision: 3, addition: 4 });
  });

  it("flags a MODEL bump as breaking, others as not", () => {
    expect(isBreaking("1-0-0", "2-0-0")).toBe(true);
    expect(isBreaking("1-0-0", "1-9-9")).toBe(false);
    expect(isBreaking("1-2-3", "1-2-4")).toBe(false);
  });
});
