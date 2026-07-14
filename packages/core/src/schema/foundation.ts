import { z } from "zod";

/**
 * The foundation manifest, the site's declared backend surface. Everything a
 * frontend agent might silently invent (cookies, analytics, forms, env vars)
 * is declared here instead; `buildSite` emits it as `foundation.json` and the
 * auditor treats anything found in the HTML but not declared here as a finding.
 *
 * The honest default is empty: a static site sets no cookies, loads no
 * trackers, reads no env. Declaring nothing is a strong claim, not a gap.
 */

export const formFieldContract = z.object({
  /** must match the rendered input's name attribute */
  name: z.string().min(1),
  type: z
    .enum(["text", "email", "tel", "date", "number", "select", "textarea", "checkbox", "hidden"])
    .default("text"),
  required: z.boolean().default(false),
});
export type FormFieldContract = z.infer<typeof formFieldContract>;

export const formContract = z.object({
  /** must match the rendered <form id="..."> */
  id: z.string().min(1),
  /** human purpose, e.g. "request a catering quote" */
  intent: z.string().min(1),
  /** where submissions go: "mailto:..." or a URL. No endpoint = broken form. */
  endpoint: z.string().min(1),
  method: z.enum(["GET", "POST", "mailto"]).default("POST"),
  fields: z.array(formFieldContract).default([]),
  spam: z.enum(["none", "honeypot", "captcha"]).default("none"),
});
export type FormContract = z.infer<typeof formContract>;

export const cookieDeclaration = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  ttlDays: z.number().positive().optional(),
});

export const envDeclaration = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  /** where the value is needed; the renderer itself never reads env (determinism) */
  requiredAt: z.enum(["build", "deploy", "runtime"]).default("deploy"),
});

export const foundation = z.object({
  /** env vars the deploy needs. The render path never reads process.env. */
  env: z.array(envDeclaration).default([]),
  /** cookies the site sets. Default none, undeclared cookies fail audit. */
  cookies: z.array(cookieDeclaration).default([]),
  /** analytics provider, or "none". Undeclared trackers fail audit. */
  analytics: z
    .object({
      provider: z.string().min(1).default("none"),
      /** script origin for the declared provider, if any */
      src: z.string().optional(),
    })
    .default({}),
  /** every rendered <form> must have a contract here (matched by id). */
  forms: z.array(formContract).default([]),
});
export type Foundation = z.infer<typeof foundation>;
