/**
 * The MCP surface: four tools over the site-spec engine, on stdio.
 *
 * This file is adapter only — schema in, `tools.ts` call, JSON out. All the
 * behaviour lives in `tools.ts`, which calls `@site-spec/core` directly.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { auditSite, compileSpec, fixIssue, listChecks } from "./tools";
import { VERSION } from "./version";

/** Every tool answers with pretty JSON: readable to a human, parseable to an agent. */
const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const fail = (err: unknown) => ({
  isError: true,
  content: [
    { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
  ],
});

export function createServer(): McpServer {
  const server = new McpServer({ name: "site-spec", version: VERSION });

  server.registerTool(
    "audit_site",
    {
      title: "Audit a website's invisible foundation",
      description:
        "Crawl a live URL (or read a local directory of built output) and report every problem in the layer a browser does not show: robots.txt and llms.txt policy, canonical and noindex signals, structured data, Open Graph, security and cache headers, accessibility semantics, and the tracker/cookie surface. Each finding carries its check id, severity, the file it was found in, and whether fix_issue can repair it automatically.",
      inputSchema: {
        url: z
          .string()
          .min(1)
          .describe(
            "The site to audit: a URL (https://example.com, or bare example.com), or a path to a local directory of built output.",
          ),
        checks: z
          .array(z.string())
          .optional()
          .describe(
            "Only report these check ids (e.g. [\"audit/noindex\"]). Omit for every check. Call list_checks for the full set.",
          ),
        maxPages: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Cap the live crawl at this many pages. Default 25. Ignored for a local directory."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url, checks, maxPages }) => {
      try {
        return json(await auditSite({ url, checks, maxPages }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "fix_issue",
    {
      title: "Auto-fix one audit finding",
      description:
        "Apply site-spec's deterministic repair for ONE check id and return the resulting diff. The engine is pure: it produces corrected file contents and never writes by itself, so a URL target can only ever yield a diff (a remote server is not writable). To write the fix, point this at a local directory and pass write: true. Not every check is repairable — list_checks marks which ones are, and unrepairable findings come back with the manual step spelled out.",
      inputSchema: {
        url_or_path: z
          .string()
          .min(1)
          .describe("The site to fix: a URL (diff only), or a path to a local directory of built output."),
        check_id: z
          .string()
          .min(1)
          .describe("The single check id to repair, e.g. \"audit/robots-stale-token\". See list_checks."),
        write: z
          .boolean()
          .optional()
          .describe(
            "Write the corrected files to disk. Local directory targets only; refused for a URL. Default false (dry run).",
          ),
        out_dir: z
          .string()
          .optional()
          .describe("Directory to write into when write is true. Defaults to overwriting the target directory."),
        maxPages: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Cap the live crawl at this many pages. Default 25. Ignored for a local directory."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ url_or_path, check_id, write, out_dir, maxPages }) => {
      try {
        return json(await fixIssue({ urlOrPath: url_or_path, checkId: check_id, write, outDir: out_dir, maxPages }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "compile_spec",
    {
      title: "Compile business data into a SiteSpec and a deployable site",
      description:
        "Turn verified business facts into a validated SiteSpec and the files it renders to: HTML, sitemap.xml, robots.txt, llms.txt, headers and icons. `business` is site-spec's pure-data site config: { pack, brief, site, spec }, where `pack` is a registered pack id, `brief` is the real business facts (name, category, phone, address, hours, reviews), `site` is deploy context (baseUrl, locales), and `spec` is the page structure. Validation runs at both the spec tier and the rendered tier, so an invalid site never produces output. Returns the files in memory unless out_dir is given.",
      inputSchema: {
        business: z
          .record(z.unknown())
          .describe(
            "The site config object: { pack: \"restaurant\", brief: {...}, site: {...}, spec: {...}, foundation?: {...}, target?: \"cloudflare\" }.",
          ),
        out_dir: z
          .string()
          .optional()
          .describe("Write the compiled site to this directory. Omit to get the files in the response only."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ business, out_dir }) => {
      try {
        return json(compileSpec({ business, outDir: out_dir }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "list_checks",
    {
      title: "List every audit check",
      description:
        "Enumerate every check the site-spec audit engine can raise: the check id, a one-line description of what it looks for, its category (seo, privacy, security, accessibility, performance, structured-data, ai-searchability, structure), and whether fix_issue can repair it automatically. Read this before filtering audit_site or calling fix_issue.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        return json(listChecks());
      } catch (err) {
        return fail(err);
      }
    },
  );

  return server;
}
