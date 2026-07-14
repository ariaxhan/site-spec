import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSite } from "../src/build/build-site";
import { restaurantPack } from "../src/packs/restaurant";
import { cateringPack } from "../src/packs/catering";
import { demoSpec, demoBrief, demoSite } from "./fixtures/restaurant";
import { cateringSpec, cateringBrief, cateringSite, cateringFoundation } from "./fixtures/catering";

/**
 * Golden test for the full deployable output (M8 gate).
 *
 * The committed examples/ sites ARE the golden fixtures. Any change to the
 * renderer, SEO surface, or build layer must reproduce them byte-for-byte —
 * determinism enforced structurally, not by documentation (D5).
 *
 * Two verticals are pinned: the placeholder-theme restaurant site and the
 * bilingual catering site. Together they exercise the building-block promise —
 * different packs and themes, both deterministic.
 *
 * Intentional output changes: run `npm run example` (UPDATE_GOLDEN=1) to
 * regenerate, then review the diff in git like any other code change.
 */
const GOLDENS = [
  { dir: "examples/restaurant-site", spec: demoSpec, pack: restaurantPack, brief: demoBrief, site: demoSite, manifest: undefined },
  { dir: "examples/catering-site", spec: cateringSpec, pack: cateringPack, brief: cateringBrief, site: cateringSite, manifest: undefined, foundation: cateringFoundation },
] as const;

const update = process.env["UPDATE_GOLDEN"] === "1";

for (const golden of GOLDENS) {
  describe(`golden: ${golden.dir} matches buildSite output`, () => {
    const goldenDir = resolve(process.cwd(), golden.dir);
    const files = buildSite({
      spec: golden.spec,
      pack: golden.pack,
      brief: golden.brief,
      site: golden.site,
      ...(golden.manifest ? { manifest: golden.manifest } : {}),
      ...("foundation" in golden ? { foundation: golden.foundation } : {}),
    });

    if (update) {
      it("regenerates the golden site (UPDATE_GOLDEN=1)", () => {
        mkdirSync(goldenDir, { recursive: true });
        for (const [name, content] of Object.entries(files)) {
          writeFileSync(resolve(goldenDir, name), content, "utf8");
        }
        expect(Object.keys(files).length).toBeGreaterThan(0);
      });
      return;
    }

    for (const [name, content] of Object.entries(files)) {
      it(`${name} is byte-identical to the committed golden file`, () => {
        const goldenPath = resolve(goldenDir, name);
        expect(existsSync(goldenPath), `${name} missing — run \`npm run example\``).toBe(true);
        expect(content).toBe(readFileSync(goldenPath, "utf8"));
      });
    }
  });
}
