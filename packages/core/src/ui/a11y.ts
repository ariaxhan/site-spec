/**
 * A real accessibility widget — font sizing, high contrast, reduced motion —
 * with localStorage persistence and a pre-paint restore (no flash). Ported from
 * a production accessibility pattern. Pure strings; no framework.
 */

/** Inline, runs before paint in <head> to restore saved a11y prefs without flash. */
export const A11Y_PREPAINT =
  `<script>(function(){try{var r=document.documentElement;` +
  `var f=parseFloat(localStorage.getItem('ss-a11y-font')||'');` +
  `if(f>=14&&f<=24)r.style.fontSize=f+'px';` +
  `if(localStorage.getItem('ss-a11y-contrast')==='1')r.classList.add('a11y-high-contrast');` +
  `if(localStorage.getItem('ss-a11y-motion')==='1')r.classList.add('a11y-reduce-motion');` +
  `}catch(e){}})();</script>`;

/** The floating widget (button + panel) plus its behavior script, for the <body>. */
export function a11yWidget(): string {
  const panel =
    `<div id="a11y-panel" class="a11y-panel" hidden>` +
    `<p>Accessibility</p>` +
    `<button type="button" data-a11y="font-up">Larger text</button>` +
    `<button type="button" data-a11y="font-down">Smaller text</button>` +
    `<button type="button" data-a11y="contrast" aria-pressed="false">High contrast</button>` +
    `<button type="button" data-a11y="motion" aria-pressed="false">Reduce motion</button>` +
    `<button type="button" data-a11y="reset">Reset</button>` +
    `</div>`;
  const widget =
    `<div class="a11y" data-a11y-root>` +
    `<button type="button" class="a11y-btn" aria-expanded="false" aria-controls="a11y-panel" aria-label="Accessibility options">A</button>` +
    panel +
    `</div>`;
  const script =
    `<script>(function(){var root=document.querySelector('[data-a11y-root]');if(!root)return;` +
    `var html=document.documentElement,btn=root.querySelector('.a11y-btn'),panel=root.querySelector('#a11y-panel');` +
    `function save(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}}` +
    `btn.addEventListener('click',function(){var o=panel.hasAttribute('hidden');` +
    `if(o)panel.removeAttribute('hidden');else panel.setAttribute('hidden','');` +
    `btn.setAttribute('aria-expanded',String(o));});` +
    `root.querySelectorAll('[data-a11y]').forEach(function(b){b.addEventListener('click',function(){` +
    `var a=b.getAttribute('data-a11y');` +
    `if(a==='font-up'||a==='font-down'){var c=parseFloat(html.style.fontSize)||16;c+=a==='font-up'?2:-2;` +
    `c=Math.max(14,Math.min(24,c));html.style.fontSize=c+'px';save('ss-a11y-font',String(c));}` +
    `else if(a==='contrast'){var on=html.classList.toggle('a11y-high-contrast');b.setAttribute('aria-pressed',String(on));save('ss-a11y-contrast',on?'1':null);}` +
    `else if(a==='motion'){var m=html.classList.toggle('a11y-reduce-motion');b.setAttribute('aria-pressed',String(m));save('ss-a11y-motion',m?'1':null);}` +
    `else if(a==='reset'){html.style.fontSize='';html.classList.remove('a11y-high-contrast','a11y-reduce-motion');` +
    `save('ss-a11y-font',null);save('ss-a11y-contrast',null);save('ss-a11y-motion',null);` +
    `root.querySelectorAll('[aria-pressed]').forEach(function(x){x.setAttribute('aria-pressed','false');});}` +
    `});});` +
    `document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hasAttribute('hidden')){` +
    `panel.setAttribute('hidden','');btn.setAttribute('aria-expanded','false');btn.focus();}});` +
    `})();</script>`;
  return widget + script;
}
