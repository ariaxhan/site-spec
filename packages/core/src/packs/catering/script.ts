/**
 * Pack behavior, from the approved design: mobile drawer + the mailto-powered
 * quote modal. Deterministic, network-free, and the page is fully usable
 * without it (links and tel:/mailto: CTAs are plain anchors). (7-C)
 */
export const CATERING_SCRIPT = `
(function(){
var navToggle=document.getElementById('navToggle');
var drawer=document.getElementById('navDrawer');
var overlay=document.getElementById('drawerOverlay');
function openDrawer(){drawer.classList.add('show');overlay.classList.add('show');navToggle.setAttribute('aria-expanded','true');}
function closeDrawer(){drawer.classList.remove('show');overlay.classList.remove('show');navToggle.setAttribute('aria-expanded','false');}
if(navToggle&&drawer&&overlay){
navToggle.addEventListener('click',function(){drawer.classList.contains('show')?closeDrawer():openDrawer();});
overlay.addEventListener('click',closeDrawer);
drawer.querySelectorAll('a').forEach(function(a){a.addEventListener('click',closeDrawer);});
}
var qOverlay=document.getElementById('quoteModal');
var form=document.getElementById('quoteForm');
if(qOverlay&&form){
var lastFocus=null;
var open=function(e){if(e)e.preventDefault();lastFocus=document.activeElement;qOverlay.classList.add('show');qOverlay.setAttribute('aria-hidden','false');qOverlay.removeAttribute('inert');document.body.style.overflow='hidden';var first=form.querySelector('input,select,textarea');if(first)setTimeout(function(){first.focus();},60);};
var close=function(){qOverlay.classList.remove('show');qOverlay.setAttribute('aria-hidden','true');qOverlay.setAttribute('inert','');document.body.style.overflow='';if(lastFocus)lastFocus.focus();};
document.querySelectorAll('[data-quote]').forEach(function(el){el.addEventListener('click',open);});
qOverlay.addEventListener('click',function(e){if(e.target===qOverlay||(e.target.closest&&e.target.closest('[data-close]')))close();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&qOverlay.classList.contains('show'))close();});
form.addEventListener('submit',function(e){
e.preventDefault();
var d=new FormData(form);
var name=(d.get('name')||'').toString().trim();
var phone=(d.get('phone')||'').toString().trim();
if(!name||!phone){form.reportValidity();return;}
var L=['Name \\uC131\\uD568: '+name,'Phone \\uC5F0\\uB77D\\uCC98: '+phone,'Email \\uC774\\uBA54\\uC77C: '+(((d.get('email')||'').toString().trim())||'-'),'Event date \\uD589\\uC0AC \\uB0A0\\uC9DC: '+(((d.get('date')||'').toString().trim())||'-'),'Headcount \\uC778\\uC6D0\\uC218: '+d.get('guests'),'Occasion \\uD589\\uC0AC \\uC885\\uB958: '+d.get('occasion'),'','Details \\uC694\\uCCAD \\uC0AC\\uD56D:',((d.get('notes')||'').toString().trim())||'-'];
var subject='Catering quote request \\u00B7 \\uACAC\\uC801 \\uBB38\\uC758 \\u2014 '+name;
window.location.href='mailto:'+form.getAttribute('data-email')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(L.join('\\n'));
});
}
})();
`.trim();
