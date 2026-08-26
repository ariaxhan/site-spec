import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const TEXT_EXT = /\.(html|css|js|mjs|json|txt|xml|svg|md|webmanifest)$/i;
const TEXT_NAMES = new Set(["_headers", "_redirects"]);

/**
 * Read a static site directory into the audit file map: text files as utf8,
 * binaries as null (their presence still resolves dangling-ref checks).
 */
export function readSiteDir(dir: string): Record<string, string | null> {
  const root = resolve(process.cwd(), dir);
  const files: Record<string, string | null> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      const rel = relative(root, full).split("\\").join("/");
      const isText = TEXT_EXT.test(name) || TEXT_NAMES.has(name);
      files[rel] = isText ? readFileSync(full, "utf8") : null;
    }
  };
  walk(root);
  return files;
}
