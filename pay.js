(function(){
'use strict';
const A=window.CCAuth,$=s=>document.querySelector(s),page=document.body.dataset.page;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(m,c)=>{try{return new Intl.NumberFormat('en-KE',{style:'currency',currency:c}).format(m/100);}catch(e){return c+' '+(m/100).toFixed(2);}};
const fmt=s=>{try{return new Date(s).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'});}catch(e){return '';}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function alertBox(el,type,msg){
 if(!el)return;
 if(!msg){el.hidden=true;el.textContent='';return;}
 el.className='alert '+type;el.setAttribute('role',type==='err'?'alert':'status');el.textContent=msg;el.hidden=false;
}
async function fnJson(url,opts){
 try{const r=await fetch(url,opts);const j=await r.json().catch(()=>null);return{ok:r.ok,status:r.status,j:j};}
 catch(e){return{ok:false,status:0,j:null};}
}
async function start(){
 if(!A.ok){$('#loading').hidden=true;alertBox($('#notice'),'info',A.message());return null;}
 const sb=A.getClient();
 const s=await sb.auth.getSession();
 if(!s.data||!s.data.session){location.replace('login.html?next=pay.html');return null;}
 return sb;
}
const token=async sb=>{const s=await sb.auth.getSession();return s.data&&s.data.session?s.data.session.access_token:'';};

async function initPay(){
 const sb=await start();if(!sb)return;
 const cfg=(await fnJson('/.netlify/functions/pay-config')).j||{};
 $('#loading').hidden=true;$('#content').hidden=false;
 const cm=$('#cfgmsg');
 let ready=false;
 if(!cfg.configured)alertBox(cm,'info','Payments are not available here. They work on the live Netlify site once the Paystack and Supabase server settings are added in Netlify.');
 else if(cfg.liveBlocked)alertBox(cm,'err','A live Paystack key is set but live payments are switched off. Use your test key while testing.');
 else{ready=true;alertBox(cm,cfg.test?'info':'ok',cfg.test?'TEST MODE. No real money moves. Use Paystack test payment details.':'Live payments are on.');}

 const pr=await sb.from('products').select('code,name,price_minor,currency').eq('active',true).order('created_at');
 const list=$('#plist');
 if(pr.error)list.innerHTML='<p class="small">Could not load products.</p>';
 else if(!pr.data.length)list.innerHTML='<p class="small">No products yet. Add one in Supabase (products table).</p>';
 else list.innerHTML=pr.data.map(p=>'<article class="card"><h3 style="margin:0">'+esc(p.name)+'</h3><p class="price">'+esc(money(p.price_minor,p.currency))+'</p><button type="button" class="btn btn-primary" data-code="'+esc(p.code)+'"'+(ready?'':' disabled')+'>Pay with Paystack</button></article>').join('');

 list.addEventListener('click',async e=>{
  const b=e.target.closest('[data-code]');
  if(!b||b.disabled)return;
  const old=b.textContent;
  b.disabled=true;b.textContent='Starting payment\u2026';alertBox($('#payerr'));
  const r=await fnJson('/.netlify/functions/paystack-init',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await token(sb)},body:JSON.stringify({product:b.dataset.code})});
  if(!r.ok||!r.j||!r.j.authorization_url){
   b.disabled=false;b.textContent=old;
   alertBox($('#payerr'),'err',(r.j&&r.j.error)||'Could not start the payment. Please try again.');return;
  }
  try{
   const u=new URL(r.j.authorization_url);
   if(u.protocol!=='https:'||!/(^|\.)paystack\.(com|co)$/.test(u.hostname))throw new Error('bad host');
   location.href=u.href;
  }catch(x){b.disabled=false;b.textContent=old;alertBox($('#payerr'),'err','Received an unexpected payment address. Payment cancelled.');}
 });

 const h=await sb.from('payments').select('reference,product_code,amount_minor,currency,status,created_at').order('created_at',{ascending:false}).limit(20);
 const box=$('#history');
 if(h.error)box.innerHTML='<p class="small">Could not load your payments.</p>';
 else if(!h.data.length)box.innerHTML='<p class="small" style="margin:0">No payments yet.</p>';
 else box.innerHTML=h.data.map(x=>'<div class="pay-row"><span><strong>'+esc(x.product_code)+'</strong> &middot; '+esc(money(x.amount_minor,x.currency))+'</span><span class="small">'+esc(fmt(x.created_at))+' &middot; '+esc(x.status)+'</span><span class="small">'+esc(x.reference)+'</span></div>').join('');
}

async function initResult(){
 const sb=await start();if(!sb)return;
 const q=new URLSearchParams(location.search);
 const ref=q.get('reference')||q.get('trxref')||'';
 $('#loading').hidden=true;
 if(!/^[A-Za-z0-9_-]{6,80}$/.test(ref)){alertBox($('#notice'),'err','No payment reference was found in this link.');return;}
 $('#result').hidden=false;$('#rref').textContent=ref;
 const say=(t,x)=>{$('#rtitle').textContent=t;$('#rtext').textContent=x;};
 for(let i=0;i<6;i++){
  const r=await fnJson('/.netlify/functions/paystack-verify?reference='+encodeURIComponent(ref),{headers:{Authorization:'Bearer '+await token(sb)}});
  const st=r.j&&r.j.status;
  if(st==='success'){say('Payment confirmed','Paystack confirmed your payment. Thank you.');return;}
  if(st==='failed'||st==='abandoned'){say('Payment not completed','The payment was not completed and you have not been charged. You can try again.');return;}
  if(st==='mismatch'){say('We could not confirm this payment','The amount did not match what we expected. Please contact support and quote the reference below.');return;}
  if(r.status===401||r.status===404||r.status===503||r.status===400){say('We could not check this payment',(r.j&&r.j.error)||'Please try again from the payments page.');return;}
  say('Waiting for confirmation\u2026','This can take a few seconds.');
  await wait(3000);
 }
 say('Still waiting','We have not received confirmation yet. This can take a minute. Refresh this page, or check your payments list shortly.');
}

if(page==='pay')initPay();else if(page==='result')initResult();
})();
