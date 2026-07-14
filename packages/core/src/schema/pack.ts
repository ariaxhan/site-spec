import type { SchemaVer } from "../version";
import type { Theme } from "./theme";
import type { SectionModule } from "./section";

/**
 * A Pack is the design system + section library for one vertical (e.g.
 * restaurant). All vertical intelligence lives here; the engine stays generic.
 * The pack's `theme` is what a designer authors in Canva and we translate once.
 */
export interface Pack {
  id: string;
  version: SchemaVer;
  name: string;
  theme: Theme;
  /** section type -> module. `unknown` content keeps the registry heterogeneous. */
  sections: Record<string, SectionModule<unknown>>;
  /**
   * The pack's designed stylesheet, appended after the base CSS. First-party,
   * versioned code — never model-generated. This is where a translated design
   * system's full visual fidelity lives; theme tokens alone are for the
   * generic layer.
   */
  css?: string;
  /**
   * Optional behavior script (e.g. mobile drawer, mailto quote form). Must be
   * deterministic, network-free, and degrade gracefully without JS (7-C).
   */
  script?: string;
}

export function definePack(pack: Pack): Pack {
  return pack;
}

/** Register typed SectionModules into a pack registry, erasing their content types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous registry
export function registerSections(
  modules: ReadonlyArray<SectionModule<any>>,
): Record<string, SectionModule<unknown>> {
  const registry: Record<string, SectionModule<unknown>> = {};
  for (const mod of modules) {
    registry[mod.type] = mod as SectionModule<unknown>;
  }
  return registry;
}
