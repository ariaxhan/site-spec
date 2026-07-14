import { z } from "zod";
import { factField, copyField } from "../../../fields";
import { defineSection } from "../../../schema/section";
import { ui } from "../../../ui/primitives";
import { escapeHtml } from "../../../ui/escape";

export const hoursContent = z.object({
  heading: copyField,
  days: z
    .array(
      z.object({
        day: factField(z.string()),
        open: factField(z.string()).optional(),
        close: factField(z.string()).optional(),
        closed: z.boolean().optional(),
      }),
    )
    .min(1),
});
export type HoursContent = z.infer<typeof hoursContent>;

export const hours = defineSection<HoursContent>({
  type: "hours",
  version: "0-1-0",
  content: hoursContent,
  render(c) {
    const rows = c.days
      .map((d) => {
        const time = d.closed
          ? "Closed"
          : `${d.open?.value ?? ""} – ${d.close?.value ?? ""}`;
        return `<tr><th scope="row">${escapeHtml(d.day.value)}</th><td>${escapeHtml(time)}</td></tr>`;
      })
      .join("");
    return `${ui.heading(2, c.heading.value)}<table class="hours"><tbody>${rows}</tbody></table>`;
  },
});
