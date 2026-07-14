import type { Pack } from "../schema/pack";
import { restaurantPack } from "./restaurant";
import { cateringPack } from "./catering";

/**
 * Pack registry, lets a config reference a pack by id ("pack": "catering")
 * instead of importing code. This is what keeps site.config files pure data:
 * an agent can author one without a TypeScript toolchain in the loop.
 */
export const packRegistry: Readonly<Record<string, Pack>> = Object.freeze({
  [restaurantPack.id]: restaurantPack,
  [cateringPack.id]: cateringPack,
});

export function getPack(id: string): Pack {
  const pack = packRegistry[id];
  if (!pack) {
    throw new Error(
      `Unknown pack "${id}". Registered packs: ${Object.keys(packRegistry).sort().join(", ")}.`,
    );
  }
  return pack;
}
