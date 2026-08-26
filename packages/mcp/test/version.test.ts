import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VERSION } from "../src/version";

describe("server version", () => {
  it("matches package.json, so MCP clients never see a stale version", () => {
    const pkg = JSON.parse(
      readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
    ) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });
});
