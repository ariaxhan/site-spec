import { z } from "zod";
import { factField, copyField } from "../../../fields";
import { assetRef } from "../../../schema/asset";
import { defineSection } from "../../../schema/section";
import { ui } from "../../../ui/primitives";

export const galleryContent = z.object({
  heading: copyField.optional(),
  images: z
    .array(z.object({ ref: assetRef, alt: factField(z.string()) }))
    .min(1),
});
export type GalleryContent = z.infer<typeof galleryContent>;

export const gallery = defineSection<GalleryContent>({
  type: "gallery",
  version: "0-1-0",
  content: galleryContent,
  render(c, ctx) {
    const imgs = c.images.map((im) => ui.image(im.ref, im.alt.value, ctx)).join("");
    const h = c.heading ? ui.heading(2, c.heading.value) : "";
    return `${h}<div class="gallery">${imgs}</div>`;
  },
});
