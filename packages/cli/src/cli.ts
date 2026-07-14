import { parseArgs } from "node:util";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runBuild } from "./commands/build";
import { runAudit, runAuditUrl } from "./commands/audit";
import { runFix } from "./commands/fix";
import { runHandoff } from "./commands/handoff";
import { renderAuditMarkdown } from "@site-spec/core";
import type { AuditFinding, AuditReport, Finding, FixAction } from "@site-spec/core";

/** URL detection shared by audit + fix: explicit http(s), or a bare domain
 *  that is not a local path. */
function detectUrl(target: string): boolean {
  return (
    /^https?:\/\//i.test(target) ||
    (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(target) && !existsSync(target))
  );
}

/**
 * site-spec, thin internal front door for @site-spec/core.
 * All real behavior lives in the library; this file parses args, prints,
 * and sets exit codes. Nothing here is worth importing.
 */

const HELP = `site-spec, the website foundation auditor — check any site's AI searchability, SEO, structured data, accessibility, and privacy

Usage:
  site-spec build   <site.config.mjs> --out <dir> [--target cloudflare|netlify|vercel|static]
  site-spec audit   <dir|url> [--max N] [--facts brief.json] [--mode strict|generic] [--report file.md] [--json]
  site-spec fix     <dir|url> [--out dir] [--write] [--max N] [--json]
  site-spec handoff <site.config.mjs> [--out handoff.json]

fix repairs the mechanical audit findings (into ./site-spec-fix by default,
or in place with --write for a local dir) and flags what needs a human.

A site config is pure data: { pack: "<id>", spec, brief, site, foundation?, copy? }.
Demo configs live in sites/.
`;

function printPolicyFindings(findings: Finding[]): void {
  for (const f of findings) {
    const tag = f.severity === "error" ? "ERROR" : f.severity === "warning" ? "warn " : "info ";
    console.error(`  ${tag} ${f.policyId}  ${f.message}`);
  }
}

function printAuditFindings(findings: AuditFinding[]): void {
  const bySeverity = [...findings].sort((a, b) => a.severity.localeCompare(b.severity));
  for (const f of bySeverity) {
    const tag = f.severity === "error" ? "ERROR" : "warn ";
    const loc = f.file ? ` [${f.file}]` : "";
    console.error(`  ${tag} ${f.checkId}${loc}`);
    console.error(`        ${f.message}`);
    if (f.fix) console.error(`        fix: ${f.fix}`);
  }
}

function printFixSection(title: string, actions: FixAction[]): void {
  if (actions.length === 0) return;
  console.log(`${title} (${actions.length})`);
  for (const a of actions) {
    console.log(`  ${a.checkId}  ${a.file} — ${a.detail}`);
  }
}

async function main(): Promise<number> {
  const [verb, ...rest] = process.argv.slice(2);

  if (!verb || verb === "--help" || verb === "-h" || verb === "help") {
    console.log(HELP);
    return verb ? 0 : 1;
  }

  if (verb === "build") {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: { out: { type: "string" }, target: { type: "string" } },
    });
    const configPath = positionals[0];
    if (!configPath || !values.out) {
      console.error("usage: site-spec build <site.config.mjs> --out <dir> [--target t]");
      return 1;
    }
    const result = await runBuild({
      configPath,
      out: values.out,
      ...(values.target ? { target: values.target as never } : {}),
    });
    if (!result.ok) {
      console.error(`✗ build blocked, the spec does not validate; nothing written.`);
      printPolicyFindings(result.findings);
      return 1;
    }
    console.log(`✓ built ${result.outDir}`);
    for (const f of result.written) console.log(`  ${f}`);
    for (const c of result.copied) console.log(`  ${c} (copied)`);
    const warnings = result.findings.filter((f) => f.severity !== "error");
    if (warnings.length) printPolicyFindings(warnings);
    console.log(`\nnext: site-spec audit ${result.outDir}`);
    return 0;
  }

  if (verb === "audit") {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        facts: { type: "string" },
        mode: { type: "string" },
        max: { type: "string" },
        report: { type: "string" },
        json: { type: "boolean" },
      },
    });
    const target = positionals[0];
    if (!target) {
      console.error(
        "usage: site-spec audit <dir|url> [--max N] [--facts brief.json] [--mode strict|generic] [--report file.md] [--json]",
      );
      return 1;
    }

    const isUrl = detectUrl(target);

    const writeReport = (report: AuditReport): void => {
      if (!values.report) return;
      const path = resolve(process.cwd(), values.report);
      writeFileSync(path, renderAuditMarkdown(report, { target }), "utf8");
      console.log(`wrote report to ${path}`);
    };

    if (isUrl) {
      const maxPages = values.max !== undefined ? Number.parseInt(values.max, 10) : undefined;
      const { report, meta } = await runAuditUrl({
        url: target,
        ...(maxPages !== undefined && Number.isFinite(maxPages) ? { maxPages } : {}),
        ...(values.mode ? { mode: values.mode as "strict" | "generic" } : {}),
      });
      writeReport(report);
      if (values.json) {
        console.log(JSON.stringify({ report, meta }, null, 2));
        return report.ok ? 0 : 1;
      }
      console.log(
        `audit ${meta.origin} (live), pages crawled: ${report.pages.length}, ` +
          `errors: ${report.errors}, warnings: ${report.warnings}`,
      );
      printAuditFindings(report.findings);
      if (meta.errors.length) {
        console.log(`\nnotes:`);
        for (const note of meta.errors) console.log(`  - ${note}`);
      }
      console.log(report.ok ? `\n✓ PASS, no errors` : `\n✗ FAIL, ${report.errors} error(s)`);
      return report.ok ? 0 : 1;
    }

    const report = runAudit({
      dir: target,
      ...(values.facts ? { factsPath: values.facts } : {}),
      ...(values.mode ? { mode: values.mode as "strict" | "generic" } : {}),
    });
    writeReport(report);
    if (values.json) {
      console.log(JSON.stringify(report, null, 2));
      return report.ok ? 0 : 1;
    }
    console.log(
      `audit ${target}, mode: ${report.mode}, pages: ${report.pages.length}, ` +
        `errors: ${report.errors}, warnings: ${report.warnings}`,
    );
    printAuditFindings(report.findings);
    console.log(report.ok ? `\n✓ PASS, no errors` : `\n✗ FAIL, ${report.errors} error(s)`);
    return report.ok ? 0 : 1;
  }

  if (verb === "fix") {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        out: { type: "string" },
        write: { type: "boolean" },
        max: { type: "string" },
        json: { type: "boolean" },
      },
    });
    const target = positionals[0];
    if (!target) {
      console.error("usage: site-spec fix <dir|url> [--out dir] [--write] [--max N] [--json]");
      return 1;
    }

    const isUrl = detectUrl(target);
    if (values.write && isUrl) {
      console.error("--write cannot be used in URL mode: a remote server is not writable. Omit --write to save fixes to an output directory.");
      return 1;
    }
    const maxPages = values.max !== undefined ? Number.parseInt(values.max, 10) : undefined;

    const { result, report, wrote, outDir } = await runFix({
      target,
      isUrl,
      ...(values.out ? { out: values.out } : {}),
      ...(values.write ? { write: true } : {}),
      ...(maxPages !== undefined && Number.isFinite(maxPages) ? { maxPages } : {}),
    });

    if (values.json) {
      console.log(JSON.stringify({ report, actions: result.actions, wrote }, null, 2));
      return 0;
    }

    const fixed = result.actions.filter((a) => a.status === "fixed");
    const scaffolded = result.actions.filter((a) => a.status === "scaffolded");
    const manual = result.actions.filter((a) => a.status === "manual");
    printFixSection("✓ Fixed automatically", fixed);
    if (fixed.length && (scaffolded.length || manual.length)) console.log("");
    printFixSection("✎ Scaffolded — needs your facts", scaffolded);
    if (scaffolded.length && manual.length) console.log("");
    printFixSection("⚠ Needs manual attention", manual);

    console.log(
      `\nfixed ${fixed.length}, scaffolded ${scaffolded.length}, manual ${manual.length}`,
    );
    if (outDir) console.log(`wrote ${wrote.length} file(s) to ${outDir}`);
    else console.log(`updated ${wrote.length} file(s) in place`);
    return 0;
  }

  if (verb === "handoff") {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: { out: { type: "string" } },
    });
    const configPath = positionals[0];
    if (!configPath) {
      console.error("usage: site-spec handoff <site.config.mjs> [--out handoff.json]");
      return 1;
    }
    const result = await runHandoff({
      configPath,
      ...(values.out ? { out: values.out } : {}),
    });
    if (result.outFile) console.log(`✓ wrote ${result.outFile}`);
    else console.log(result.json);
    return 0;
  }

  console.error(`unknown verb: ${verb}\n`);
  console.log(HELP);
  return 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`site-spec: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  },
);
