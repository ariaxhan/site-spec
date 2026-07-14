import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * A site config is PURE DATA: pack referenced by id, spec/brief/site as plain
 * objects, no imports. `.mjs` (default-export) or `.json`. This is the shape
 * agents author, no TypeScript toolchain in the loop.
 */
export interface SiteConfig {
  pack: string;
  spec: unknown;
  brief: unknown;
  site: unknown;
  foundation?: unknown;
  target?: "cloudflare" | "netlify" | "vercel" | "static";
  /** [from, to] pairs of static assets to copy into the output, relative to the config file */
  copy?: Array<[string, string]>;
}

export async function loadConfig(path: string): Promise<{ config: SiteConfig; dir: string }> {
  const abs = resolve(process.cwd(), path);
  let raw: unknown;
  if (abs.endsWith(".json")) {
    raw = JSON.parse(await readFile(abs, "utf8"));
  } else if (abs.endsWith(".mjs") || abs.endsWith(".js")) {
    raw = (await import(pathToFileURL(abs).href)).default;
  } else {
    throw new Error(`Unsupported config format: ${path} (use .mjs with a default export, or .json)`);
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${path} must export a config object.`);
  }
  const config = raw as Partial<SiteConfig>;
  for (const key of ["pack", "spec", "brief", "site"] as const) {
    if (config[key] === undefined) {
      throw new Error(`${path} is missing "${key}". A site config needs pack, spec, brief, site.`);
    }
  }
  if (typeof config.pack !== "string") {
    throw new Error(`${path}: "pack" must be a pack id string (e.g. "restaurant").`);
  }
  return { config: config as SiteConfig, dir: resolve(abs, "..") };
}
