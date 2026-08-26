import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditSite, compileSpec, fixIssue, isUrl, listChecks } from "../src/tools";
import { CHECK_CATALOG } from "@site-spec/core";
import { demoBrief, demoSite, demoSpec } from "../../core/test/fixtures/restaurant";

/**
 * Every tool is exercised against the fixture sites already in the repo, so
 * the suite never touches the network:
 *   packages/core/test/fixtures/slop-site  — a deliberately broken page
 *   examples/restaurant-site               — a clean site-spec build
 */
const SLOP = "packages/core/test/fixtures/slop-site";
const CLEAN = "examples/restaurant-site";

describe("isUrl", () => {
  it("recognises URLs and bare hostnames, not paths", () => {
    expect(isUrl("https://example.com")).toBe(true);
    expect(isUrl("example.com")).toBe(true);
    expect(isUrl("example.com/about")).toBe(true);
    expect(isUrl("./dist")).toBe(false);
    expect(isUrl("examples/restaurant-site")).toBe(false);
    expect(isUrl("/tmp/out")).toBe(false);
  });
});

describe("audit_site", () => {
  it("finds real problems in the broken fixture", async () => {
    const out = await auditSite({ url: SLOP });
    expect(out.live).toBe(false);
    expect(out.findings.length).toBeGreaterThan(0);
    expect(out.errors).toBeGreaterThan(0);
    expect(out.ok).toBe(false);
    expect(out.pages).toEqual(["index.html"]);
    const ids = out.findings.map((f) => f.checkId);
    expect(ids).toContain("audit/title-missing");
    expect(ids).toContain("audit/robots-missing");
  });

  it("tags every finding with severity, check id and fix availability", async () => {
    const out = await auditSite({ url: SLOP });
    for (const f of out.findings) {
      expect(["error", "warning"]).toContain(f.severity);
      expect(f.checkId).toMatch(/^audit\//);
      expect(typeof f.fixAvailable).toBe("boolean");
      expect(f.category).not.toBe("unknown");
    }
    const noindex = out.findings.find((f) => f.checkId === "audit/noindex");
    expect(noindex?.fixAvailable).toBe(true);
    const brokenLink = out.findings.find((f) => f.checkId === "audit/broken-link");
    expect(brokenLink?.fixAvailable).toBe(false);
  });

  it("passes a clean site-spec build with no errors", async () => {
    const out = await auditSite({ url: CLEAN });
    expect(out.ok).toBe(true);
    expect(out.errors).toBe(0);
    expect(out.pages.length).toBeGreaterThan(0);
  });

  it("filters to the requested checks and flags unknown ones", async () => {
    const out = await auditSite({ url: SLOP, checks: ["audit/title-missing", "audit/not-a-check"] });
    expect(out.findings.every((f) => f.checkId === "audit/title-missing")).toBe(true);
    expect(out.findings.length).toBeGreaterThan(0);
    expect(out.unknownChecks).toEqual(["audit/not-a-check"]);
  });
});

describe("fix_issue", () => {
  it("returns a diff without writing anything by default", async () => {
    const out = await fixIssue({ urlOrPath: SLOP, checkId: "audit/robots-missing" });
    expect(out.fixAvailable).toBe(true);
    expect(out.written).toEqual([]);
    expect(out.diffs).toHaveLength(1);
    expect(out.diffs[0]!.file).toBe("robots.txt");
    expect(out.diffs[0]!.change).toBe("created");
    expect(out.diffs[0]!.before).toBeNull();
    expect(out.diffs[0]!.after).toMatch(/User-agent/i);
    expect(out.actions[0]!.checkId).toBe("audit/robots-missing");
    expect(out.note).toMatch(/Dry run/);
  });

  it("repairs only the requested check, leaving other findings alone", async () => {
    const out = await fixIssue({ urlOrPath: SLOP, checkId: "audit/title-missing" });
    expect(out.diffs.map((d) => d.file)).toEqual(["index.html"]);
    expect(out.actions.every((a) => a.checkId === "audit/title-missing")).toBe(true);
  });

  it("writes the corrected files when asked, into a directory of our choosing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "site-spec-mcp-"));
    const out = await fixIssue({
      urlOrPath: SLOP,
      checkId: "audit/robots-missing",
      write: true,
      outDir: dir,
    });
    expect(out.written).toEqual(["robots.txt"]);
    expect(out.writtenTo).toBe(dir);
    expect(existsSync(join(dir, "robots.txt"))).toBe(true);
    expect(readFileSync(join(dir, "robots.txt"), "utf8")).toBe(out.diffs[0]!.after);
    // the fixture itself is never touched
    expect(existsSync(join(SLOP, "robots.txt"))).toBe(false);
  });

  it("says so plainly when a check has no automatic repair", async () => {
    const out = await fixIssue({ urlOrPath: SLOP, checkId: "audit/broken-link" });
    expect(out.fixAvailable).toBe(false);
    expect(out.diffs).toEqual([]);
    expect(out.note).toMatch(/no automatic repair/);
  });

  it("says so plainly when the check raised no findings here", async () => {
    const out = await fixIssue({ urlOrPath: CLEAN, checkId: "audit/robots-missing" });
    expect(out.matchedFindings).toEqual([]);
    expect(out.note).toMatch(/nothing to fix/);
  });

  it("refuses an unknown check id", async () => {
    await expect(fixIssue({ urlOrPath: SLOP, checkId: "audit/nope" })).rejects.toThrow(
      /Unknown check id/,
    );
  });

  it("refuses to write to a URL target, because a server is not writable", async () => {
    await expect(
      fixIssue({ urlOrPath: "https://example.com", checkId: "audit/robots-missing", write: true }),
    ).rejects.toThrow(/not writable/);
  });
});

describe("compile_spec", () => {
  const business = {
    pack: "restaurant",
    spec: demoSpec,
    brief: demoBrief,
    site: demoSite,
  };

  it("compiles business data into a SiteSpec and deployable files", () => {
    const out = compileSpec({ business });
    expect(out.ok).toBe(true);
    expect(out.pack).toBe("restaurant");
    expect(out.spec?.pack.id).toBe("restaurant");
    const names = Object.keys(out.files ?? {});
    expect(names).toContain("index.html");
    expect(names).toContain("sitemap.xml");
    expect(names).toContain("robots.txt");
    expect(names).toContain("llms.txt");
    expect(out.files!["index.html"]).toContain("<!DOCTYPE html>");
  });

  it("produces a site that passes its own audit", async () => {
    const dir = mkdtempSync(join(tmpdir(), "site-spec-mcp-build-"));
    const out = compileSpec({ business, outDir: dir });
    expect(out.written).toContain("index.html");
    const audit = await auditSite({ url: dir });
    expect(audit.errors).toBe(0);
  });

  it("refuses a config missing a required key", () => {
    expect(() => compileSpec({ business: { pack: "restaurant", spec: demoSpec, brief: demoBrief } })).toThrow(
      /missing "site"/,
    );
  });

  it("refuses an unregistered pack", () => {
    expect(() => compileSpec({ business: { ...business, pack: "spaceship" } })).toThrow(
      /Unknown pack/,
    );
  });
});

describe("list_checks", () => {
  it("enumerates every check the engine can raise, with a description each", () => {
    const out = listChecks();
    expect(out.count).toBe(CHECK_CATALOG.length);
    expect(out.checks).toHaveLength(out.count);
    expect(out.fixable).toBe(CHECK_CATALOG.filter((c) => c.fixable).length);
    for (const c of out.checks) {
      expect(c.id).toMatch(/^audit\//);
      expect(c.description.length).toBeGreaterThan(10);
      expect(typeof c.fixable).toBe("boolean");
    }
  });

  it("agrees with what audit_site actually reports", async () => {
    const known = new Set(listChecks().checks.map((c) => c.id));
    const out = await auditSite({ url: SLOP });
    for (const f of out.findings) expect(known.has(f.checkId)).toBe(true);
  });
});
