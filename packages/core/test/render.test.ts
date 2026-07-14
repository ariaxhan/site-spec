import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { render } from "../src/render/render";
import { validateSiteSpec } from "../src/validate/validate";
import { restaurantPack } from "../src/packs/restaurant";
import { demoSpec, demoSpecAlt, demoBrief, demoSite } from "./fixtures/restaurant";

describe("building blocks — theme x variant x tone recombination", () => {
  const html = render({ spec: demoSpecAlt, pack: restaurantPack, brief: demoBrief, site: demoSite });

  it("renders the same content under a different theme, variant, and tones", () => {
    expect(html).toContain('class="hero-split"');
    expect(html).toContain('<section id="reviews" class="tone-band">');
    expect(html).toContain('<section id="menu" class="tone-surface">');
    expect(html).toContain("--band-bg:#296249");
    expect(html).toContain("--radius-control:50px");
    expect((html.match(/<h1>/g) ?? []).length).toBe(1);
  });

  it("split hero with no image omits the media column entirely", () => {
    expect(html).not.toContain("<img");
    expect(html.match(/hero-split"><div>/)).toBeTruthy();
  });

  it("still passes every policy the centered/placeholder combination passes", () => {
    const result = validateSiteSpec({
      spec: demoSpecAlt,
      pack: restaurantPack,
      brief: demoBrief,
      html,
    });
    expect(result.findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("render", () => {
  it("produces a complete HTML document with the single H1", () => {
    const html = render({ spec: demoSpec, pack: restaurantPack });
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>Rosalia&#39;s Kitchen — Italian in Sunnyvale</title>");
    expect((html.match(/<h1>/g) ?? []).length).toBe(1);
    expect(html).toContain("Rosalia&#39;s Kitchen");
    expect(html).toContain("Cacio e Pepe");
  });

  it("is deterministic — same input, byte-identical output", () => {
    const a = render({ spec: demoSpec, pack: restaurantPack });
    const b = render({ spec: demoSpec, pack: restaurantPack });
    expect(a).toBe(b);
  });

  it("escapes a malicious copy value (no XSS leak)", () => {
    const evil = structuredClone(demoSpec);
    (evil.sections[0]!.content as { headline: { value: string } }).headline.value =
      '<img src=x onerror=alert(1)>';
    const html = render({ spec: evil, pack: restaurantPack });
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("renders a tel: link but would neutralize a javascript: href", () => {
    const html = render({ spec: demoSpec, pack: restaurantPack });
    expect(html).toContain('href="tel:+14085550142"');
    expect(html).not.toContain("javascript:");
  });
});
