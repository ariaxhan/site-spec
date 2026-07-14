import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSite, getPack, validateSiteSpec } from "@site-spec/core";
import type { Finding, SiteSpec, Brief } from "@site-spec/core";
import { loadConfig } from "../config";

export interface BuildResult {
  ok: boolean;
  outDir: string;
  written: string[];
  copied: string[];
  findings: Finding[];
}

/**
 * build = validate (spec tier) → compile → validate again (rendered tier) →
 * write. Error findings at either tier abort before anything is written:
 * an invalid site never reaches disk.
 */
export async function runBuild(opts: {
  configPath: string;
  out: string;
  target?: "cloudflare" | "netlify" | "vercel" | "static";
}): Promise<BuildResult> {
  const { config, dir } = await loadConfig(opts.configPath);
  const pack = getPack(config.pack);
  const outDir = resolve(process.cwd(), opts.out);

  const specTier = validateSiteSpec({
    spec: config.spec,
    pack,
    brief: config.brief as Brief,
  });
  if (!specTier.ok) {
    return { ok: false, outDir, written: [], copied: [], findings: specTier.findings };
  }

  const files = buildSite({
    spec: config.spec as SiteSpec,
    pack,
    brief: config.brief as Brief,
    site: config.site,
    ...(config.foundation !== undefined ? { foundation: config.foundation } : {}),
    ...(opts.target ?? config.target
      ? { target: (opts.target ?? config.target)! }
      : {}),
  });

  const renderedTier = validateSiteSpec({
    spec: config.spec,
    pack,
    brief: config.brief as Brief,
    html: files["index.html"]!,
  });
  if (!renderedTier.ok) {
    return { ok: false, outDir, written: [], copied: [], findings: renderedTier.findings };
  }

  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(resolve(outDir, name), content, "utf8");
    written.push(name);
  }

  const copied: string[] = [];
  for (const [from, to] of config.copy ?? []) {
    const src = resolve(dir, from);
    const dest = resolve(outDir, to);
    cpSync(src, dest, { recursive: true });
    copied.push(`${to}/`);
  }

  return { ok: true, outDir, written: written.sort(), copied, findings: renderedTier.findings };
}
