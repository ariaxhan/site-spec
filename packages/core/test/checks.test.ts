import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CHECK_CATALOG, CHECK_IDS, getCheck } from "../src/audit/checks";

/**
 * The catalog is a description of the engine, so it must not be allowed to
 * drift from it. These tests scrape the REAL ids out of the engine source
 * (audit.ts emits them, fix.ts repairs them) and compare both directions.
 * Nobody has to remember to update a list: forgetting turns the suite red.
 */

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

/** Every "audit/…" string literal in a source file. */
function scrapeIds(source: string): string[] {
  return [...new Set([...source.matchAll(/"(audit\/[a-z0-9-]+)"/g)].map((m) => m[1]!))].sort();
}

const auditSource = read("../src/audit/audit.ts");
const fixSource = read("../src/fix/fix.ts");

describe("check catalog", () => {
  it("has no duplicate ids", () => {
    expect(new Set(CHECK_IDS).size).toBe(CHECK_CATALOG.length);
  });

  it("covers exactly the check ids audit.ts can emit", () => {
    expect(CHECK_IDS).toEqual(scrapeIds(auditSource));
  });

  it("marks fixable exactly for the ids fix.ts repairs", () => {
    const catalogFixable = CHECK_CATALOG.filter((c) => c.fixable)
      .map((c) => c.id)
      .sort();
    expect(catalogFixable).toEqual(scrapeIds(fixSource));
  });

  it("gives every check a non-empty one-line description", () => {
    for (const check of CHECK_CATALOG) {
      expect(check.description.length, check.id).toBeGreaterThan(10);
      expect(check.description, check.id).not.toContain("\n");
    }
  });

  it("looks a check up by id", () => {
    expect(getCheck("audit/noindex")?.fixable).toBe(true);
    expect(getCheck("audit/nope")).toBeUndefined();
  });
});
