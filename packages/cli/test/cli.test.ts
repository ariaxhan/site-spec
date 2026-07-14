import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBuild } from "../src/commands/build";
import { runAudit } from "../src/commands/audit";
import { runHandoff } from "../src/commands/handoff";

/**
 * The CLI's command functions are importable library code (package-first);
 * cli.ts only parses args around them. These tests drive the same functions
 * the binary does, against the committed demo configs in sites/.
 */

describe("site-spec build (library entry)", () => {
  it("builds restaurant from its pure-data config, and the result audits clean", async () => {
    const out = mkdtempSync(join(tmpdir(), "site-spec-build-"));
    const result = await runBuild({
      configPath: "sites/restaurant/site.config.mjs",
      out,
      target: "cloudflare",
    });
    expect(result.ok, JSON.stringify(result.findings, null, 2)).toBe(true);
    for (const f of ["index.html", "404.html", "sitemap.xml", "robots.txt", "llms.txt", "_headers", "_redirects", "foundation.json", "favicon.svg", "manifest.json", "DEPLOY.md"]) {
      expect(existsSync(join(out, f)), `missing ${f}`).toBe(true);
    }

    const report = runAudit({ dir: out });
    const errors = report.findings.filter((f) => f.severity === "error");
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
    expect(report.mode).toBe("strict");
  });

  it("byte-identical to the committed golden (config path ≙ fixture path)", async () => {
    const out = mkdtempSync(join(tmpdir(), "site-spec-parity-"));
    await runBuild({ configPath: "sites/restaurant/site.config.mjs", out });
    expect(readFileSync(join(out, "index.html"), "utf8")).toBe(
      readFileSync("examples/restaurant-site/index.html", "utf8"),
    );
  });

  it("refuses to write anything when the config is missing required keys", async () => {
    await expect(
      runBuild({ configPath: "package.json", out: mkdtempSync(join(tmpdir(), "site-spec-bad-")) }),
    ).rejects.toThrow(/missing "pack"/);
  });
});

describe("site-spec audit (library entry)", () => {
  it("fails the slop fixture with named findings and exit-worthy state", () => {
    const report = runAudit({ dir: "packages/core/test/fixtures/slop-site" });
    expect(report.ok).toBe(false);
    expect(report.errors).toBeGreaterThanOrEqual(10);
    expect(new Set(report.findings.map((f) => f.checkId)).size).toBeGreaterThanOrEqual(15);
  });
});

describe("site-spec handoff (library entry)", () => {
  it("emits the frontend contract with grounded facts and compiler-owned surfaces", async () => {
    const { json } = await runHandoff({ configPath: "sites/restaurant/site.config.mjs" });
    const doc = JSON.parse(json) as Record<string, unknown>;
    expect(doc["appName"]).toBe("Rosalia's Kitchen");
    const facts = doc["facts"] as Array<{ source: string }>;
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.every((f) => typeof f.source === "string" && f.source.length > 0)).toBe(true);
    const rules = doc["rules"] as Record<string, unknown>;
    expect(String(rules["cookies"])).toContain("no cookies");
    expect((rules["compilerOwned"] as string[]).join(",")).toContain("sitemap.xml");
  });
});
