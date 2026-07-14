import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditFiles } from "@site-spec/core";
import type { AuditReport } from "@site-spec/core";
import { readSiteDir } from "../site-dir";
import { fetchSite } from "../fetch-site";

/** audit = read the directory, run the pure engine, hand back the report. */
export function runAudit(opts: {
  dir: string;
  factsPath?: string;
  mode?: "strict" | "generic";
}): AuditReport {
  const files = readSiteDir(opts.dir);
  const facts = opts.factsPath
    ? (JSON.parse(readFileSync(resolve(process.cwd(), opts.factsPath), "utf8")) as unknown)
    : undefined;
  return auditFiles({
    files,
    ...(opts.mode ? { mode: opts.mode } : {}),
    ...(facts !== undefined ? { facts } : {}),
  });
}

/** audit a live URL = crawl it, then run the pure engine with link-presence
 *  checks disabled (a partial crawl cannot prove a resource is absent). */
export async function runAuditUrl(opts: {
  url: string;
  maxPages?: number;
  mode?: "strict" | "generic";
}): Promise<{
  report: AuditReport;
  meta: { origin: string; startUrl: string; fetched: string[]; errors: string[] };
}> {
  const { files, meta } = await fetchSite(opts.url, {
    ...(opts.maxPages !== undefined ? { maxPages: opts.maxPages } : {}),
  });
  const report = auditFiles({ files, mode: opts.mode ?? "generic", linkChecks: false });
  return { report, meta };
}
