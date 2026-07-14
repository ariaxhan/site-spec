import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildHandoff, getPack } from "@site-spec/core";
import type { Brief, SiteSpec } from "@site-spec/core";
import { loadConfig } from "../config";

/** handoff = emit the frontend-agent contract as JSON (stdout or --out file). */
export async function runHandoff(opts: {
  configPath: string;
  out?: string;
}): Promise<{ json: string; outFile?: string }> {
  const { config } = await loadConfig(opts.configPath);
  const doc = buildHandoff({
    spec: config.spec as SiteSpec,
    pack: getPack(config.pack),
    brief: config.brief as Brief,
    site: config.site,
    ...(config.foundation !== undefined ? { foundation: config.foundation } : {}),
    ...(config.target ? { target: config.target } : {}),
  });
  const json = JSON.stringify(doc, null, 2) + "\n";
  if (opts.out) {
    const outFile = resolve(process.cwd(), opts.out);
    mkdirSync(resolve(outFile, ".."), { recursive: true });
    writeFileSync(outFile, json, "utf8");
    return { json, outFile };
  }
  return { json };
}
