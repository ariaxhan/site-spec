import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * End-to-end over the REAL transport: build the bin, spawn it as a child
 * process, and talk MCP to it over stdio the way Claude Code or Codex will.
 * This is the test that would catch a bundling failure, a stray write to
 * stdout (which corrupts the JSON-RPC stream), or a tool that only works
 * when imported directly.
 */

const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const bin = fileURLToPath(new URL("../dist/mcp.mjs", import.meta.url));

let client: Client;
let transport: StdioClientTransport;

beforeAll(async () => {
  execFileSync("npm", ["run", "build"], { cwd: pkgRoot, stdio: "pipe" });
  expect(existsSync(bin)).toBe(true);

  transport = new StdioClientTransport({
    command: process.execPath,
    args: [bin],
    cwd: repoRoot,
  });
  client = new Client({ name: "site-spec-mcp-test", version: "0.0.0" });
  await client.connect(transport);
}, 120_000);

afterAll(async () => {
  await client?.close();
});

describe("site-spec-mcp over stdio", () => {
  it("is a bundled, executable, self-contained script", () => {
    const source = readFileSync(bin, "utf8");
    expect(source.startsWith("#!/usr/bin/env node")).toBe(true);
    // fully bundled: no bare imports left to resolve at runtime
    expect(source).not.toMatch(/^import .* from "@modelcontextprotocol/m);
    expect(source).not.toMatch(/^import .* from "zod"/m);
  });

  it("answers tools/list with exactly the four tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "audit_site",
      "compile_spec",
      "fix_issue",
      "list_checks",
    ]);
    for (const tool of tools) {
      expect(tool.description, tool.name).toBeTruthy();
      expect(tool.inputSchema.type, tool.name).toBe("object");
    }
    const audit = tools.find((t) => t.name === "audit_site")!;
    expect(Object.keys(audit.inputSchema.properties ?? {}).sort()).toEqual([
      "checks",
      "maxPages",
      "url",
    ]);
    expect(audit.inputSchema.required).toEqual(["url"]);
  });

  it("audits a fixture site over the wire and returns real findings", async () => {
    const res = await client.callTool({
      name: "audit_site",
      arguments: { url: "packages/core/test/fixtures/slop-site" },
    });
    expect(res.isError).toBeFalsy();
    const content = res.content as Array<{ type: string; text: string }>;
    expect(content[0]!.type).toBe("text");
    const out = JSON.parse(content[0]!.text) as {
      ok: boolean;
      errors: number;
      findings: Array<{ checkId: string; severity: string; fixAvailable: boolean }>;
    };
    expect(out.ok).toBe(false);
    expect(out.errors).toBeGreaterThan(0);
    expect(out.findings.length).toBeGreaterThan(0);
    expect(out.findings.map((f) => f.checkId)).toContain("audit/title-missing");
    expect(out.findings.some((f) => f.fixAvailable)).toBe(true);
  });

  it("lists the checks over the wire", async () => {
    const res = await client.callTool({ name: "list_checks", arguments: {} });
    const content = res.content as Array<{ type: string; text: string }>;
    const out = JSON.parse(content[0]!.text) as { count: number; checks: Array<{ id: string }> };
    expect(out.count).toBeGreaterThan(30);
    expect(out.checks.map((c) => c.id)).toContain("audit/noindex");
  });

  it("reports a tool error as an error result, not a crashed server", async () => {
    const res = await client.callTool({
      name: "fix_issue",
      arguments: { url_or_path: "packages/core/test/fixtures/slop-site", check_id: "audit/nope" },
    });
    expect(res.isError).toBe(true);
    const content = res.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toMatch(/Unknown check id/);
    // still alive afterwards
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(4);
  });
});
