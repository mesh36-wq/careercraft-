(function(){
'use strict';
const A=window.CCAuth,ICON=window.CCIcon,$=s=>document.querySelector(s);
const page=document.body.dataset.page;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const safe=async p=>{try{return await p;}catch(e){return{data:null,error:e};}};
const fmtDate=s=>{try{return new Date(s).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'});}catch(e){return '';}};

function alertBox(el,type,msg){
 if(!el)return;
 if(!msg){el.hidden=true;el.textContent='';return;}
 el.className='alert '+type;
 el.setAttribute('role',type==='err'?'alert':'status');
 el.textContent=msg;el.hidden=false;
}
function busy(btn,on,label){
 btn.disabled=on;btn.classList.toggle('loading',on);
 btn.innerHTML=on?'<span class="spin" aria-hidden="true"></span>'+label:label;
}
function fieldErr(id,msg){
 const m=$('#e-'+id),i=$('#'+id);
 if(m)m.textContent=msg||'';
 if(i)i.setAttribute('aria-invalid',msg?'true':'false');
 return !msg;
}
function disableForm(f){f.querySelectorAll('input,button').forEach(x=>{x.disabled=true;});}
function friendly(err){
 const m=((err&&err.message)||'').toLowerCase(),st=err&&err.status;
 if(m.includes('invalid login'))return 'Email or password is incorrect.';
 if(m.includes('not confirmed'))return 'Please verify your email address first. Check your inbox for the verification link.';
 if(m.includes('rate limit')||st===429)return 'Too many attempts. Please wait a few minutes and try again.';
 if(m.includes('fetch')||m.includes('network'))return 'Could not reach the sign-in service. Check your internet connection and try again.';
 if(m.includes('already registered'))return 'An account with this email may already exist. Try logging in, or reset your password.';
 if(m.includes('same password')||m.includes('different from the old'))return 'Choose a password that is different from your old one.';
 if(m.includes('weak')||m.includes('password should'))return 'That password is too weak. Use at least 8 characters with letters and numbers.';
 return 'Something went wrong. Please try again.';
}
function wirePw(){
 document.querySelectorAll('.pw').forEach(w=>{
  const i=w.querySelector('input'),b=w.querySelector('.pw-toggle');
  b.innerHTML=ICON('eye',20);
  b.addEventListener('click',()=>{
   const show=i.type==='password';
   i.type=show?'text':'password';
   b.innerHTML=ICON(show?'eyeoff':'eye',20);
   b.setAttribute('aria-pressed',String(show));
   b.setAttribute('aria-label',show?'Hide password':'Show password');
  });
 });
}
function pwRules(p){return [
 [p.length>=8,'At least 8 characters',true],
 [/[A-Za-z]/.test(p)&&/\d/.test(p),'At least one letter and one number',true],
 [/[a-z]/.test(p)&&/[A-Z]/.test(p),'Upper and lower case letters (recommended)',false],
 [/[^A-Za-z0-9]/.test(p)||p.length>=12,'A symbol, or 12 or more characters (recommended)',false]
];}
const pwOk=p=>pwRules(p).filter(r=>r[2]).every(r=>r[0]);
function wireStrength(){
 const inp=$('#password'),ul=$('#reqs'),meter=$('#meter');
 if(!inp||!ul)return;
 const upd=()=>{
  const r=pwRules(inp.value);
  ul.innerHTML=r.map(x=>'<li class="'+(x[0]?'ok':'')+'">'+x[1]+'</li>').join('');
  const score=inp.value?Math.max(1,r.filter(x=>x[0]).length):0;
  meter.dataset.s=String(score);
  $('#meterTxt').textContent=inp.value?'Strength: '+['','Weak','Fair','Good','Strong'][score]:'';
 };
 inp.addEventListener('input',upd);upd();
}
async function resendVerification(email,al,btn){
 const sb=A.getClient();
 if(btn)btn.disabled=true;
 const r=await safe(sb.auth.resend({type:'signup',email:email,options:{emailRedirectTo:A.url('login.html')}}));
 if(r.error){console.error(r.error);alertBox(al,'err',friendly(r.error));if(btn)btn.disabled=false;return;}
 alertBox(al,'ok','Verification email sent. Please check your inbox and spam folder.');
 if(btn)setTimeout(()=>{btn.disabled=false;},60000);
}

/* ---------- login ---------- */
function initLogin(){
 const form=$('#form'),al=$('#alert'),btn=$('#submit');
 if(!A.ok){alertBox(al,'info',A.message());disableForm(form);return;}
 const sb=A.getClient();
 sb.auth.getSession().then(r=>{if(r.data&&r.data.session)location.replace(A.nextUrl());});
 form.addEventListener('submit',async e=>{
  e.preventDefault();alertBox(al);$('#resendWrap').hidden=true;
  const email=$('#email').value.trim(),pw=$('#password').value;
  let ok=true;
  ok=fieldErr('email',emailOk(email)?'':'Enter a valid email address.')&&ok;
  ok=fieldErr('password',pw?'':'Enter your password.')&&ok;
  if(!ok){const f=form.querySelector('[aria-invalid="true"]');if(f)f.focus();return;}
  busy(btn,true,'Logging in\u2026');
  const r=await safe(sb.auth.signInWithPassword({email:email,password:pw}));
  if(r.error){
   console.error(r.error);busy(btn,false,'Log In');
   if(/not confirmed/i.test(r.error.message||''))$('#resendWrap').hidden=false;
   alertBox(al,'err',friendly(r.error));return;
  }
  alertBox(al,'ok','Signed in. Taking you to your account\u2026');
  setTimeout(()=>location.replace(A.nextUrl()),500);
 });
 $('#resend').addEventListener('click',()=>{
  const email=$('#email').value.trim();
  if(!emailOk(email)){fieldErr('email','Enter your email address first.');$('#email').focus();return;}
  resendVerification(email,al,$('#resend'));
 });
}

/* ---------- register ---------- */
function initRegister(){
 const form=$('#form'),al=$('#alert'),btn=$('#submit');
 if(!A.ok){alertBox(al,'info',A.message());disableForm(form);return;}
 const sb=A.getClient();
 form.addEventListener('submit',async e=>{
  e.preventDefault();alertBox(al);
  const name=$('#name').value.trim(),email=$('#email').value.trim(),pw=$('#password').value,cf=$('#confirm').value,terms=$('#terms').checked;
  let ok=true;
  ok=fieldErr('name',name.length>=2?'':'Please enter your full name.')&&ok;
  ok=fieldErr('email',emailOk(email)?'':'Enter a valid email address.')&&ok;
  ok=fieldErr('password',pwOk(pw)?'':'Use at least 8 characters, including a letter and a number.')&&ok;
  ok=fieldErr('confirm',pw&&pw===cf?'':'The passwords do not match.')&&ok;
  ok=fieldErr('terms',terms?'':'Please agree to the Terms and Privacy Policy to continue.')&&ok;
  if(!ok){const f=form.querySelector('[aria-invalid="true"]');if(f)f.focus();return;}
  busy(btn,true,'Creating account\u2026');
  const r=await safe(sb.auth.signUp({email:email,password:pw,options:{data:{full_name:name},emailRedirectTo:A.url('login.html')}}));
  if(r.error){console.error(r.error);busy(btn,false,'Create Account');alertBox(al,'err',friendly(r.error));return;}
  const u=r.data&&r.data.user;
  if(u&&Array.isArray(u.identities)&&u.identities.length===0){
   busy(btn,false,'Create Account');
   alertBox(al,'info','An account with this email may already exist. Try logging in, or reset your password.');return;
  }
  if(r.data&&r.data.session){
   alertBox(al,'ok','Account created. Email verification is switched off for this project, so your email is not verified yet.');
   setTimeout(()=>location.replace('account.html'),1500);return;
  }
  form.hidden=true;$('#intro').hidden=true;
  $('#doneEmail').textContent=email;
  $('#done').hidden=false;
  $('#resendReg').addEventListener('click',()=>resendVerification(email,$('#alert2'),$('#resendReg')));
 });
}

/* ---------- forgot password ---------- */
function initForgot(){
 const form=$('#form'),al=$('#alert'),btn=$('#submit');
 if(!A.ok){alertBox(al,'info',A.message());disableForm(form);return;}
 const sb=A.getClient();
 form.addEventListener('submit',async e=>{
  e.preventDefault();alertBox(al);
  const email=$('#email').value.trim();
  if(!fieldErr('email',emailOk(email)?'':'Enter a valid email address.')){$('#email').focus();return;}
  busy(btn,true,'Sending\u2026');
  const r=await safe(sb.auth.resetPasswordForEmail(email,{redirectTo:A.url('reset.html')}));
  busy(btn,false,'Send Reset Link');
  if(r.error&&(r.error.status===429||/rate|fetch|network/i.test(r.error.message||''))){console.error(r.error);alertBox(al,'err',friendly(r.error));return;}
  if(r.error)console.error(r.error);
  alertBox(al,'ok','If an account exists for that email, we have sent a link to reset your password. Check your inbox and spam folder.');
 });
}

/* ---------- reset password ---------- */
function initReset(){
 const form=$('#form'),al=$('#alert'),btn=$('#submit');
 if(!A.ok){$('#wait').hidden=true;alertBox(al,'info',A.message());return;}
 const sb=A.getClient();
 let shown=false;
 const showForm=()=>{if(shown)return;shown=true;$('#wait').hidden=true;$('#invalid').hidden=true;form.hidden=false;};
 sb.auth.onAuthStateChange((ev,sess)=>{if(ev==='PASSWORD_RECOVERY'||(sess&&ev==='SIGNED_IN'))showForm();});
 sb.auth.getSession().then(r=>{if(r.data&&r.data.session)showForm();});
 setTimeout(()=>{if(!shown){$('#wait').hidden=true;$('#invalid').hidden=false;}},4000);
 form.addEventListener('submit',async e=>{
  e.preventDefault();alertBox(al);
  const pw=$('#password').value,cf=$('#confirm').value;
  let ok=true;
  ok=fieldErr('password',pwOk(pw)?'':'Use at least 8 characters, including a letter and a number.')&&ok;
  ok=fieldErr('confirm',pw&&pw===cf?'':'The passwords do not match.')&&ok;
  if(!ok){const f=form.querySelector('[aria-invalid="true"]');if(f)f.focus();return;}
  busy(btn,true,'Saving\u2026');
  const r=await safe(sb.auth.updateUser({password:pw}));
  if(r.error){console.error(r.error);busy(btn,false,'Update Password');alertBox(al,'err',friendly(r.error));return;}
  alertBox(al,'ok','Your password has been updated. Taking you to your account\u2026');
  setTimeout(()=>location.replace('account.html'),1500);
 });
}

/* ---------- shared: require a signed-in user ---------- */
async function requireUser(al,loading,next){
 if(!A.ok){loading.hidden=true;alertBox(al,'info',A.message());return null;}
 const sb=A.getClient();
 const s=await safe(sb.auth.getSession());
 if(!s.data||!s.data.session){location.replace('login.html?next='+next);return null;}
 const u=await safe(sb.auth.getUser());
 if(u.error||!u.data||!u.data.user){await safe(sb.auth.signOut());location.replace('login.html?next='+next);return null;}
 sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT')location.replace('login.html');});
 return {sb:sb,user:u.data.user};
}

/* ---------- account ---------- */
async function initAccount(){
 const note=$('#notice'),loading=$('#loading'),content=$('#content');
 const ctx=await requireUser(note,loading,'account.html');
 if(!ctx)return;
 const sb=ctx.sb,user=ctx.user;
 const r=await safe(sb.from('profiles').select('full_name,email,role,status,created_at').eq('id',user.id).maybeSingle());
 let prof=null;
 if(r.error||!r.data){
  console.error(r.error);
  alertBox(note,'err','Your profile could not be loaded. If you run this site, check that the database setup (SQL) has been run.');
 }else prof=r.data;
 let name=(prof&&prof.full_name)||(user.user_metadata&&user.user_metadata.full_name)||'';
 const setName=n=>{
  name=n;
  $('#welcome').textContent='Welcome'+(n?', '+n.split(' ')[0]:'')+'.';
  $('#kName').textContent=n||'Not set';
 };
 setName(name);
 $('#kEmail').textContent=user.email||'';
 $('#kSince').textContent=fmtDate((prof&&prof.created_at)||user.created_at)||'';
 const verified=!!user.email_confirmed_at;
 $('#kVerified').innerHTML=verified?'<span class="badge ok">Verified</span>':'<span class="badge warn">Not verified</span>';
 $('#verifyBox').hidden=verified;
 const status=(prof&&prof.status)||'active';
 $('#kStatus').innerHTML=status==='active'?'<span class="badge ok">Active</span>':'<span class="badge bad">Suspended</span>';
 if(status!=='active')alertBox(note,'err','This account is suspended. Please contact the site owner.');
 if(prof&&prof.role==='admin')$('#adminLink').hidden=false;
 $('#nameIn').value=name;
 loading.hidden=true;content.hidden=false;

 $('#resendVer').addEventListener('click',()=>resendVerification(user.email,$('#vmsg'),$('#resendVer')));
 $('#pform').addEventListener('submit',async e=>{
  e.preventDefault();
  const pm=$('#pmsg'),btn=$('#psave'),v=$('#nameIn').value.trim();
  alertBox(pm);
  if(!fieldErr('nameIn',v.length>=2&&v.length<=100?'':'Enter your name (2 to 100 characters).'))return;
  busy(btn,true,'Saving\u2026');
  const u=await safe(sb.from('profiles').update({full_name:v}).eq('id',user.id).select('full_name').maybeSingle());
  busy(btn,false,'Save Changes');
  if(u.error||!u.data){console.error(u.error);alertBox(pm,'err','Could not save your changes. Please try again.');return;}
  await safe(sb.auth.updateUser({data:{full_name:v}}));
  setName(v);
  alertBox(pm,'ok','Profile updated.');
 });
 $('#logout').addEventListener('click',async()=>{
  $('#logout').disabled=true;
  await safe(sb.auth.signOut());
  location.href='index.html';
 });
}

/* ---------- admin: accounts ---------- */
async function initAdmin(){
 const note=$('#notice'),loading=$('#loading');
 const ctx=await requireUser(note,loading,'admin.html');
 if(!ctx)return;
 const sb=ctx.sb,user=ctx.user;
 const me=await safe(sb.from('profiles').select('role,status').eq('id',user.id).maybeSingle());
 loading.hidden=true;
 if(me.error||!me.data||me.data.role!=='admin'||me.data.status!=='active'){$('#denied').hidden=false;return;}
 $('#panel').hidden=false;
 const PAGE=50;
 let rows=[],total=0,q='',busyLoad=false;
 const list=$('#alist'),more=$('#more'),count=$('#count');
 function render(){
  list.innerHTML='<div class="arow head"><span>Name</span><span>Email</span><span>Registered</span><span>Verification</span><span>Status</span></div>'+
  (rows.length?rows.map(x=>'<div class="arow">'
   +'<span class="c" data-l="Name"><strong>'+esc(x.full_name||'(no name)')+'</strong>'+(x.role==='admin'?' <span class="badge gold">Admin</span>':'')+'</span>'
   +'<span class="c" data-l="Email">'+esc(x.email||'')+'</span>'
   +'<span class="c" data-l="Registered">'+esc(fmtDate(x.created_at))+'</span>'
   +'<span class="c" data-l="Verification">'+(x.email_confirmed_at?'<span class="badge ok">Verified</span>':'<span class="badge warn">Not verified</span>')+'</span>'
   +'<span class="c" data-l="Status">'+(x.status==='active'?'<span class="badge ok">Active</span>':'<span class="badge bad">Suspended</span>')+'</span>'
   +'</div>').join(''):'<div class="arow"><span class="small">No accounts found.</span></div>');
  count.textContent='Showing '+rows.length+' of '+total+' accounts';
  more.hidden=rows.length>=total;
 }
 async function load(reset){
  if(busyLoad)return;
  busyLoad=true;
  if(reset)rows=[];
  let qb=sb.from('profiles').select('id,full_name,email,created_at,email_confirmed_at,status,role',{count:'exact'});
  if(q)qb=qb.or('full_name.ilike.%'+q+'%,email.ilike.%'+q+'%');
  qb=qb.order('created_at',{ascending:false}).range(rows.length,rows.length+PAGE-1);
  const r=await safe(qb);
  busyLoad=false;
  if(r.error){console.error(r.error);alertBox(note,'err','Could not load accounts. Please try again.');return;}
  alertBox(note);
  rows=rows.concat(r.data||[]);
  total=r.count||rows.length;
  render();
 }
 let t=null;
 $('#q').addEventListener('input',e=>{
  clearTimeout(t);
  t=setTimeout(()=>{q=e.target.value.replace(/[%_,()*\\"']/g,' ').trim().slice(0,60);load(true);},350);
 });
 more.addEventListener('click',()=>load(false));
 load(true);
}

/* ---------- start ---------- */
if(page!=='account'&&page!=='admin')wirePw();
if(page==='register'||page==='reset')wireStrength();
({login:initLogin,register:initRegister,forgot:initForgot,reset:initReset,account:initAccount,admin:initAdmin}[page]||function(){})();
})();
