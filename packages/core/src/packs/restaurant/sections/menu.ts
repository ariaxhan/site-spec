import { z } from "zod";
import { factField, copyField } from "../../../fields";
import { defineSection } from "../../../schema/section";
import { ui } from "../../../ui/primitives";
import { escapeHtml } from "../../../ui/escape";

export const menuContent = z.object({
  heading: copyField,
  categories: z
    .array(
      z.object({
        name: factField(z.string()),
        items: z
          .array(
            z.object({
              name: factField(z.string()),
              description: copyField.optional(),
              price: factField(z.string()),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});
export type MenuContent = z.infer<typeof menuContent>;

export const menu = defineSection<MenuContent>({
  type: "menu",
  version: "0-1-0",
  content: menuContent,
  render(c) {
    const cats = c.categories
      .map((cat) => {
        const items = cat.items
          .map((it) => {
            const desc = it.description ? `<span class="item-desc">${escapeHtml(it.description.value)}</span>` : "";
            return `<li><span class="item-name">${escapeHtml(it.name.value)}</span><span class="item-price">${escapeHtml(it.price.value)}</span>${desc}</li>`;
          })
          .join("");
        return `${ui.heading(3, cat.name.value)}<ul class="menu-items">${items}</ul>`;
      })
      .join("");
    return `${ui.heading(2, c.heading.value)}${cats}`;
  },
});
