import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { auditFiles, fixFiles } from "@site-spec/core";
import type { AuditReport, FixResult } from "@site-spec/core";
import { readSiteDir } from "../site-dir";
import { fetchSite } from "../fetch-site";

/**
 * fix = audit, then repair the mechanical findings and flag the rest. Never
 * destructive by default: the corrected files land in a NEW output directory.
 * Overwriting in place requires an explicit --write (dir mode only, a remote
 * server cannot be written back to).
 */
export async function runFix(opts: {
  target: string;
  isUrl: boolean;
  out?: string;
  write?: boolean;
  maxPages?: number;
}): Promise<{ result: FixResult; report: AuditReport; wrote: string[]; outDir?: string }> {
  if (opts.write && opts.isUrl) {
    throw new Error("--write cannot be used in URL mode: a remote server is not writable. Omit --write to save fixes to an output directory.");
  }

  let files: Record<string, string | null>;
  let pageUrls: Record<string, string> = {};
  if (opts.isUrl) {
    const crawl = await fetchSite(opts.target, {
      ...(opts.maxPages !== undefined ? { maxPages: opts.maxPages } : {}),
    });
    files = crawl.files;
    pageUrls = crawl.pageUrls;
  } else {
    files = readSiteDir(opts.target);
  }

  const report = auditFiles({
    files,
    ...(opts.isUrl ? { mode: "generic" as const } : {}),
    linkChecks: !opts.isUrl,
  });
  const result = fixFiles({ files, report, pageUrls });

  // changed = content differs from the original, or a newly-created file.
  const changed = Object.keys(result.files)
    .filter((key) => {
      const next = result.files[key];
      if (typeof next !== "string") return false;
      return !(key in files) || files[key] !== next;
    })
    .sort();

  const wrote: string[] = [];
  if (opts.write && !opts.isUrl) {
    const root = resolve(process.cwd(), opts.target);
    for (const key of changed) {
      const dest = join(root, key);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, result.files[key] as string, "utf8");
      wrote.push(key);
    }
    return { result, report, wrote };
  }

  const outDir = resolve(process.cwd(), opts.out ?? "./site-spec-fix");
  for (const key of changed) {
    const dest = join(outDir, key);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, result.files[key] as string, "utf8");
    wrote.push(key);
  }
  return { result, report, wrote, outDir };
}
