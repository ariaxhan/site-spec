import { factsGroundedPolicy } from "./facts-grounded";
import { requiredMetaPolicy, oneH1Policy } from "./structural";
import { seoPolicies } from "./seo";
import type { Policy } from "../schema/policy";

export { factsGroundedPolicy } from "./facts-grounded";
export { requiredMetaPolicy, oneH1Policy } from "./structural";
export * from "./seo";

/**
 * The baseline offline policy set run by `validateSiteSpec`. Rendered-tier SEO
 * policies only fire when the validator is given the rendered HTML.
 */
export const defaultPolicies: Policy[] = [
  requiredMetaPolicy,
  oneH1Policy,
  factsGroundedPolicy,
  ...seoPolicies,
];
