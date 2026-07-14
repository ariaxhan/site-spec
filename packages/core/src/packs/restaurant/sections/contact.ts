import { z } from "zod";
import { factField, copyField } from "../../../fields";
import { defineSection } from "../../../schema/section";
import { ui } from "../../../ui/primitives";
import { escapeHtml } from "../../../ui/escape";

export const contactContent = z.object({
  heading: copyField,
  address: factField(z.string()).optional(),
  phone: factField(z.string()).optional(),
  email: factField(z.string()).optional(),
  // href is structural navigation, not a Brief fact — a plain validated string.
  cta: z.object({ label: copyField, href: z.string() }).optional(),
});
export type ContactContent = z.infer<typeof contactContent>;

export const contact = defineSection<ContactContent>({
  type: "contact",
  version: "0-1-0",
  content: contactContent,
  render(c) {
    const parts: string[] = [];
    if (c.address) parts.push(`<p class="address">${escapeHtml(c.address.value)}</p>`);
    if (c.phone) parts.push(`<p class="phone">${ui.link(c.phone.value, "tel:" + c.phone.value)}</p>`);
    if (c.email) parts.push(`<p class="email">${ui.link(c.email.value, "mailto:" + c.email.value)}</p>`);
    if (c.cta) parts.push(ui.cta(c.cta.label.value, c.cta.href));
    return `${ui.heading(2, c.heading.value)}${parts.join("")}`;
  },
});
