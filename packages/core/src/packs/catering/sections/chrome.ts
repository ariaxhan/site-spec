import { z } from "zod";
import { factField, copyField } from "../../../fields";
import { assetRef } from "../../../schema/asset";
import { defineSection } from "../../../schema/section";
import { escapeHtml, escapeAttr, safeUrl } from "../../../ui/escape";
import { icn } from "../icons";
import { ctaSchema, krSpan } from "../fields";

/** Page chrome: utility bar, sticky nav (+ mobile drawer), footer, quote modal. */

const telHref = (phone: string): string => "tel:" + phone.replace(/[^+\d]/g, "");

// ---- topbar -----------------------------------------------------------

export const topbarContent = z.object({
  badge: copyField,
  phones: z.array(factField(z.string())).min(1).max(2),
  email: factField(z.string()).optional(),
});
export type TopbarContent = z.infer<typeof topbarContent>;

export const topbar = defineSection<TopbarContent>({
  type: "topbar",
  version: "0-1-0",
  content: topbarContent,
  placement: "header",
  shell: false,
  render(c) {
    const phones = c.phones
      .map(
        (p, i) =>
          `<a${i > 0 ? ' class="hide-sm"' : ""} href="${escapeAttr(telHref(p.value))}">${i === 0 ? icn("phone") : ""}${escapeHtml(p.value)}</a>`,
      )
      .join("");
    const email = c.email
      ? `<a class="hide-sm" href="${escapeAttr("mailto:" + c.email.value)}">${escapeHtml(c.email.value)}</a>`
      : "";
    return `<aside class="util" aria-label="Service area and contact"><div class="wrap"><div class="badge">${icn("leaf")}${escapeHtml(c.badge.value)}</div><div class="links">${phones}${email}</div></div></aside>`;
  },
});

// ---- nav + drawer -----------------------------------------------------

/** Typographic wordmark used when the business has no logo asset yet. */
export const wordmarkSchema = z.object({
  name: factField(z.string()),
  sub: copyField.optional(),
});

export const navContent = z.object({
  logo: assetRef.optional(),
  /** Accessible name for the logo image — the business name, a fact. */
  logoAlt: factField(z.string()).optional(),
  /** Fallback wordmark when `logo` is absent — never a hardcoded brand. */
  wordmark: wordmarkSchema.optional(),
  links: z
    .array(z.object({ label: copyField, labelKo: copyField.optional(), href: z.string() }))
    .min(1),
  cta: ctaSchema,
});
export type NavContent = z.infer<typeof navContent>;

export const nav = defineSection<NavContent>({
  type: "nav",
  version: "0-1-0",
  content: navContent,
  placement: "header",
  shell: false,
  render(c, ctx) {
    const logo = c.logo ? ctx.manifest[c.logo] : undefined;
    const mark = logo
      ? `<img class="brand-logo" src="${escapeAttr(logo.url)}" alt="${escapeAttr(c.logoAlt?.value ?? "")}">`
      : `<span class="row"><span class="name">${escapeHtml(c.wordmark?.name.value ?? c.logoAlt?.value ?? "")}</span>` +
        (c.wordmark?.sub ? `<span class="sub">${escapeHtml(c.wordmark.sub.value)}</span>` : "") +
        `</span>`;
    const links = c.links
      .map((l) => `<a href="${escapeAttr(safeUrl(l.href))}">${escapeHtml(l.label.value)}</a>`)
      .join("");
    const drawerLinks = c.links
      .map(
        (l) =>
          `<a href="${escapeAttr(safeUrl(l.href))}">${escapeHtml(l.label.value)} ${krSpan(l.labelKo?.value)}</a>`,
      )
      .join("");
    return (
      `<header class="nav"><div class="wrap">` +
      `<a href="#hero" class="mark">${mark}</a>` +
      `<nav class="links" aria-label="Primary">${links}</nav>` +
      `<div class="nav-cta">` +
      `<a class="btn btn-fill btn-sm" href="${escapeAttr(safeUrl(c.cta.href))}" aria-label="${escapeAttr(c.cta.label.value)}">${icn("phone")}<span class="phone-txt">${escapeHtml(c.cta.label.value)}</span></a>` +
      `<button class="hamburger" id="navToggle" type="button" aria-label="Menu" aria-expanded="false">${icn("menu")}</button>` +
      `</div></div></header>` +
      `<div class="drawer-overlay" id="drawerOverlay"></div>` +
      `<nav class="drawer" id="navDrawer" aria-label="Mobile menu">${drawerLinks}` +
      `<a class="drawer-call btn" href="${escapeAttr(safeUrl(c.cta.href))}">${icn("phone")}${escapeHtml(c.cta.label.value)}</a></nav>`
    );
  },
});

// ---- footer -----------------------------------------------------------

export const footerContent = z.object({
  logo: assetRef.optional(),
  /** Accessible name for the logo image (required for WCAG H30 link text). */
  logoAlt: factField(z.string()).optional(),
  /** Fallback wordmark when `logo` is absent. */
  wordmark: wordmarkSchema.optional(),
  blurb: copyField,
  blurbKo: copyField.optional(),
  cols: z
    .array(
      z.object({
        heading: copyField,
        items: z.array(z.object({ label: copyField, href: z.string().optional() })).min(1),
      }),
    )
    .max(3),
  bottomLeft: copyField,
  bottomRight: copyField.optional(),
});
export type FooterContent = z.infer<typeof footerContent>;

export const footer = defineSection<FooterContent>({
  type: "footer",
  version: "0-1-0",
  content: footerContent,
  placement: "footer",
  shell: false,
  render(c, ctx) {
    const logo = c.logo ? ctx.manifest[c.logo] : undefined;
    const logoAlt = c.logoAlt?.value ?? c.wordmark?.name.value ?? "Home";
    const mark = logo
      ? `<a href="#hero" class="mark mark-ft"><img class="brand-logo" src="${escapeAttr(logo.url)}" alt="${escapeAttr(logoAlt)}"></a>`
      : c.wordmark
        ? `<a href="#hero" class="mark mark-ft"><span class="row"><span class="name" style="color:#fff">${escapeHtml(c.wordmark.name.value)}</span>` +
          (c.wordmark.sub ? `<span class="sub" style="color:#d4e9e2">${escapeHtml(c.wordmark.sub.value)}</span>` : "") +
          `</span></a>`
        : "";
    const cols = c.cols
      .map((col) => {
        const items = col.items
          .map((i) =>
            i.href
              ? `<a href="${escapeAttr(safeUrl(i.href))}">${escapeHtml(i.label.value)}</a>`
              : `<div>${escapeHtml(i.label.value)}</div>`,
          )
          .join("");
        return `<div class="ftcol"><div class="h">${escapeHtml(col.heading.value)}</div>${items}</div>`;
      })
      .join("");
    const blurbKo = c.blurbKo
      ? `<p class="kr" lang="ko" style="margin-top:8px">${escapeHtml(c.blurbKo.value)}</p>`
      : "";
    return (
      `<footer class="ft"><div class="wrap">` +
      `<div class="about-col">${mark}<p>${escapeHtml(c.blurb.value)}</p>${blurbKo}</div>${cols}</div>` +
      `<div class="bottom"><span>${escapeHtml(c.bottomLeft.value)}</span>` +
      (c.bottomRight ? `<span>${escapeHtml(c.bottomRight.value)}</span>` : "") +
      `</div></footer>`
    );
  },
});

// ---- quote modal (mailto-powered; no backend) -------------------------

export const quoteContent = z.object({
  email: factField(z.string()),
  eyebrow: copyField,
  heading: copyField,
  sub: copyField.optional(),
});
export type QuoteContent = z.infer<typeof quoteContent>;

/** Form labels/options are the pack's designed copy, not spec content. */
const QUOTE_FORM = `
<div class="fgrid">
<label class="fld"><span class="flab">Your name · <span class="kr" lang="ko">성함</span> <i>*</i></span><input name="name" type="text" autocomplete="name" required placeholder="Jane Kim"></label>
<label class="fld"><span class="flab">Phone · <span class="kr" lang="ko">연락처</span> <i>*</i></span><input name="phone" type="tel" autocomplete="tel" required placeholder="(555) 000-0000"></label>
<label class="fld"><span class="flab">Email · <span class="kr" lang="ko">이메일</span></span><input name="email" type="email" autocomplete="email" placeholder="you@email.com"></label>
<label class="fld"><span class="flab">Event date · <span class="kr" lang="ko">행사 날짜</span></span><input name="date" type="text" placeholder="Sat, Jul 18"></label>
<label class="fld"><span class="flab">Headcount · <span class="kr" lang="ko">인원수</span></span><select name="guests"><option>~20 guests</option><option selected>20–50 guests</option><option>50–100 guests</option><option>100+ guests</option></select></label>
<label class="fld"><span class="flab">Occasion · <span class="kr" lang="ko">행사 종류</span></span><select name="occasion"><option>Corporate / office</option><option>Party / gathering</option><option>Birthday</option><option>Side dishes order</option><option>Other</option></select></label>
<label class="fld full"><span class="flab">Details · <span class="kr" lang="ko">요청 사항</span></span><textarea name="notes" rows="3" placeholder="Menu requests, allergies, delivery area (OC/LA), pickup vs delivery…"></textarea></label>
</div>`.replace(/\n/g, "");

export const quote = defineSection<QuoteContent>({
  type: "quote",
  version: "0-1-0",
  content: quoteContent,
  placement: "footer",
  shell: false,
  render(c) {
    return (
      // `inert` keeps the form fields unfocusable while hidden — aria-hidden
      // alone over focusable descendants is a WCAG violation (hidden-focusable)
      `<div class="modal-overlay" id="quoteModal" aria-hidden="true" inert><div class="modal" role="dialog" aria-modal="true" aria-labelledby="quoteTitle">` +
      `<button class="modal-x" type="button" data-close aria-label="Close">${icn("x")}</button>` +
      `<div class="modal-head"><div class="eyebrow">${escapeHtml(c.eyebrow.value)}</div><h2 id="quoteTitle">${escapeHtml(c.heading.value)}</h2>` +
      (c.sub ? `<p class="kr" lang="ko">${escapeHtml(c.sub.value)}</p>` : "") +
      `</div><form id="quoteForm" class="quote-form" data-email="${escapeAttr(c.email.value)}" novalidate>${QUOTE_FORM}` +
      `<p class="modal-note">Submitting opens your email app with the details filled in, addressed to us.</p>` +
      `<button class="btn btn-fill modal-submit" type="submit">${icn("mail")}Send request</button>` +
      `</form></div></div>`
    );
  },
});
