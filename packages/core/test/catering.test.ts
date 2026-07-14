import { describe, it, expect } from "vitest";
import { render } from "../src/render/render";
import { validateSiteSpec } from "../src/validate/validate";
import { cateringPack } from "../src/packs/catering";
import { cateringSpec, cateringBrief, cateringSite } from "./fixtures/catering";
import { hansikSpec, hansikBrief, hansikSite } from "./fixtures/hansik";

describe("catering pack generalizes — a second business, zero design work", () => {
  const html = render({ spec: hansikSpec, pack: cateringPack, brief: hansikBrief, site: hansikSite });

  it("renders the business's own identity, never the demo catering brand", () => {
    expect(html).toContain("Hansik House");
    expect(html).not.toContain("Sunny Table");
    expect(html).toContain('href="tel:15550100188"');
    expect(html).toContain("412 Maple St");
  });

  it("degrades gracefully with no photos: placeholder tiles, no broken images", () => {
    expect(html).not.toContain("<img");
    expect(html).toContain("ph-empty");
  });

  it("passes every policy", () => {
    const result = validateSiteSpec({ spec: hansikSpec, pack: cateringPack, brief: hansikBrief, html });
    expect(result.findings.filter((x) => x.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

/**
 * The catering pack renders a full bilingual EN/KR site. These tests pin the
 * structural fidelity points; the byte-exact output lives in the golden suite.
 */
describe("catering pack — full bilingual EN/KR site", () => {
  const html = render({
    spec: cateringSpec,
    pack: cateringPack,
    brief: cateringBrief,
    site: cateringSite,
  });

  it("renders chrome outside <main>: topbar + sticky nav before, footer after", () => {
    const main = html.indexOf("<main");
    expect(html.indexOf('class="util"')).toBeLessThan(main);
    expect(html.indexOf('header class="nav"')).toBeLessThan(main);
    expect(html.indexOf('footer class="ft"')).toBeGreaterThan(html.indexOf("</main>"));
  });

  it("keeps exactly one H1 across the full page", () => {
    expect((html.match(/<h1>/g) ?? []).length).toBe(1);
    expect(html).toContain("Bringing happiness<br>to your table.");
  });

  it("is bilingual with lang switches for Korean text", () => {
    expect(html).toContain('lang="ko"');
    expect(html).toContain("배추김치");
    expect(html).toContain("맞춤형 케이터링");
  });

  it("renders all 12 banchan and 4 services; no manifest -> placeholder tiles, no broken images", () => {
    expect((html.match(/class="bn"/g) ?? []).length).toBe(12);
    expect((html.match(/class="svc"/g) ?? []).length).toBe(4);
    expect(html).not.toContain("<img");
    expect(html).toContain("ph-empty");
  });

  it("wires the business facts: both phones, email, address, map embed", () => {
    expect(html).toContain('href="tel:15550100142"');
    expect(html).toContain('href="tel:15550100143"');
    expect(html).toContain("mailto:hello@sunnytable.example");
    expect(html).toContain("128 Garden Ave");
    expect(html).toContain("https://www.google.com/maps?q=128%20Garden%20Ave");
  });

  it("ships the quote modal addressed to the business email, mailto-powered", () => {
    expect(html).toContain('id="quoteModal"');
    expect(html).toContain('data-email="hello@sunnytable.example"');
    expect(html).toContain("mailto:'+form.getAttribute('data-email')");
  });

  it("passes every policy (facts grounded, SEO, a11y)", () => {
    const result = validateSiteSpec({
      spec: cateringSpec,
      pack: cateringPack,
      brief: cateringBrief,
      html,
    });
    expect(result.findings.filter((x) => x.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
