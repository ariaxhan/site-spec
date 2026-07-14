import type { AuditReport } from "./audit";

/**
 * Render an AuditReport as a shareable Markdown document. Pure + deterministic:
 * same report → byte-identical output, no fs, no clock. The CLI writes the
 * string to disk; this module only formats.
 */

export interface AuditMarkdownOptions {
  /** what was audited (dir path or URL), shown in the summary */
  target?: string;
  /** document title (default: "site-spec audit report") */
  title?: string;
}

const esc = (s: string): string => s.replace(/([\\`*_{}[\]()#+\-.!|])/g, "\\$1");

function renderGroup(title: string, findings: AuditReport["findings"]): string {
  if (findings.length === 0) return "";
  let out = `## ${title} (${findings.length})\n\n`;
  for (const f of findings) {
    out += `- **${esc(f.checkId)}**${f.file ? ` — \`${f.file}\`` : ""}\n`;
    out += `  - ${esc(f.message)}\n`;
    if (f.fix) out += `  - fix: ${esc(f.fix)}\n`;
  }
  return out + "\n";
}

export function renderAuditMarkdown(
  report: AuditReport,
  opts: AuditMarkdownOptions = {},
): string {
  const title = opts.title ?? "site-spec audit report";
  const errors = report.findings.filter((f) => f.severity === "error");
  const warnings = report.findings.filter((f) => f.severity === "warning");

  let out = `# ${title}\n\n`;
  out += `## Summary\n\n`;
  if (opts.target) out += `- target: ${opts.target}\n`;
  out += `- mode: ${report.mode}\n`;
  out += `- pages: ${report.pages.length}\n`;
  out += `- errors: ${report.errors}\n`;
  out += `- warnings: ${report.warnings}\n`;
  out += `- result: ${report.ok ? "PASS" : "FAIL"}\n\n`;

  out += renderGroup("Errors", errors);
  out += renderGroup("Warnings", warnings);

  if (errors.length === 0 && warnings.length === 0) out += `No findings.\n`;

  return out.replace(/\n+$/, "\n");
}
