import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditFiles } from "@site-spec/core";
import type { AuditReport } from "@site-spec/core";
import { readSiteDir } from "../site-dir";

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
