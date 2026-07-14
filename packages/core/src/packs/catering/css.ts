/**
 * The catering pack stylesheet — a warm-cream / green food-service design
 * system. Only the selectors are adapted to the engine's section shells
 * (`#hero .wrap` instead of `.hero .wrap`); do not restyle.
 */
export const CATERING_CSS = `
/* foundations */
html{scroll-behavior:smooth}
::selection{background:#d4e9e2}
.kr{font-family:'Noto Sans KR','Manrope',sans-serif;font-weight:400}
.eyebrow{font-size:12px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;color:#826633}
.eyebrow-bronze{color:#7d6433}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:50px;padding:13px 26px;font-size:16px;font-weight:700;letter-spacing:-.01em;cursor:pointer;border:1px solid transparent;transition:all .2s ease;white-space:nowrap;text-decoration:none}
.btn:active{transform:scale(.95)}
.btn-fill{background:#00754A;color:#fff;border-color:#00754A}
.btn-fill:hover{background:#006241;filter:none}
.btn-out{background:transparent;color:#00754A;border-color:#00754A}
.btn-out:hover{background:rgba(0,117,74,.06)}
.btn-inv{background:#fff;color:#00754A;border-color:#fff}
.btn-wout{background:transparent;color:#fff;border-color:#fff}
.btn-wout:hover{background:rgba(255,255,255,.1)}
.btn-sm{padding:9px 18px;font-size:14px}
.icn{width:1.25em;height:1.25em;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round;flex:none}
.ph{overflow:hidden;border-radius:12px}
.ph img{width:100%;height:100%;object-fit:cover;display:block;border-radius:0}
.ph-empty{background:linear-gradient(150deg,#e7ddc9,#d2c2a0)}
/* engine-shell adaptation */
main section{border-bottom:0}
main .wrap{max-width:1180px;padding:72px 40px}
.wrap{max-width:1180px;margin:0 auto;padding:0 40px}
/* utility bar */
.util{background:#1E3932;color:#fff;font-size:13px}
.util .wrap{display:flex;align-items:center;justify-content:space-between;min-height:40px;gap:16px;flex-wrap:wrap}
.util .badge{display:flex;align-items:center;gap:7px;color:#cba258;font-weight:700;letter-spacing:.04em}
.util .links{display:flex;align-items:center;gap:20px;color:rgba(255,255,255,.85)}
.util .links a{display:flex;align-items:center;gap:6px;color:inherit;text-decoration:none}
/* nav */
header.nav{position:sticky;top:0;z-index:40;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.10),0 2px 2px rgba(0,0,0,.06),0 0 2px rgba(0,0,0,.07)}
header.nav .wrap{height:92px;display:flex;align-items:center;gap:36px}
.mark{line-height:1;display:flex;align-items:center;text-decoration:none}
.brand-logo{height:72px;width:auto;display:block}
.mark-ft .brand-logo{height:54px}
.mark .tag{font-size:9px;letter-spacing:.24em;font-weight:700;color:#826633}
.mark .row{display:flex;align-items:baseline;gap:6px}
.mark .name{font-size:26px;font-weight:800;letter-spacing:-1px;color:#006241}
.mark .sub{font-family:var(--font-accent);font-size:18px;color:#2b5148}
nav.links{display:flex;gap:26px;margin-left:6px}
nav.links a{font-size:15px;font-weight:600;letter-spacing:-.01em;color:rgba(0,0,0,.78);padding-bottom:3px;border-bottom:2px solid transparent;transition:all .15s ease;white-space:nowrap;text-decoration:none}
nav.links a:hover{color:#006241;border-color:#00754A}
.nav-cta{margin-left:auto;display:flex;align-items:center;gap:14px}
.hamburger{display:none;width:44px;height:44px;border:none;background:transparent;cursor:pointer;align-items:center;justify-content:center;color:#006241;border-radius:10px}
.hamburger:active{transform:scale(.95)}
.hamburger .icn{width:26px;height:26px}
.drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:44;opacity:0;pointer-events:none;transition:opacity .25s ease}
.drawer-overlay.show{opacity:1;pointer-events:auto}
.drawer{position:fixed;top:0;right:0;bottom:0;width:78%;max-width:320px;background:#fff;z-index:45;box-shadow:-8px 0 28px rgba(0,0,0,.18);transform:translateX(100%);transition:transform .28s cubic-bezier(.25,.46,.45,.94);display:flex;flex-direction:column;padding:92px 0 24px;overflow-y:auto}
.drawer.show{transform:none}
.drawer a{display:flex;align-items:baseline;gap:10px;padding:16px 28px;font-size:19px;font-weight:700;letter-spacing:-.01em;color:rgba(0,0,0,.85);border-bottom:1px solid #f2f0eb;text-decoration:none}
.drawer a .kr{font-size:13px;font-weight:500;color:rgba(0,0,0,.6)}
.drawer a:active{background:#f2f0eb}
.drawer .drawer-call{margin:20px 22px 0;justify-content:center;background:#00754A;color:#fff;border:none;border-radius:50px;padding:15px;font-size:15px;gap:8px}
.drawer .drawer-call .icn{width:20px;height:20px}
/* hero */
#hero{background:#f2f0eb}
#hero .wrap{display:flex;gap:52px;align-items:center;padding-top:64px;padding-bottom:64px;flex-wrap:wrap;text-align:left}
#hero .copy{flex:1 1 400px}
#hero h1{font-size:54px;line-height:1.06;font-weight:800;letter-spacing:-1.6px;color:#006241;margin-top:16px}
#hero .lede{font-size:19px;line-height:1.6;color:rgba(0,0,0,.7);max-width:460px;margin-top:18px}
#hero .lede-kr{font-size:15px;line-height:1.75;color:rgba(0,0,0,.58);max-width:460px;margin-top:12px}
#hero .cta-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:28px}
#hero .art{flex:1 1 380px;position:relative}
#hero .art .ph{height:420px;border-radius:16px}
#hero .art img{margin:0;max-height:none}
.nomsg{position:absolute;left:-14px;top:-14px;z-index:2;width:92px;height:92px;border-radius:50%;background:#00754A;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 6px rgba(0,0,0,.24),0 8px 12px rgba(0,0,0,.14);transform:rotate(-8deg)}
.nomsg b{font-size:22px;font-weight:800;letter-spacing:-.5px;line-height:1}
.nomsg span{font-size:10px;letter-spacing:.12em;margin-top:3px;color:#d4e9e2}
#feature .eyebrow{color:#cba258}
/* trust strip */
#trust{background:#fff;border-top:1px solid #edebe9;border-bottom:1px solid #edebe9}
#trust .wrap{display:flex;gap:28px;padding:26px 40px;flex-wrap:wrap}
#trust .item{flex:1 1 200px;display:flex;gap:13px;align-items:center}
#trust .ic{width:44px;height:44px;flex:none;border-radius:50%;background:#d4e9e2;color:#006241;display:flex;align-items:center;justify-content:center}
#trust .ic .icn{width:22px;height:22px}
#trust .t{font-weight:700;font-size:16px}
#trust .d{font-size:13px;color:rgba(0,0,0,.58);margin-top:1px}
/* section heading */
.sec-head{max-width:640px}
.sec-head h2{font-size:36px;font-weight:700;letter-spacing:-.6px;color:rgba(0,0,0,.87);margin-top:10px;line-height:1.15}
.sec-head .kr{margin-top:10px;font-size:15px;color:rgba(0,0,0,.58);line-height:1.7}
/* services */
#services{background:#f2f0eb}
.svc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:40px}
.svc{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 0 .5px rgba(0,0,0,.14),0 1px 1px rgba(0,0,0,.24);display:flex;flex-direction:column}
.svc .ph{height:190px;border-radius:0;flex:none}
.svc .body{padding:22px;display:flex;flex-direction:column;flex:1}
.svc .num{font-size:13px;font-weight:700;color:#826633;letter-spacing:.1em}
.svc h3{font-size:21px;font-weight:700;color:#006241;letter-spacing:-.3px;margin-top:6px;margin-bottom:0}
.svc .h3kr{font-size:14px;font-weight:700;color:rgba(0,0,0,.7);margin-top:3px}
.svc p{font-size:15px;line-height:1.6;color:rgba(0,0,0,.7);margin-top:12px;margin-bottom:0}
.svc .pkr{font-size:13.5px;line-height:1.7;color:rgba(0,0,0,.55);margin-top:8px;flex:1}
/* banchan */
#banchan{background:#fff}
.bn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:40px}
.bn{border-radius:12px;overflow:hidden;box-shadow:0 0 .5px rgba(0,0,0,.14),0 1px 1px rgba(0,0,0,.24);background:#fff}
.bn .ph{height:200px;border-radius:0}
.bn .cap{padding:14px 16px}
.bn .en{font-size:16px;font-weight:700;color:rgba(0,0,0,.87)}
.bn .ko{font-size:14px;color:#00754A;font-weight:500;margin-top:1px}
/* feature band */
#feature{background:#1E3932;color:#fff}
#feature .wrap{display:flex;gap:0;align-items:stretch;flex-wrap:wrap;padding-top:0;padding-bottom:0}
#feature .copy{flex:1 1 400px;padding:72px 48px 72px 0;display:flex;flex-direction:column;justify-content:center}
#feature h2{font-size:36px;line-height:1.14;font-weight:700;letter-spacing:-.6px;margin-top:12px;color:#fff;margin-bottom:0}
#feature p{color:#fff;font-size:16px;line-height:1.65;max-width:440px;margin-top:16px;margin-bottom:0}
#feature .pkr{font-size:14px;margin-top:12px}
#feature .cta-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:26px}
#feature .art{flex:1 1 360px;padding:40px 0;display:flex;align-items:center}
#feature .art .ph{width:100%;height:340px;border-radius:14px}
/* about */
#about{background:#faf6ee}
#about .wrap{display:flex;gap:52px;align-items:center;flex-wrap:wrap}
#about>.wrap>.ph{flex:1 1 320px;height:360px;border-radius:14px}
#about .copy{flex:1 1 380px}
#about h2{font-family:'Lora',Georgia,serif;font-size:38px;line-height:1.18;font-weight:600;color:#33433d;margin:12px 0 16px}
#about p{font-size:16px;line-height:1.7;color:#33433d;max-width:480px;margin-bottom:0}
#about .pkr{font-size:14.5px;line-height:1.8;color:#5b6661;max-width:480px;margin-top:14px}
#about .note{margin-top:24px}
#about .note .en{font-family:var(--font-accent);font-size:23px;color:#33433d;line-height:1.4}
#about .note .ko{font-family:'Nanum Pen Script',cursive;font-size:27px;color:#9b7b3f;margin-top:4px}
/* contact */
#contact{background:#f2f0eb}
#contact .head{text-align:center;max-width:620px;margin:0 auto}
#contact h2{font-size:38px;font-weight:800;letter-spacing:-.8px;color:#006241;margin-top:10px;line-height:1.1;margin-bottom:0}
#contact .head p{font-size:17px;color:rgba(0,0,0,.6);margin-top:12px;line-height:1.6;margin-bottom:0}
#contact .head .kr{font-size:14px;color:rgba(0,0,0,.62);margin-top:8px}
.head-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:26px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:44px}
.ccard{background:#fff;border-radius:12px;box-shadow:0 0 .5px rgba(0,0,0,.14),0 1px 1px rgba(0,0,0,.24);padding:26px 22px;text-align:center}
.ccard .ic{width:50px;height:50px;margin:0 auto 14px;border-radius:50%;background:#d4e9e2;color:#006241;display:flex;align-items:center;justify-content:center}
.ccard .ic .icn{width:24px;height:24px}
.ccard .lbl{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:rgba(0,0,0,.62)}
.ccard .val{font-size:17px;font-weight:700;color:rgba(0,0,0,.87);margin-top:6px;line-height:1.4}
.ccard .val a{color:#00754A;text-decoration:none;display:block}
.ccard .val .small{display:block;font-size:15px;color:rgba(0,0,0,.6);font-weight:600}
/* map */
.mapsec{position:relative}
.mapsec iframe{display:block;width:100%;height:420px;border:0}
.map-pin{position:absolute;left:50%;transform:translateX(-50%);bottom:28px;z-index:2;display:flex;align-items:center;gap:12px;background:#fff;border-radius:50px;padding:14px 24px 14px 18px;box-shadow:0 0 6px rgba(0,0,0,.12),0 10px 24px rgba(0,0,0,.18);max-width:calc(100% - 44px);text-decoration:none}
.map-pin .icn{width:26px;height:26px;flex:none;color:#00754A}
.map-pin span{display:flex;flex-direction:column;line-height:1.35;font-size:14px;color:rgba(0,0,0,.6)}
.map-pin b{font-size:16px;color:#006241;letter-spacing:-.01em}
/* footer */
footer.ft{background:#1E3932;color:#fff;padding:56px 0 36px}
footer.ft .wrap{display:flex;gap:48px;flex-wrap:wrap}
footer.ft .about-col{flex:1 1 280px}
footer.ft .about-col p{color:rgba(255,255,255,.7);font-size:14px;line-height:1.6;margin-top:14px;max-width:280px;margin-bottom:0}
footer.ft .ftcol{flex:1 1 160px}
footer.ft .ftcol .h{font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:#cba258;margin-bottom:14px}
footer.ft .ftcol a,footer.ft .ftcol div{display:block;color:rgba(255,255,255,.72);font-size:14px;margin-bottom:10px;text-decoration:none}
footer.ft .bottom{max-width:1180px;margin:32px auto 0;padding:22px 40px 0;border-top:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.55);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
/* quote modal */
.modal-overlay{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(30,57,50,.55);backdrop-filter:blur(3px)}
.modal-overlay.show{display:flex}
.modal{position:relative;width:100%;max-width:560px;max-height:calc(100vh - 48px);overflow-y:auto;background:#fff;border-radius:16px;padding:34px 32px 30px;box-shadow:0 0 6px rgba(0,0,0,.24),0 24px 48px rgba(0,0,0,.28)}
.modal-x{position:absolute;top:16px;right:16px;width:38px;height:38px;border-radius:50%;border:none;background:#f2f0eb;color:rgba(0,0,0,.6);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s ease}
.modal-x:hover{background:#edebe9;color:#006241}
.modal-head h2{font-size:26px;font-weight:800;letter-spacing:-.5px;color:#006241;margin-top:8px;line-height:1.15;margin-bottom:0}
.modal-head .kr{font-size:14px;color:rgba(0,0,0,.55);margin-top:6px}
.quote-form{margin-top:22px}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fld{display:flex;flex-direction:column}
.fld.full{grid-column:1/-1}
.flab{font-size:12px;font-weight:700;letter-spacing:.02em;color:rgba(0,0,0,.6);margin-bottom:6px}
.flab i{color:#c82014;font-style:normal}
.fld input,.fld select,.fld textarea{font-family:inherit;font-size:15px;color:rgba(0,0,0,.87);background:#fff;border:1px solid #d6dbde;border-radius:8px;padding:11px 13px;outline:none;transition:border-color .15s ease,background .15s ease;width:100%;resize:vertical}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:#00754A;background:hsl(160 32% 87% / .14)}
.fld input::placeholder,.fld textarea::placeholder{color:rgba(0,0,0,.38)}
.modal-note{font-size:12.5px;color:rgba(0,0,0,.62);margin:16px 0 0;line-height:1.5}
.modal-submit{width:100%;justify-content:center;margin-top:14px;padding:14px;font-size:16px;border:none}
/* responsive */
@media(max-width:860px){
.wrap,main .wrap{padding-left:22px;padding-right:22px}
nav.links,.util .links .hide-sm{display:none}
.hamburger{display:flex}
#hero h1{font-size:40px}
.svc-grid,.bn-grid,.cards{grid-template-columns:1fr 1fr}
#feature .copy{padding:48px 0}
}
@media(max-width:560px){
.svc-grid,.bn-grid,.cards{grid-template-columns:1fr}
#hero h1{font-size:34px}
.nav-cta .phone-txt{display:none}
/* the wordmark cannot shrink by default (nowrap flex content) — at phone
   widths tighten the gap, let the mark wrap, and scale it down so the
   header never forces horizontal scroll */
header.nav .wrap{gap:14px}
.mark{min-width:0}
.mark .row{flex-wrap:wrap;row-gap:0}
.mark .name{font-size:22px}
.mark .sub{font-size:15px}
.brand-logo{height:56px}
.fgrid{grid-template-columns:1fr}
.modal{padding:30px 20px 24px}
}
`.trim();
