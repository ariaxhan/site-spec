import { z } from "zod";
import { factField, copyField } from "../../../fields";
import { assetRef } from "../../../schema/asset";
import { defineSection } from "../../../schema/section";
import { ui } from "../../../ui/primitives";

export const heroContent = z.object({
  businessName: factField(z.string()),
  headline: copyField,
  subhead: copyField,
  background: assetRef.optional(),
  // href is structural navigation (anchor / tel: / external link), not a Brief
  // fact and not creative copy — so it is a plain validated string.
  cta: z.object({ label: copyField, href: z.string() }).optional(),
  /** Layout variant: centered copy, or copy beside the media column. */
  variant: z.enum(["centered", "split"]).default("centered"),
});
export type HeroContent = z.infer<typeof heroContent>;

export const hero = defineSection<HeroContent>({
  type: "hero",
  version: "0-1-0",
  content: heroContent,
  render(c, ctx) {
    // hero background is the LCP image: never lazy (ui.image priority variant)
    const img = c.background ? ui.image(c.background, c.businessName.value, ctx, { priority: true }) : "";
    const cta = c.cta ? ui.cta(c.cta.label.value, c.cta.href) : "";
    const copyBlock = `${ui.heading(1, c.businessName.value)}${ui.tagline(c.headline.value)}${ui.text(c.subhead.value)}${cta}`;
    if (c.variant === "split") {
      // media column is omitted entirely when there is no image — the copy
      // column must stand alone (graceful degradation).
      return `<div class="hero-split"><div>${copyBlock}</div>${img ? `<div>${img}</div>` : ""}</div>`;
    }
    return `${img}${copyBlock}`;
  },
});
