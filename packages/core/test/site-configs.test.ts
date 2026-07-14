import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSite } from "../src/build/build-site";
import { getPack } from "../src/packs/registry";
import { demoSpec, demoBrief, demoSite } from "./fixtures/restaurant";
import { cateringSpec, cateringBrief, cateringSite, cateringFoundation } from "./fixtures/catering";

/**
 * sites/*.config.mjs are the CLI-facing demo configs: pure data, pack by id,
 * zero imports, the shape agents author. The TS fixtures stay canonical;
 * these configs are GENERATED from them (UPDATE_CONFIGS=1) and this test pins
 * config → buildSite output against the committed golden dirs, so the two
 * copies can never drift silently.
 */
const CONFIGS = [
  {
    file: "sites/restaurant/site.config.mjs",
    goldenDir: "examples/restaurant-site",
    config: {
      pack: "restaurant",
      target: "cloudflare",
      spec: demoSpec,
      brief: demoBrief,
      site: demoSite,
    },
  },
  {
    file: "sites/catering/site.config.mjs",
    goldenDir: "examples/catering-site",
    config: {
      pack: "catering",
      target: "cloudflare",
      spec: cateringSpec,
      brief: cateringBrief,
      site: cateringSite,
      foundation: cateringFoundation,
    },
  },
] as const;

const update = process.env["UPDATE_CONFIGS"] === "1";

function serialize(config: unknown): string {
  return (
    `// GENERATED from packages/core/test/fixtures, do not hand-edit.\n` +
    `// Regenerate: UPDATE_CONFIGS=1 npx vitest run packages/core/test/site-configs.test.ts\n` +
    `// Shape: pure data, pack referenced by id. This is what agents author.\n` +
    `export default ${JSON.stringify(config, null, 2)};\n`
  );
}

for (const entry of CONFIGS) {
  describe(`config: ${entry.file}`, () => {
    const abs = resolve(process.cwd(), entry.file);

    if (update) {
      it("regenerates from the TS fixture (UPDATE_CONFIGS=1)", () => {
        mkdirSync(resolve(abs, ".."), { recursive: true });
        writeFileSync(abs, serialize(entry.config), "utf8");
        expect(existsSync(abs)).toBe(true);
      });
      return;
    }

    it("exists, is pure data, and rebuilds the golden byte-for-byte", async () => {
      expect(existsSync(abs), `missing, run UPDATE_CONFIGS=1`).toBe(true);
      const loaded = (await import(abs)).default as {
        pack: string;
        spec: unknown;
        brief: unknown;
        site: unknown;
        foundation?: unknown;
      };
      const files = buildSite({
        spec: loaded.spec as never,
        pack: getPack(loaded.pack),
        brief: loaded.brief as never,
        site: loaded.site,
        ...(loaded.foundation !== undefined ? { foundation: loaded.foundation } : {}),
      });
      for (const [name, content] of Object.entries(files)) {
        const goldenPath = resolve(process.cwd(), entry.goldenDir, name);
        expect(existsSync(goldenPath), `${entry.goldenDir}/${name} missing`).toBe(true);
        expect(content, name).toBe(readFileSync(goldenPath, "utf8"));
      }
    });
  });
}
