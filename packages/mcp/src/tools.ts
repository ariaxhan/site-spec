/**
 * The four site-spec MCP tools, as plain async functions.
 *
 * Every one of these calls the `@site-spec/core` engine directly — no child
 * process, no shelling out to the `site-spec` CLI, no HTTP hop to the hosted
 * worker. The MCP layer in `server.ts` is a thin adapter over this module, so
 * these stay unit-testable without a transport.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  auditFiles,
  buildSite,
  fixFiles,
  getPack,
  packRegistry,
  validateSiteSpec,
  CHECK_CATALOG,
  getCheck,
} from "@site-spec/core";
import type {
  AuditFinding,
  AuditReport,
  Brief,
  CheckDescriptor,
  FixAction,
  SiteSpec,
} from "@site-spec/core";
import { fetchSite, readSiteDir } from "@site-spec/core/io";

// ---------------------------------------------------------------------------
// shared shapes
// ---------------------------------------------------------------------------

/** An audit finding, enriched with what the catalog knows about its check. */
export interface EnrichedFinding extends AuditFinding {
  /** true when `fix_issue` has a repair path for this check id */
  fixAvailable: boolean;
  /** catalog category, e.g. "seo" or "privacy" */
  category: CheckDescriptor["category"] | "unknown";
}

const enrich = (f: AuditFinding): EnrichedFinding => {
  const check = getCheck(f.checkId);
  return {
    ...f,
    fixAvailable: check?.fixable ?? false,
    category: check?.category ?? "unknown",
  };
};

/** A target is a URL when it carries a scheme or looks like a bare hostname. */
export function isUrl(target: string): boolean {
  if (/^[a-z][\w+.-]*:\/\//i.test(target)) return true;
  // bare "example.com" or "example.com/path" — a dot before any slash
  const head = target.split("/")[0] ?? "";
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(head);
}

/** Read a target into the audit file map, live-crawling it when it is a URL. */
async function loadTarget(
  target: string,
  maxPages?: number,
): Promise<{
  files: Record<string, string | null>;
  pageUrls: Record<string, string>;
  live: boolean;
  crawl?: { origin: string; startUrl: string; fetched: string[]; errors: string[] };
}> {
  if (!isUrl(target)) {
    return { files: readSiteDir(target), pageUrls: {}, live: false };
  }
  const { files, pageUrls, meta } = await fetchSite(target, {
    ...(maxPages !== undefined ? { maxPages } : {}),
  });
  return { files, pageUrls, live: true, crawl: meta };
}

// ---------------------------------------------------------------------------
// audit_site
// ---------------------------------------------------------------------------

export interface AuditSiteInput {
  url: string;
  checks?: string[] | undefined;
  maxPages?: number | undefined;
}

export interface AuditSiteOutput {
  ok: boolean;
  target: string;
  mode: AuditReport["mode"];
  live: boolean;
  errors: number;
  warnings: number;
  pages: string[];
  findings: EnrichedFinding[];
  /** check ids in `checks` that the engine does not know about */
  unknownChecks?: string[];
  /** present for a live crawl: what was actually fetched, and any fetch errors */
  crawl?: { origin: string; startUrl: string; fetched: string[]; errors: string[] };
}

/**
 * Audit a live URL (or a local directory of built output) and return every
 * finding, each tagged with its severity, check id, category, and whether
 * `fix_issue` can repair it.
 *
 * Live crawls run with `linkChecks: false` — a capped crawl cannot prove a
 * resource is absent from the server, so presence-dependent checks would
 * manufacture false findings. This mirrors the CLI exactly.
 */
export async function auditSite(input: AuditSiteInput): Promise<AuditSiteOutput> {
  const { files, live, crawl } = await loadTarget(input.url, input.maxPages);

  const report = auditFiles({
    files,
    ...(live ? { mode: "generic" as const } : {}),
    linkChecks: !live,
  });

  let findings = report.findings.map(enrich);
  let unknownChecks: string[] | undefined;

  if (input.checks && input.checks.length > 0) {
    const wanted = new Set(input.checks);
    const known = new Set(CHECK_CATALOG.map((c) => c.id));
    const missing = [...wanted].filter((id) => !known.has(id)).sort();
    if (missing.length > 0) unknownChecks = missing;
    findings = findings.filter((f) => wanted.has(f.checkId));
  }

  return {
    ok: findings.every((f) => f.severity !== "error"),
    target: input.url,
    mode: report.mode,
    live,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    pages: report.pages,
    findings,
    ...(unknownChecks ? { unknownChecks } : {}),
    ...(crawl ? { crawl } : {}),
  };
}

// ---------------------------------------------------------------------------
// fix_issue
// ---------------------------------------------------------------------------

export interface FixIssueInput {
  urlOrPath: string;
  checkId: string;
  /**
   * Write the corrected files to disk. Local paths only — a remote server is
   * not writable, so this is refused in URL mode (same rule as `site-spec fix`).
   */
  write?: boolean | undefined;
  /** Directory to write into. Defaults to overwriting the target directory. */
  outDir?: string | undefined;
  maxPages?: number | undefined;
}

export interface FixIssueDiff {
  file: string;
  /** "created" when the file did not exist before, else "modified" */
  change: "created" | "modified";
  before: string | null;
  after: string;
}

export interface FixIssueOutput {
  checkId: string;
  target: string;
  live: boolean;
  /** false when the check has no repair path at all; nothing was produced */
  fixAvailable: boolean;
  /** findings for this check id that the audit actually raised */
  matchedFindings: EnrichedFinding[];
  actions: FixAction[];
  diffs: FixIssueDiff[];
  /** paths actually written; empty on a dry run */
  written: string[];
  /** where `written` paths are rooted, when anything was written */
  writtenTo?: string;
  note?: string;
}

/**
 * Apply site-spec's existing auto-fix for ONE check id and return the resulting
 * diff (or, with `write`, the files it wrote).
 *
 * Honest about the engine's boundaries: `fixFiles` is pure — it returns a
 * corrected file map and never touches the disk or the network. So a URL target
 * can only ever produce a DIFF, because a remote server is not writable.
 * Writing requires a local directory target and an explicit `write: true`.
 */
export async function fixIssue(input: FixIssueInput): Promise<FixIssueOutput> {
  const check = getCheck(input.checkId);
  if (!check) {
    throw new Error(
      `Unknown check id "${input.checkId}". Call list_checks to see the ${CHECK_CATALOG.length} check ids site-spec knows.`,
    );
  }

  const { files, pageUrls, live } = await loadTarget(input.urlOrPath, input.maxPages);

  if (input.write && live) {
    throw new Error(
      "write is not possible for a URL target: a remote server is not writable. Audit the URL, then run fix_issue against the local directory that produces it.",
    );
  }

  const report = auditFiles({
    files,
    ...(live ? { mode: "generic" as const } : {}),
    linkChecks: !live,
  });

  // Narrow the report to this one check, so fixFiles repairs only what was asked.
  const matched = report.findings.filter((f) => f.checkId === input.checkId);
  const scoped: AuditReport = {
    ...report,
    findings: matched,
    errors: matched.filter((f) => f.severity === "error").length,
    warnings: matched.filter((f) => f.severity === "warning").length,
    ok: matched.every((f) => f.severity !== "error"),
  };

  const result = fixFiles({ files, report: scoped, pageUrls });

  const diffs: FixIssueDiff[] = Object.keys(result.files)
    .sort()
    .flatMap((key) => {
      const after = result.files[key];
      if (typeof after !== "string") return [];
      const existed = key in files;
      const before = existed ? files[key] ?? null : null;
      if (existed && before === after) return [];
      return [{ file: key, change: existed ? ("modified" as const) : ("created" as const), before, after }];
    });

  const written: string[] = [];
  let writtenTo: string | undefined;
  if (input.write) {
    const root = resolve(process.cwd(), input.outDir ?? input.urlOrPath);
    for (const d of diffs) {
      const dest = join(root, d.file);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, d.after, "utf8");
      written.push(d.file);
    }
    writtenTo = root;
  }

  const note =
    matched.length === 0
      ? `The audit raised no "${input.checkId}" findings for this target, so there was nothing to fix.`
      : !check.fixable
        ? `"${input.checkId}" has no automatic repair: it needs a human. See each finding's fix hint.`
        : input.write
          ? undefined
          : "Dry run: nothing was written. Pass write: true with a local directory target to apply these.";

  return {
    checkId: input.checkId,
    target: input.urlOrPath,
    live,
    fixAvailable: check.fixable,
    matchedFindings: matched.map(enrich),
    actions: result.actions,
    diffs,
    written,
    ...(writtenTo !== undefined ? { writtenTo } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

// ---------------------------------------------------------------------------
// compile_spec
// ---------------------------------------------------------------------------

export interface CompileSpecInput {
  /** the pure-data site config: { pack, spec, brief, site, foundation?, target? } */
  business: Record<string, unknown>;
  /** write the compiled site to this directory; omit for an in-memory compile */
  outDir?: string | undefined;
}

export interface CompileSpecOutput {
  ok: boolean;
  pack: string;
  /** the validated SiteSpec, echoed back so the caller can persist it */
  spec?: SiteSpec;
  /** generated file path → content (in-memory; the engine never writes) */
  files?: Record<string, string>;
  findings: unknown[];
  written?: string[];
  writtenTo?: string;
}

/**
 * Compile business data into a validated SiteSpec and the deployable files it
 * renders to: html, sitemap.xml, robots.txt, llms.txt, headers, icons.
 *
 * `business` is site-spec's pure-data site config — the shape agents already
 * author, with the pack referenced by id:
 *
 *   { pack: "restaurant", brief: {...}, site: {...}, spec: {...} }
 *
 * `brief` is the verified business facts (name, category, phone, address,
 * hours, reviews); `spec` is the page structure. Validation runs at both the
 * spec tier and the rendered tier, exactly as `site-spec build` does, so an
 * invalid site never produces output.
 */
export function compileSpec(input: CompileSpecInput): CompileSpecOutput {
  const config = input.business;
  for (const key of ["pack", "spec", "brief", "site"] as const) {
    if (config[key] === undefined) {
      throw new Error(
        `business is missing "${key}". A site config needs pack, spec, brief, site. Registered packs: ${Object.keys(packRegistry).sort().join(", ")}.`,
      );
    }
  }
  if (typeof config["pack"] !== "string") {
    throw new Error(
      `business.pack must be a pack id string. Registered packs: ${Object.keys(packRegistry).sort().join(", ")}.`,
    );
  }

  const packId = config["pack"];
  const pack = getPack(packId);
  const brief = config["brief"] as Brief;

  const specTier = validateSiteSpec({ spec: config["spec"], pack, brief });
  if (!specTier.ok) {
    return { ok: false, pack: packId, findings: specTier.findings };
  }

  const files = buildSite({
    spec: config["spec"] as SiteSpec,
    pack,
    brief,
    site: config["site"],
    ...(config["foundation"] !== undefined ? { foundation: config["foundation"] } : {}),
    ...(config["target"] !== undefined
      ? { target: config["target"] as "cloudflare" | "netlify" | "vercel" | "static" }
      : {}),
  });

  const renderedTier = validateSiteSpec({
    spec: config["spec"],
    pack,
    brief,
    html: files["index.html"]!,
  });
  if (!renderedTier.ok) {
    return { ok: false, pack: packId, findings: renderedTier.findings };
  }

  const out: CompileSpecOutput = {
    ok: true,
    pack: packId,
    spec: config["spec"] as SiteSpec,
    files,
    findings: renderedTier.findings,
  };

  if (input.outDir) {
    const root = resolve(process.cwd(), input.outDir);
    const written: string[] = [];
    for (const [name, content] of Object.entries(files)) {
      const dest = join(root, name);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, content, "utf8");
      written.push(name);
    }
    out.written = written.sort();
    out.writtenTo = root;
  }

  return out;
}

// ---------------------------------------------------------------------------
// list_checks
// ---------------------------------------------------------------------------

export interface ListChecksOutput {
  count: number;
  fixable: number;
  checks: ReadonlyArray<CheckDescriptor>;
}

/** Enumerate every check the audit engine can raise, straight from the catalog. */
export function listChecks(): ListChecksOutput {
  return {
    count: CHECK_CATALOG.length,
    fixable: CHECK_CATALOG.filter((c) => c.fixable).length,
    checks: CHECK_CATALOG,
  };
}
