import { z } from "zod";
import { factField, copyField } from "../../../fields";
import { assetRef } from "../../../schema/asset";
import { defineSection } from "../../../schema/section";
import { escapeHtml, escapeAttr, safeUrl } from "../../../ui/escape";
import { icn, iconName } from "../icons";
import { ctaSchema, btn, kr, multiline, eyebrow, photo } from "../fields";

/** In-main sections, mirroring the approved homepage top to bottom. */

const secHead = (
  eb: string,
  heading: string,
  introKo?: string,
  wide = false,
): string =>
  `<div class="sec-head"${wide ? ' style="max-width:none"' : ""}>${eyebrow(eb)}<h2>${multiline(heading)}</h2>${kr(introKo)}</div>`;

// ---- hero --------------------------------------------------------------

export const heroContent = z.object({
  eyebrow: copyField,
  headline: copyField,
  lede: copyField,
  ledeKo: copyField.optional(),
  badge: z
    .object({ lines: z.array(copyField).min(1).max(2), caption: copyField })
    .optional(),
  image: assetRef.optional(),
  imageAlt: factField(z.string()).optional(),
  ctas: z.array(ctaSchema.extend({ icon: iconName.optional() })).min(1).max(2),
});
export type HeroContent = z.infer<typeof heroContent>;

export const hero = defineSection<HeroContent>({
  type: "hero",
  version: "0-1-0",
  content: heroContent,
  render(c, ctx) {
    const ctas = c.ctas
      .map((cta, i) => btn(cta, i === 0 ? "fill" : "out", cta.icon ? icn(cta.icon) : ""))
      .join("");
    const badge = c.badge
      ? `<div class="nomsg">${c.badge.lines.map((l) => `<b>${escapeHtml(l.value)}</b>`).join("")}<span>${escapeHtml(c.badge.caption.value)}</span></div>`
      : "";
    const art = `<div class="art">${badge}${photo(c.image, c.imageAlt?.value ?? "", ctx, "hero-ph", { priority: true })}</div>`;
    return (
      `<div class="copy">${eyebrow(c.eyebrow.value)}<h1>${multiline(c.headline.value)}</h1>` +
      `<p class="lede">${escapeHtml(c.lede.value)}</p>${kr(c.ledeKo?.value, "lede-kr")}` +
      `<div class="cta-row">${ctas}</div></div>${art}`
    );
  },
});

// ---- trust strip -------------------------------------------------------

export const trustContent = z.object({
  items: z
    .array(z.object({ icon: iconName, title: copyField, sub: copyField.optional() }))
    .min(2)
    .max(4),
});
export type TrustContent = z.infer<typeof trustContent>;

export const trust = defineSection<TrustContent>({
  type: "trust",
  version: "0-1-0",
  content: trustContent,
  render(c) {
    return c.items
      .map(
        (i) =>
          `<div class="item"><div class="ic">${icn(i.icon)}</div><div><div class="t">${escapeHtml(i.title.value)}</div>` +
          (i.sub ? `<div class="d kr" lang="ko">${escapeHtml(i.sub.value)}</div>` : "") +
          `</div></div>`,
      )
      .join("");
  },
});

// ---- services ----------------------------------------------------------

export const servicesContent = z.object({
  eyebrow: copyField,
  heading: copyField,
  introKo: copyField.optional(),
  items: z
    .array(
      z.object({
        image: assetRef.optional(),
        title: factField(z.string()),
        titleKo: factField(z.string()).optional(),
        body: copyField,
        bodyKo: copyField.optional(),
      }),
    )
    .min(1),
});
export type ServicesContent = z.infer<typeof servicesContent>;

export const services = defineSection<ServicesContent>({
  type: "services",
  version: "0-1-0",
  content: servicesContent,
  render(c, ctx) {
    const cards = c.items
      .map(
        (s, i) =>
          `<div class="svc">${photo(s.image, s.title.value, ctx, "svc-ph")}<div class="body">` +
          `<div class="num">${String(i + 1).padStart(2, "0")}</div><h3>${escapeHtml(s.title.value)}</h3>` +
          (s.titleKo ? `<div class="h3kr kr" lang="ko">${escapeHtml(s.titleKo.value)}</div>` : "") +
          `<p>${escapeHtml(s.body.value)}</p>${kr(s.bodyKo?.value, "pkr")}</div></div>`,
      )
      .join("");
    return `${secHead(c.eyebrow.value, c.heading.value, c.introKo?.value, true)}<div class="svc-grid">${cards}</div>`;
  },
});

// ---- banchan showcase ----------------------------------------------------

export const banchanContent = z.object({
  eyebrow: copyField,
  heading: copyField,
  introKo: copyField.optional(),
  items: z
    .array(
      z.object({
        image: assetRef.optional(),
        name: factField(z.string()),
        nameKo: factField(z.string()).optional(),
      }),
    )
    .min(1),
});
export type BanchanContent = z.infer<typeof banchanContent>;

export const banchan = defineSection<BanchanContent>({
  type: "banchan",
  version: "0-1-0",
  content: banchanContent,
  render(c, ctx) {
    const cards = c.items
      .map(
        (b) =>
          `<div class="bn">${photo(b.image, b.name.value, ctx, "bn-ph")}<div class="cap"><div class="en">${escapeHtml(b.name.value)}</div>` +
          (b.nameKo ? `<div class="ko kr" lang="ko">${escapeHtml(b.nameKo.value)}</div>` : "") +
          `</div></div>`,
      )
      .join("");
    return `${secHead(c.eyebrow.value, c.heading.value, c.introKo?.value)}<div class="bn-grid">${cards}</div>`;
  },
});

// ---- feature band --------------------------------------------------------

export const featureContent = z.object({
  eyebrow: copyField,
  heading: copyField,
  body: copyField,
  bodyKo: copyField.optional(),
  image: assetRef.optional(),
  imageAlt: factField(z.string()).optional(),
  ctas: z.array(ctaSchema).min(1).max(2),
});
export type FeatureContent = z.infer<typeof featureContent>;

export const feature = defineSection<FeatureContent>({
  type: "feature",
  version: "0-1-0",
  content: featureContent,
  render(c, ctx) {
    const ctas = c.ctas
      .map((cta, i) => {
        const attrs = cta.href === "#quote" ? " data-quote" : "";
        return `<a class="btn btn-${i === 0 ? "inv" : "wout"}" href="${escapeAttr(safeUrl(cta.href))}"${attrs}>${escapeHtml(cta.label.value)}</a>`;
      })
      .join("");
    return (
      `<div class="copy">${eyebrow(c.eyebrow.value)}<h2>${multiline(c.heading.value)}</h2>` +
      `<p>${escapeHtml(c.body.value)}</p>${kr(c.bodyKo?.value, "pkr")}<div class="cta-row">${ctas}</div></div>` +
      `<div class="art">${photo(c.image, c.imageAlt?.value ?? "", ctx, "feat-ph")}</div>`
    );
  },
});

// ---- about / story -------------------------------------------------------

export const aboutContent = z.object({
  eyebrow: copyField,
  heading: copyField,
  body: copyField,
  bodyKo: copyField.optional(),
  noteEn: copyField.optional(),
  noteKo: copyField.optional(),
  image: assetRef.optional(),
  imageAlt: factField(z.string()).optional(),
});
export type AboutContent = z.infer<typeof aboutContent>;

export const about = defineSection<AboutContent>({
  type: "about",
  version: "0-1-0",
  content: aboutContent,
  render(c, ctx) {
    const note =
      c.noteEn || c.noteKo
        ? `<div class="note">` +
          (c.noteEn ? `<div class="en">${escapeHtml(c.noteEn.value)}</div>` : "") +
          (c.noteKo ? `<div class="ko kr" lang="ko">${escapeHtml(c.noteKo.value)}</div>` : "") +
          `</div>`
        : "";
    return (
      photo(c.image, c.imageAlt?.value ?? "", ctx, "about-ph") +
      `<div class="copy">${eyebrow(c.eyebrow.value, false)}<h2>${multiline(c.heading.value)}</h2>` +
      `<p>${escapeHtml(c.body.value)}</p>${kr(c.bodyKo?.value, "pkr")}${note}</div>`
    );
  },
});

// ---- contact cards -------------------------------------------------------

export const contactContent = z.object({
  eyebrow: copyField,
  heading: copyField,
  body: copyField,
  bodyKo: copyField.optional(),
  ctas: z.array(ctaSchema.extend({ icon: iconName.optional() })).max(2),
  phones: z.array(factField(z.string())).min(1).max(2),
  email: factField(z.string()).optional(),
  addressLines: z.array(factField(z.string())).min(1).max(2),
  addressQuery: z.string(),
  areaTitle: copyField,
  areaSub: copyField.optional(),
});
export type ContactContent = z.infer<typeof contactContent>;

const mapsSearch = (q: string): string =>
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

export const contact = defineSection<ContactContent>({
  type: "contact",
  version: "0-1-0",
  content: contactContent,
  render(c) {
    const ctas = c.ctas
      .map((cta, i) => {
        const attrs = cta.href === "#quote" ? " data-quote" : "";
        return `<a class="btn btn-${i === 0 ? "fill" : "out"}" href="${escapeAttr(safeUrl(cta.href))}"${attrs}>${cta.icon ? icn(cta.icon) : ""}${escapeHtml(cta.label.value)}</a>`;
      })
      .join("");
    const phoneVals = c.phones
      .map(
        (p, i) =>
          `<a${i > 0 ? ' class="small"' : ""} href="${escapeAttr("tel:" + p.value.replace(/[^+\d]/g, ""))}">${escapeHtml(p.value)}</a>`,
      )
      .join("");
    const cards = [
      `<div class="ccard"><div class="ic">${icn("phone")}</div><div class="lbl">Call us</div><div class="val">${phoneVals}</div></div>`,
      c.email
        ? `<div class="ccard"><div class="ic">${icn("mail")}</div><div class="lbl">Email</div><div class="val"><a href="${escapeAttr("mailto:" + c.email.value)}" style="font-size:15px">${escapeHtml(c.email.value)}</a></div></div>`
        : "",
      `<div class="ccard"><div class="ic">${icn("pin")}</div><div class="lbl">Address</div><div class="val" style="font-size:15px"><a href="${escapeAttr(mapsSearch(c.addressQuery))}" target="_blank" rel="noopener">${escapeHtml(c.addressLines[0]!.value)}` +
        (c.addressLines[1] ? `<span class="small">${escapeHtml(c.addressLines[1].value)}</span>` : "") +
        `</a></div></div>`,
      `<div class="ccard"><div class="ic">${icn("globe")}</div><div class="lbl">Service area</div><div class="val">${escapeHtml(c.areaTitle.value)}` +
        (c.areaSub ? `<span class="small">${escapeHtml(c.areaSub.value)}</span>` : "") +
        `</div></div>`,
    ].join("");
    return (
      `<div class="head">${eyebrow(c.eyebrow.value)}<h2>${escapeHtml(c.heading.value)}</h2>` +
      `<p>${escapeHtml(c.body.value)}</p>${kr(c.bodyKo?.value)}<div class="head-cta">${ctas}</div></div>` +
      `<div class="cards">${cards}</div>`
    );
  },
});

// ---- map embed (sandboxed third-party widget per 7-C) --------------------

export const mapContent = z.object({
  addressQuery: z.string(),
  pinTitle: factField(z.string()),
  pinSub: copyField.optional(),
});
export type MapContent = z.infer<typeof mapContent>;

export const map = defineSection<MapContent>({
  type: "map",
  version: "0-1-0",
  content: mapContent,
  shell: false,
  render(c) {
    const embed =
      "https://www.google.com/maps?q=" + encodeURIComponent(c.addressQuery) + "&z=16&output=embed";
    return (
      `<section class="mapsec" id="map" aria-label="Location map">` +
      `<iframe src="${escapeAttr(embed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${escapeAttr(c.pinTitle.value)}"></iframe>` +
      `<a class="map-pin" href="${escapeAttr(mapsSearch(c.addressQuery))}" target="_blank" rel="noopener">${icn("pin")}<span><b>${escapeHtml(c.pinTitle.value)}</b>` +
      (c.pinSub ? escapeHtml(c.pinSub.value) : "") +
      `</span></a></section>`
    );
  },
});
