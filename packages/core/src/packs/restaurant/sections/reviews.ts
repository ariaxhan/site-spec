import { z } from "zod";
import { factField, copyField } from "../../../fields";
import { defineSection } from "../../../schema/section";
import { ui } from "../../../ui/primitives";
import { escapeHtml } from "../../../ui/escape";

export const reviewsContent = z.object({
  heading: copyField,
  items: z
    .array(
      z.object({
        author: factField(z.string()),
        rating: factField(z.number().min(0).max(5)),
        text: factField(z.string()),
        source: factField(z.string()),
      }),
    )
    .min(1),
});
export type ReviewsContent = z.infer<typeof reviewsContent>;

export const reviews = defineSection<ReviewsContent>({
  type: "reviews",
  version: "0-1-0",
  content: reviewsContent,
  render(c) {
    const items = c.items
      .map(
        (r) =>
          `<blockquote class="review"><p>${escapeHtml(r.text.value)}</p><cite>${escapeHtml(r.author.value)} · ${escapeHtml(String(r.rating.value))}★</cite></blockquote>`,
      )
      .join("");
    return `${ui.heading(2, c.heading.value)}<div class="reviews">${items}</div>`;
  },
});
