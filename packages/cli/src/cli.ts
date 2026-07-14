import { parseArgs } from "node:util";
import { runBuild } from "./commands/build";
import { runAudit } from "./commands/audit";
import { runHandoff } from "./commands/handoff";
import type { AuditFinding, Finding } from "@site-spec/core";

/**
 * site-spec, thin internal front door for @site-spec/core.
 * All real behavior lives in the library; this file parses args, prints,
 * and sets exit codes. Nothing here is worth importing.
 */

const HELP = `site-spec, the anti-slop website foundation compiler (internal)

Usage:
  site-spec build   <site.config.mjs> --out <dir> [--target cloudflare|netlify|vercel|static]
  site-spec audit   <dir> [--facts brief.json] [--mode strict|generic] [--json]
  site-spec handoff <site.config.mjs> [--out handoff.json]

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
        json: { type: "boolean" },
      },
    });
    const dir = positionals[0];
    if (!dir) {
      console.error("usage: site-spec audit <dir> [--facts brief.json] [--mode strict|generic] [--json]");
      return 1;
    }
    const report = runAudit({
      dir,
      ...(values.facts ? { factsPath: values.facts } : {}),
      ...(values.mode ? { mode: values.mode as "strict" | "generic" } : {}),
    });
    if (values.json) {
      console.log(JSON.stringify(report, null, 2));
      return report.ok ? 0 : 1;
    }
    console.log(
      `audit ${dir}, mode: ${report.mode}, pages: ${report.pages.length}, ` +
        `errors: ${report.errors}, warnings: ${report.warnings}`,
    );
    printAuditFindings(report.findings);
    console.log(report.ok ? `\n✓ PASS, no errors` : `\n✗ FAIL, ${report.errors} error(s)`);
    return report.ok ? 0 : 1;
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
