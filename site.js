(function(){
'use strict';
var cfg=window.CC_CONFIG||{};
var P={
plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
up:'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
down:'<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
copy:'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
check:'<path d="M20 6 9 17l-5-5"/>',
x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
menu:'<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
pencil:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
eyeoff:'<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
};
function icon(n,s){s=s||18;return '<svg class="ic" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(P[n]||'')+'</svg>';}
window.CCIcon=icon;
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

var f=document.createElement('link');
f.rel='stylesheet';
f.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap';
document.head.appendChild(f);

var here=(location.pathname.split('/').pop()||'index').replace(/\.html$/,'')||'index';
function signedIn(){
  try{
    var m=String(cfg.SUPABASE_URL||'').match(/^https?:\/\/([^.]+)\./);
    return !!(m&&localStorage.getItem('sb-'+m[1]+'-auth-token'));
  }catch(e){return false;}
}
var mail=(cfg.CONTACT_EMAIL&&/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(cfg.CONTACT_EMAIL))?cfg.CONTACT_EMAIL:'';
var links=[['index.html','Home','index'],['templates.html','Templates','templates'],['index.html#features','Features',''],['pricing.html','Pricing','pricing']];

var h=document.getElementById('site-header');
if(h){
  h.innerHTML='<header class="site-header"><div class="hd-in">'+
  '<a class="brand" href="index.html"><span class="logo-mark" aria-hidden="true">CC</span><span>CareerCraft <em>Kenya</em></span></a>'+
  '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mainNav" aria-label="Open menu">'+icon('menu',22)+'</button>'+
  '<nav class="main-nav" id="mainNav" aria-label="Main">'+
  links.map(function(l){return '<a href="'+l[0]+'"'+(l[2]&&l[2]===here?' aria-current="page"':'')+'>'+l[1]+'</a>';}).join('')+
  (signedIn()?'<a class="nav-login" href="account.html">Account</a>':'<a class="nav-login" href="login.html">Log In</a>')+
  '<a class="nav-cta" href="cv.html">Create My CV</a>'+
  '</nav></div></header>';
  var t=h.querySelector('.nav-toggle'),n=h.querySelector('.main-nav');
  t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',String(o));t.setAttribute('aria-label',o?'Close menu':'Open menu');});
}

var ft=document.getElementById('site-footer');
if(ft){
  ft.innerHTML='<footer class="site-footer"><div class="wrap">'+
  '<div class="ft-grid">'+
  '<div><strong class="ft-brand">CareerCraft Kenya</strong><p>Professional CVs for the Kenyan job market.</p>'+(mail?'<p><a href="mailto:'+esc(mail)+'">'+esc(mail)+'</a></p>':'')+'</div>'+
  '<div><h2>Product</h2><a href="cv.html">CV Builder</a><a href="templates.html">Templates</a><a href="pricing.html">Pricing</a></div>'+
  '<div><h2>Account</h2><a href="login.html">Log In</a><a href="register.html">Create Account</a></div>'+
  '<div><h2>Support</h2><a href="help.html">Help</a><a href="'+(mail?'mailto:'+esc(mail):'help.html#contact')+'">Contact</a></div>'+
  '<div><h2>Legal</h2><a href="legal.html#privacy">Privacy Policy</a><a href="legal.html#terms">Terms of Service</a></div>'+
  '</div>'+
  '<p class="ft-note">CareerCraft Kenya provides document tools only and does not guarantee interviews, job offers or results with any employer or screening system. &copy; '+new Date().getFullYear()+'</p>'+
  '</div></footer>';
}

var ct=document.getElementById('contactText');
if(ct&&mail){ct.innerHTML='Email us at <a href="mailto:'+esc(mail)+'">'+esc(mail)+'</a>.';}
})();
