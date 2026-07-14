/**
 * The pack-agnostic base stylesheet. Reads only theme CSS variables, so a new
 * theme reskins the whole site without touching this. Mobile-first, clean,
 * intentionally restrained — the design competes on typography and spacing, not
 * decoration.
 */
export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{font-size:var(--base-size)}
body{margin:0;font-family:var(--font-body);color:var(--text);background:var(--bg);line-height:1.6;letter-spacing:var(--tracking);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-text-size-adjust:100%}
h1,h2,h3{font-family:var(--font-heading);color:var(--heading);line-height:1.15;margin:0 0 .4em}
h1{font-size:2.5rem}h2{font-size:1.8rem}h3{font-size:1.25rem}
p{margin:0 0 1rem;color:var(--text)}
section{border-bottom:1px solid var(--border)}
section:last-child{border-bottom:0}
.wrap{max-width:60rem;margin:0 auto;padding:3rem 1.25rem}
/* tones — the page rhythm. Sections pick a tone; the theme picks the colors. */
section.tone-surface{background:var(--surface)}
section.tone-band{background:var(--band-bg);border-bottom:0}
section.tone-band :is(h1,h2,h3,p,li){color:var(--band-text)}
section.tone-band :is(td,cite,.item-desc,.meta){color:var(--band-text-muted)}
section.tone-band a{color:var(--band-text)}
section.tone-band .cta{background:var(--bg);color:var(--text)}
section.tone-band .tagline{color:var(--band-text)}
/* surface cards keep their own ink even inside a band — otherwise band text
   colors bleed into the card and go invisible (white-on-white) */
section.tone-band :is(.review,.service-card) :is(h3,p,li){color:var(--text)}
section.tone-band :is(.review,.service-card) :is(cite,td,.item-desc,.meta){color:var(--text-muted)}
section.tone-band .service-card h3{color:var(--primary)}
section.tone-band :is(.review,.service-card) a{color:var(--accent)}
section.tone-band .badges li{color:var(--primary)}
section.tone-band .banchan li{color:var(--text)}
#hero .wrap{text-align:center;padding-top:4rem;padding-bottom:4rem}
.tagline{font-family:var(--font-accent);font-size:1.6rem;color:var(--primary);margin:.25rem 0 1rem;line-height:1.2}
#hero img{width:100%;max-height:24rem;object-fit:cover;border-radius:var(--radius);margin-bottom:1.5rem}
/* hero "split" variant — copy beside media; stacks on mobile */
.hero-split{display:grid;gap:2rem;text-align:left;align-items:center}
.hero-split img{margin-bottom:0;height:100%;max-height:none}
@media(min-width:48rem){.hero-split{grid-template-columns:3fr 2fr}.hero-split img{max-height:28rem}}
.cta{display:inline-block;background:var(--primary);color:var(--primary-text);padding:.7rem 1.5rem;border-radius:var(--radius-control);text-decoration:none;font-weight:600;margin-top:.5rem;transition:transform .2s ease}
.cta:hover{filter:brightness(.94)}
.cta:active{transform:scale(var(--press-scale))}
a{color:var(--accent)}
.menu-items{list-style:none;padding:0;margin:0 0 1.5rem}
.menu-items li{display:grid;grid-template-columns:1fr auto;gap:.25rem 1rem;padding:.6rem 0;border-bottom:1px dotted var(--border)}
.item-name{font-weight:600}
.item-price{color:var(--primary);font-variant-numeric:tabular-nums}
.item-desc{grid-column:1/-1;color:var(--text-muted);font-size:.9rem}
table.hours{width:100%;border-collapse:collapse}
table.hours th{text-align:left;font-weight:600;padding:.4rem 0}
table.hours td{text-align:right;color:var(--text-muted);padding:.4rem 0}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.75rem}
.gallery img{width:100%;height:100%;object-fit:cover;border-radius:var(--radius)}
.reviews{display:grid;gap:1.25rem}
.review{margin:0;padding:1.25rem;background:var(--surface);border:var(--card-border);border-radius:var(--radius);box-shadow:var(--shadow-card)}
.review cite{display:block;margin-top:.5rem;color:var(--text-muted);font-style:normal;font-size:.9rem}
.address,.phone,.email{margin:.25rem 0}
/* catering pack */
.badges{list-style:none;display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;padding:0;margin:1.25rem 0}
.badges li{background:var(--surface);border:1px solid var(--primary);color:var(--primary);border-radius:var(--radius-control);padding:.35rem .9rem;font-size:.85rem;font-weight:600}
.services{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:1rem}
.service-card{background:var(--surface);border:var(--card-border);border-radius:var(--radius);padding:1.5rem;box-shadow:var(--shadow-card)}
.service-card h3{color:var(--primary)}
.banchan{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.5rem}
.banchan li{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:.8rem 1rem;font-weight:600}
.quote-fields{color:var(--text-muted);columns:2;gap:1rem;margin:1rem 0}
.quote-contact{margin:1rem 0;font-size:1.1rem}
/* accessibility */
.skip-link{position:absolute;left:-9999px;top:.5rem;background:var(--primary);color:var(--primary-text);padding:.6rem 1rem;border-radius:var(--radius);z-index:10000}
.skip-link:focus{left:.5rem}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.a11y{position:fixed;right:1rem;bottom:1rem;z-index:9000}
.a11y-btn{width:2.75rem;height:2.75rem;border-radius:999px;border:0;background:var(--primary);color:var(--primary-text);font-size:1.1rem;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.a11y-panel{position:absolute;right:0;bottom:3.25rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem;display:flex;flex-direction:column;gap:.4rem;min-width:11rem;box-shadow:0 4px 16px rgba(0,0,0,.18)}
.a11y-panel[hidden]{display:none}
.a11y-panel p{margin:0 0 .25rem;font-weight:600}
.a11y-panel button{padding:.45rem .6rem;min-height:44px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);cursor:pointer;font:inherit;text-align:left}
.a11y-panel button[aria-pressed="true"]{background:var(--primary);color:var(--primary-text);border-color:var(--primary)}
html.a11y-high-contrast{filter:contrast(1.5)}
html.a11y-reduce-motion *{animation:none!important;transition:none!important;scroll-behavior:auto!important}
/* respect the OS reduced-motion setting too, not just the widget */
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}
@media(min-width:48rem){h1{font-size:3.25rem}}
`.trim();
