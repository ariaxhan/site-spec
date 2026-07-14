import { describe, it, expect } from "vitest";
import { validateSiteSpec } from "../src/validate/validate";
import { restaurantPack } from "../src/packs/restaurant";
import { demoSpec, demoBrief } from "./fixtures/restaurant";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

describe("validateSiteSpec", () => {
  it("passes a well-formed, fully-grounded spec", () => {
    const result = validateSiteSpec({ spec: demoSpec, pack: restaurantPack, brief: demoBrief });
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("catches an invented fact (value not matching the Brief)", () => {
    const tampered = clone(demoSpec);
    // hero.businessName now claims a name the Brief never had
    (tampered.sections[0]!.content as { businessName: { value: string } }).businessName.value =
      "Totally Different Diner";
    const result = validateSiteSpec({ spec: tampered, pack: restaurantPack, brief: demoBrief });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.policyId === "grounding/facts-grounded")).toBe(true);
  });

  it("flags a fact citing a Brief path that does not exist", () => {
    const tampered = clone(demoSpec);
    (tampered.sections[0]!.content as { businessName: { source: string } }).businessName.source =
      "business.nope";
    const result = validateSiteSpec({ spec: tampered, pack: restaurantPack, brief: demoBrief });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.messageId === "fact.source-missing")).toBe(true);
  });

  it("requires a non-empty title and description", () => {
    const tampered = clone(demoSpec);
    tampered.meta.title.value = "";
    const result = validateSiteSpec({ spec: tampered, pack: restaurantPack, brief: demoBrief });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.messageId === "meta.title-empty")).toBe(true);
  });

  it("rejects an unknown section type", () => {
    const tampered = clone(demoSpec);
    tampered.sections[1]!.type = "carousel";
    const result = validateSiteSpec({ spec: tampered, pack: restaurantPack, brief: demoBrief });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.policyId === "schema/unknown-section")).toBe(true);
  });

  it("requires exactly one hero (one H1)", () => {
    const tampered = clone(demoSpec);
    tampered.sections.push(clone(tampered.sections[0]!)); // second hero
    const result = validateSiteSpec({ spec: tampered, pack: restaurantPack, brief: demoBrief });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.policyId === "a11y/one-h1")).toBe(true);
  });

  it("rejects a bad SchemaVer before structural checks", () => {
    const tampered = clone(demoSpec) as unknown as { specVersion: string };
    tampered.specVersion = "1.0.0";
    const result = validateSiteSpec({ spec: tampered, pack: restaurantPack, brief: demoBrief });
    expect(result.ok).toBe(false);
  });
});
