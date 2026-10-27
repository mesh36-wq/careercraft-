(function(){
'use strict';
const C=window.CC,icon=window.CCIcon;
const esc=C.esc,TEMPLATES=C.TEMPLATES,EXTRA=C.EXTRA;
const $=s=>document.querySelector(s);
const DK='cc_docs_v2',OLD='cc_cv_v1',SKIP='cc_skip_print_tip';
const STEPS=[['personal','Personal Information','Personal'],['summary','Professional Summary','Summary'],['exp','Work Experience','Experience'],['edu','Education','Education'],['skills','Skills','Skills'],['extra','Additional Sections','Extras'],['review','Review and Download','Review']];
const VERBS=['Achieved','Analysed','Assisted','Built','Coordinated','Created','Delivered','Developed','Improved','Led','Managed','Organised','Planned','Prepared','Reduced','Resolved','Supported','Trained'];
const WEAK=[
 ['responsible for','Try an action verb instead, such as "Managed", "Led" or "Coordinated".'],
 ['duties included','Describe what you achieved, not only what the job required.'],
 ['worked on','Say what you actually did, e.g. "Developed", "Maintained" or "Supported".'],
 ['helped with','Be specific about your own contribution.'],
 ['hard working','Show this with an achievement instead of a label.'],
 ['team player','Show teamwork with a real example instead of a label.'],
 ['self motivated','Show initiative with a real example instead.'],
 ['results oriented','Replace this with a specific result you achieved.'],
 ['detail oriented','Show this with an example, such as checking records accurately.'],
 ['people person','Describe the work you did with people instead.'],
 ['think outside the box','Replace this cliche with a specific example.']
];
const uid=()=>'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const getList=l=>l.indexOf('x:')===0?d.extras[l.slice(2)]:d[l];
const hasContent=it=>Object.keys(it).some(k=>typeof it[k]==='string'&&it[k].trim());

/* ---------- storage (multiple CVs) ---------- */
function loadStore(){
 let s=null;
 try{
  const j=JSON.parse(localStorage.getItem(DK));
  if(j&&j.docs&&typeof j.docs==='object'){
   const docs={};
   Object.keys(j.docs).slice(0,50).forEach(id=>{const x=j.docs[id];if(x&&typeof x==='object')docs[id]={name:String(x.name||'My CV').slice(0,80),updated:+x.updated||Date.now(),data:C.normalize(x.data)};});
   if(Object.keys(docs).length)s={current:docs[j.current]?j.current:Object.keys(docs)[0],docs:docs};
  }
 }catch(e){}
 if(!s){
  let old=null;try{old=JSON.parse(localStorage.getItem(OLD));}catch(e){}
  const id=uid();s={current:id,docs:{}};s.docs[id]={name:'My CV',updated:Date.now(),data:C.normalize(old)};
 }
 return s;
}
let store=loadStore();
let d=store.docs[store.current].data;
let step=0,lastTA=null,sig='',zoom=null,timer=null,dirty=false,raf=0;
const touched={};
try{const v=+sessionStorage.getItem('cc_step');if(v>=0&&v<STEPS.length)step=v;}catch(e){}

const stat=$('#saveStatus');
function setStatus(t,c){stat.textContent=t;stat.className='status '+(c||'');}
function persist(){
 clearTimeout(timer);
 store.docs[store.current].updated=Date.now();
 try{localStorage.setItem(DK,JSON.stringify(store));dirty=false;setStatus('Saved at '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),'ok');return true;}
 catch(e){setStatus('Unable to save. Export a backup.','bad');return false;}
}
function scheduleSave(){dirty=true;setStatus('Saving\u2026','');clearTimeout(timer);timer=setTimeout(persist,400);}
window.addEventListener('pagehide',()=>{if(dirty)persist();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)persist();});

const toastEl=$('#toast');let tt;
function toast(m,bad){toastEl.textContent=m;toastEl.className='toast'+(bad?' bad':'');toastEl.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{toastEl.hidden=true;},bad?6000:3500);}

function preview(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>C.mount($('#paper'),d));}
function changed(){scheduleSave();preview();updateStepper();}

/* ---------- validation ---------- */
function urlRule(v){v=v.trim();return !v||/^(https?:\/\/)?[^\s\/.]+(\.[^\s\/.]+)+(\/\S*)?$/i.test(v)?'':'Enter a web address such as linkedin.com/in/yourname.';}
const RULES={
 name:v=>v.trim()?'':'Please enter your full name.',
 email:v=>!v.trim()?'Please enter your email address.':(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())?'':'This email looks incomplete. Example: name@example.com'),
 phone:v=>(!v.trim()||(/^[+\d][\d\s().-]{5,}$/.test(v.trim())&&v.replace(/\D/g,'').length>=7))?'':'Enter a phone number such as +254 7xx xxx xxx.',
 linkedin:urlRule,
 website:urlRule
};
function showMsg(k){
 const el=$('#m-'+k),inp=$('#p-'+k);
 if(!el||!RULES[k])return;
 const m=RULES[k](d[k]||'');
 el.textContent=m;
 if(inp)inp.setAttribute('aria-invalid',m?'true':'false');
}

/* ---------- writing tips (rule-based, no AI) ---------- */
function analyse(t,kind){
 const out=[];
 const low=' '+t.toLowerCase().replace(/[-\u2013\u2014]/g,' ').replace(/\s+/g,' ')+' ';
 WEAK.forEach(w=>{if(low.indexOf(w[0])>-1)out.push('\u201c'+w[0]+'\u201d: '+w[1]);});
 const lines=t.split('\n').map(s=>s.trim()).filter(Boolean);
 if(kind==='bullets'){
  if(lines.some(l=>/^(i|my)\b/i.test(l)))out.push('Start each point with an action verb instead of \u201cI\u201d or \u201cMy\u201d.');
  if(lines.length>=2&&!/\d/.test(t))out.push('If it is true, add real numbers (how many, how often, how much). Never invent figures.');
  if(lines.some(l=>l.length>200))out.push('One point is very long. Try splitting it in two.');
  if(lines.length>8)out.push('That is a lot of points. Keep the strongest 3 to 6 for each role.');
 }
 if(kind==='summary'){
  const n=t.trim().length;
  if(n&&n<120)out.push('Quite short. Two to four sentences usually work well.');
  if(n>650)out.push('Quite long. Aim for about four sentences.');
 }
 return out;
}
function updateHint(ta){
 const box=ta.parentElement.querySelector('.hint');
 if(!box)return;
 const m=ta.value.trim()?analyse(ta.value,ta.dataset.hint):[];
 if(!m.length){box.hidden=true;box.innerHTML='';return;}
 box.hidden=false;
 box.innerHTML='<strong>Writing tips</strong><ul>'+m.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
}

/* ---------- panel helpers ---------- */
function pf(key,label,o){
 o=o||{};
 return '<div class="field"><label for="p-'+key+'">'+label+(o.req?' <span class="req">(required)</span>':' <span class="opt">(optional)</span>')+'</label><input id="p-'+key+'" data-p="'+key+'" type="'+(o.type||'text')+'" value="'+esc(d[key])+'" placeholder="'+esc(o.ph||'')+'" autocomplete="'+(o.ac||'off')+'"'+(o.inputmode?' inputmode="'+o.inputmode+'"':'')+' aria-describedby="m-'+key+'"><small class="msg" id="m-'+key+'" aria-live="polite"></small></div>';
}
function lf(l,i,f,label,o){
 o=o||{};
 const it=getList(l)[i],id='l-'+l.replace(':','-')+'-'+i+'-'+f,v=esc(it[f]||'');
 const at='data-l="'+l+'" data-i="'+i+'" data-f="'+f+'"';
 const ctl=o.ta
  ?'<textarea id="'+id+'" '+at+(o.hint?' data-hint="'+o.hint+'"':'')+' rows="'+(o.rows||3)+'" placeholder="'+esc(o.ph||'')+'" spellcheck="true">'+v+'</textarea>'
  :'<input id="'+id+'" '+at+' type="text" value="'+v+'" placeholder="'+esc(o.ph||'')+'"'+(o.dis?' disabled':'')+'>';
 return '<div class="field"><label for="'+id+'">'+label+'</label>'+ctl+(o.hint?'<div class="hint" hidden></div>':'')+'</div>';
}
function ib(op,l,i,label,dis){
 const ic={up:'up',down:'down',dup:'copy',del:'trash'}[op];
 return '<button type="button" class="icon-btn" data-op="'+op+'" data-l="'+l+'" data-i="'+i+'" aria-label="'+esc(label)+'"'+(dis?' disabled':'')+'>'+icon(ic)+'</button>';
}
function itemTools(l,i,n,name){
 const nm=name+' '+(i+1);
 return '<div class="tools">'+ib('up',l,i,'Move '+nm+' up',i===0)+ib('down',l,i,'Move '+nm+' down',i===n-1)+ib('dup',l,i,'Duplicate '+nm,false)+ib('del',l,i,'Delete '+nm,false)+'</div>';
}
const emptyState=(t,p)=>'<div class="empty-state"><p><strong>'+t+'</strong></p><p>'+p+'</p></div>';
const addBtn=(l,label)=>'<button type="button" class="btn btn-add" data-op="add" data-l="'+l+'">'+icon('plus')+label+'</button>';
function verbBox(){
 return '<details class="verbs"><summary>Action verb ideas</summary><p class="small">Tap a verb to add it to the achievements box you last used. Only describe what you really did.</p><div class="chips">'+VERBS.map(v=>'<button type="button" class="chip" data-verb="'+v+'">'+v+'</button>').join('')+'</div></details>';
}

/* ---------- panels ---------- */
function panelPersonal(){
 return '<h2 class="ph2">Personal Information</h2><p class="lead">Only add what you are comfortable sharing. A name and email are enough to start.</p>'
 +pf('name','Full name',{req:1,ph:'e.g. Jane Wanjiku Mwangi',ac:'name'})
 +pf('title','Professional title',{ph:'e.g. Accounts Assistant'})
 +pf('email','Email address',{req:1,type:'email',ph:'name@example.com',ac:'email',inputmode:'email'})
 +pf('phone','Phone number',{type:'tel',ph:'+254 7xx xxx xxx',ac:'tel',inputmode:'tel'})
 +pf('location','Location',{ph:'e.g. Nairobi, Kenya'})
 +pf('linkedin','LinkedIn profile',{ph:'linkedin.com/in/yourname',inputmode:'url'})
 +pf('website','Portfolio or website',{ph:'yourname.com',inputmode:'url'});
}
function panelSummary(){
 return '<h2 class="ph2">Professional Summary</h2><p class="lead">Two to four sentences: who you are, what you do well, and what you are looking for.</p>'
 +'<div class="field"><label for="p-summary">Summary <span class="opt">(optional)</span></label><textarea id="p-summary" data-p="summary" data-hint="summary" rows="6" spellcheck="true" placeholder="e.g. Recent [qualification] graduate with experience in [area]. Strong at [skill]. Looking for a [role] position where I can [goal].">'+esc(d.summary)+'</textarea><small class="count" id="sumCount">'+d.summary.length+' characters</small><div class="hint" hidden></div></div>'
 +'<div class="tip"><strong>About these tips</strong><p>Writing tips are simple rule-based checks that run in your browser. No AI service is connected and nothing you type leaves your device. Only write what is true.</p></div>';
}
function panelExp(){
 let h='<h2 class="ph2">Work Experience</h2><p class="lead">Most recent first. Include internships, attachments and volunteer work if you are just starting out.</p>'+verbBox();
 if(!d.exp.length)h+=emptyState('No positions added yet.','Add a job, internship or attachment. You can skip this step if you have no experience yet.');
 h+=d.exp.map((x,i)=>{
  const fb='Position '+(i+1);
  return '<article class="item-card" data-fb="'+fb+'"><div class="item-head"><h3>'+esc(x.role||x.org||fb)+'</h3>'+itemTools('exp',i,d.exp.length,'position')+'</div>'
  +'<div class="row2">'+lf('exp',i,'role','Job title',{ph:'e.g. Customer Service Officer'})+lf('exp',i,'org','Company',{ph:'e.g. Example Ltd'})+'</div>'
  +lf('exp',i,'loc','Location',{ph:'e.g. Nairobi, Kenya'})
  +'<div class="row2">'+lf('exp',i,'start','Start date',{ph:'e.g. Mar 2022'})+lf('exp',i,'end','End date',{ph:'e.g. Dec 2023',dis:x.present})+'</div>'
  +'<label class="check"><input type="checkbox" data-l="exp" data-i="'+i+'" data-f="present"'+(x.present?' checked':'')+'> I currently work here</label>'
  +lf('exp',i,'desc','Role description (optional)',{ta:1,rows:2,ph:'One or two sentences on what the role involved.',hint:'text'})
  +lf('exp',i,'bullets','Achievements (one per line)',{ta:1,rows:4,ph:'e.g. Reorganised the filing system so records were easier to find',hint:'bullets'})
  +'</article>';
 }).join('');
 return h+addBtn('exp',d.exp.length?'Add another position':'Add position');
}
function panelEdu(){
 let h='<h2 class="ph2">Education</h2><p class="lead">Highest or most recent qualification first. Add KCSE, certificates and diplomas too if they help.</p>';
 if(!d.edu.length)h+=emptyState('No education added yet.','Add your school, college or university. Write "Expected" in the end date if you have not finished yet.');
 h+=d.edu.map((x,i)=>{
  const fb='Education '+(i+1);
  return '<article class="item-card" data-fb="'+fb+'"><div class="item-head"><h3>'+esc(x.qual||x.org||fb)+'</h3>'+itemTools('edu',i,d.edu.length,'education')+'</div>'
  +lf('edu',i,'org','Institution',{ph:'e.g. Example University'})
  +lf('edu',i,'qual','Qualification or degree',{ph:'e.g. Bachelor of Commerce'})
  +lf('edu',i,'field','Field of study (optional)',{ph:'e.g. Accounting'})
  +'<div class="row2">'+lf('edu',i,'start','Start date',{ph:'e.g. Sep 2019'})+lf('edu',i,'end','End date',{ph:'e.g. Dec 2023 or Expected Dec 2026'})+'</div>'
  +lf('edu',i,'grade','Grade or result (optional)',{ph:'e.g. Second Class Upper'})
  +lf('edu',i,'notes','Relevant achievements (optional, one per line)',{ta:1,rows:3,hint:'text'})
  +'</article>';
 }).join('');
 return h+addBtn('edu',d.edu.length?'Add another education':'Add education');
}
function tagsHtml(){
 if(!d.skills.length)return '<li class="tags-empty">No skills added yet.</li>';
 return d.skills.map((s,i)=>'<li class="tag"><input data-skill="'+i+'" type="text" value="'+esc(s)+'" style="width:'+Math.max(4,s.length+1)+'ch" aria-label="Skill '+(i+1)+' (edit)"><button type="button" class="tag-x" data-op="skilldel" data-i="'+i+'" aria-label="Remove '+esc(s)+'">'+icon('x',14)+'</button></li>').join('');
}
function panelSkills(){
 return '<h2 class="ph2">Skills</h2><p class="lead">Add one skill at a time. Press Enter or comma after each one. Tap a skill to edit it.</p>'
 +'<div class="addrow"><label class="sr" for="skillIn">New skill</label><input id="skillIn" type="text" placeholder="e.g. Microsoft Excel" autocomplete="off" enterkeyhint="done"><button type="button" class="btn btn-primary" id="skillAdd">Add</button></div>'
 +'<ul class="tags" id="tags">'+tagsHtml()+'</ul>'
 +'<div class="tip"><strong>Tip</strong><p>Aim for 6 to 12 skills that match the jobs you are applying for. Only list skills you genuinely have.</p></div>';
}
function addSkills(text){
 let n=0;
 String(text).split(/[,;\n]/).forEach(s=>{
  s=s.trim().slice(0,60);
  if(s&&d.skills.length<60&&!d.skills.some(x=>x.toLowerCase()===s.toLowerCase())){d.skills.push(s);n++;}
 });
 return n;
}
function addFromInput(){
 const inp=$('#skillIn');if(!inp)return;
 const n=addSkills(inp.value);inp.value='';
 if(n){$('#tags').innerHTML=tagsHtml();changed();}
 inp.focus();
}
function sectionCard(k,si){
 const X=EXTRA[k],items=d.extras[k],l='x:'+k,cap=X.item.charAt(0).toUpperCase()+X.item.slice(1);
 const sb=(op,ic,label,dis)=>'<button type="button" class="icon-btn" data-op="'+op+'" data-k="'+k+'" aria-label="'+esc(label)+'"'+(dis?' disabled':'')+'>'+icon(ic)+'</button>';
 let h='<section class="sec-card" aria-label="'+esc(X.label)+'"><div class="item-head"><h3>'+esc(X.label)+'</h3><div class="tools">'
  +sb('secup','up','Move '+X.label+' section up',si===0)+sb('secdown','down','Move '+X.label+' section down',si===d.extraOrder.length-1)+sb('secdel','trash','Remove '+X.label+' section',false)
  +'</div></div>';
 if(k==='references')h+='<p class="small">Only list people who have agreed to be contacted. "References available on request" is also acceptable.</p>';
 h+=items.map((it,i)=>{
  const fb=cap+' '+(i+1);
  return '<article class="item-card" data-fb="'+esc(fb)+'"><div class="item-head"><h3>'+esc(it.title||fb)+'</h3>'+itemTools(l,i,items.length,X.item)+'</div>'
  +X.fields.map(f=>lf(l,i,f[0],f[1],{ta:f[2]==='t',rows:3,hint:f[2]==='t'?(X.bul?'bullets':'text'):''})).join('')+'</article>';
 }).join('');
 return h+addBtn(l,'Add '+X.item)+'</section>';
}
function panelExtra(){
 const avail=Object.keys(EXTRA).filter(k=>!d.extraOrder.includes(k));
 let h='<h2 class="ph2">Additional Sections</h2><p class="lead">Optional. Only sections you add and fill in will appear on your CV.</p>';
 if(avail.length)h+='<div class="addrow" style="margin-bottom:14px"><label class="sr" for="secSel">Section to add</label><select id="secSel">'+avail.map(k=>'<option value="'+k+'">'+esc(EXTRA[k].label)+'</option>').join('')+'</select><button type="button" class="btn btn-primary" data-op="secadd">Add section</button></div>';
 if(!d.extraOrder.length)h+=emptyState('No extra sections yet.','Add certifications, projects, languages, volunteer work, awards or references.');
 return h+d.extraOrder.map(sectionCard).join('');
}
function checks(){
 const c=[];
 c.push({ok:!!d.name.trim(),t:d.name.trim()?'Full name added':'Add your full name (required).'});
 const em=RULES.email(d.email);
 c.push({ok:!em,t:em?'Email: '+em:'Email address added'});
 const ph=RULES.phone(d.phone);
 c.push({ok:!!d.phone.trim()&&!ph,t:!d.phone.trim()?'Add a phone number so employers can call you.':(ph||'Phone number added')});
 c.push({ok:!!d.summary.trim(),t:d.summary.trim()?'Professional summary added':'Add a short professional summary (recommended).'});
 const hasExp=d.exp.some(x=>x.role||x.org),hasEdu=d.edu.some(x=>x.qual||x.org);
 c.push({ok:hasExp||hasEdu,t:(hasExp||hasEdu)?'Experience or education added':'Add at least one job, internship or education entry.'});
 if(hasExp){
  const inc=d.exp.filter(x=>(x.role||x.org)&&(!x.role||!x.org||!x.start)).length;
  c.push({ok:!inc,t:inc?inc+' position(s) are missing a job title, company or start date.':'Every position has a title, company and start date'});
  const nb=d.exp.filter(x=>(x.role||x.org)&&!x.bullets.trim()).length;
  c.push({ok:!nb,t:nb?nb+' position(s) have no achievements listed.':'Every position lists achievements'});
 }
 c.push({ok:d.skills.length>=5,t:d.skills.length>=5?'Skills added':'Add at least 5 relevant skills ('+d.skills.length+' so far).'});
 return c;
}
const act=(n,ic,label,cls)=>'<button type="button" class="btn '+(cls||'')+'" data-act="'+n+'">'+icon(ic)+label+'</button>';
function panelReview(){
 let h='<h2 class="ph2">Review and Download</h2><p class="lead">Check the list, then download your CV as a PDF.</p><ul class="checklist">'
 +checks().map(c=>'<li class="'+(c.ok?'ok':'todo')+'"><span aria-hidden="true">'+(c.ok?icon('check',16):'!')+'</span><span><span class="sr">'+(c.ok?'Done: ':'To do: ')+'</span>'+esc(c.t)+'</span></li>').join('')+'</ul>';
 h+='<button type="button" class="btn btn-primary btn-block" data-act="download">'+icon('download')+'Download PDF</button>';
 h+='<div class="tip"><strong>Before you send it</strong><p>Proofread names, dates and numbers. Single-column templates (Modern, Minimalist, Executive, Graduate) are usually easiest for automated systems to read. Templates with side columns (Corporate, Creative) can be harder for some. No CV can be guaranteed to pass every employer\u2019s system.</p></div>';
 h+='<h3 class="sub-h">This CV: \u201c'+esc(store.docs[store.current].name)+'\u201d</h3><div class="act-grid">'
 +act('export','download','Export backup')+act('import','upload','Import backup')+act('rename','pencil','Rename')+act('dup','copy','Duplicate')+act('del','trash','Delete this CV','btn-danger')+act('clear','x','Clear all','btn-danger')
 +'</div><p class="small">Your CV is saved only in this browser, on this device. Export a backup to keep a copy or move it to another device.</p>';
 return h;
}

/* ---------- stepper, render ---------- */
function stepDone(i){
 switch(i){
  case 0:return !!d.name.trim()&&!RULES.email(d.email);
  case 1:return !!d.summary.trim();
  case 2:return d.exp.some(x=>x.role||x.org);
  case 3:return d.edu.some(x=>x.qual||x.org);
  case 4:return d.skills.length>0;
  case 5:return d.extraOrder.some(k=>d.extras[k].some(hasContent));
  default:return false;
 }
}
function stepperHtml(){
 return STEPS.map((s,i)=>{
  const dn=stepDone(i)&&i!==step;
  return '<button type="button" class="step'+(i===step?' on':'')+(dn?' done':'')+'" data-step="'+i+'"'+(i===step?' aria-current="step"':'')+' aria-label="Step '+(i+1)+': '+s[1]+(stepDone(i)?' (complete)':'')+'"><span class="n">'+(dn?icon('check',14):(i+1))+'</span><span>'+s[2]+'</span></button>';
 }).join('');
}
function updateStepper(){
 const s=STEPS.map((x,i)=>stepDone(i)?1:0).join('')+step;
 if(s===sig)return;
 sig=s;
 $('#stepper').innerHTML=stepperHtml();
}
function updateProgress(){
 $('#progBar').style.width=((step+1)/STEPS.length*100)+'%';
 $('#progWrap').setAttribute('aria-valuenow',String(step+1));
 $('#stepInfo').textContent='Step '+(step+1)+' of '+STEPS.length+' \u00b7 '+STEPS[step][1];
 $('#prevStep').disabled=step===0;
 const nx=$('#nextStep');
 nx.hidden=step===STEPS.length-1;
 if(!nx.hidden)nx.textContent='Next: '+STEPS[step+1][2];
}
function renderPanel(){
 lastTA=null;
 const fns=[panelPersonal,panelSummary,panelExp,panelEdu,panelSkills,panelExtra,panelReview];
 const p=$('#panel');
 p.innerHTML=fns[step]();
 p.querySelectorAll('textarea[data-hint]').forEach(t=>updateHint(t));
 Object.keys(touched).forEach(k=>showMsg(k));
 updateProgress();updateStepper();
}
function go(i){
 if(i<0||i>=STEPS.length)return;
 step=i;
 try{sessionStorage.setItem('cc_step',String(i));}catch(e){}
 renderPanel();
 const on=$('#stepper .on');
 if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest',inline:'center'});
 $('#stepInfo').scrollIntoView({block:'start'});
}
function renderDocs(){
 $('#docSel').innerHTML=Object.keys(store.docs).map(id=>'<option value="'+id+'"'+(id===store.current?' selected':'')+'>'+esc(store.docs[id].name)+'</option>').join('');
}
function renderAll(){
 Object.keys(touched).forEach(k=>{delete touched[k];});
 renderDocs();
 $('#tplSel').value=d.template;
 sig='';
 renderPanel();preview();applyZoom();
}

/* ---------- zoom + tabs ---------- */
function fitScale(){const w=$('#scroller').clientWidth-20;return w>0?Math.min(1,w/793.7):1;}
function curZoom(){return zoom==null?fitScale():zoom;}
function applyZoom(){const s=curZoom();$('#paperZoom').style.setProperty('--z',String(s));$('#zLbl').textContent=Math.round(s*100)+'%';}
function setZoom(v){zoom=Math.max(.3,Math.min(1.5,Math.round(v*10)/10));applyZoom();}
function setTab(t){
 $('#layout').dataset.tab=t;
 $('#tabEdit').setAttribute('aria-pressed',String(t==='edit'));
 $('#tabPrev').setAttribute('aria-pressed',String(t==='preview'));
 requestAnimationFrame(applyZoom);
 if(t==='preview')window.scrollTo(0,0);
}

/* ---------- download ---------- */
function doPrint(){
 const old=document.title;
 document.title=((d.name||'CV').trim()+' - CV').slice(0,80);
 const back=()=>{document.title=old;window.removeEventListener('afterprint',back);};
 window.addEventListener('afterprint',back);
 setTimeout(back,60000);
 window.print();
}
function startDownload(){
 if(C.isEmpty(d)){toast('Your CV is empty. Add some details first.',true);return;}
 if(!d.name.trim()&&!confirm('Your CV has no name yet. Download anyway?'))return;
 let skip=false;try{skip=localStorage.getItem(SKIP)==='1';}catch(e){}
 const dlg=$('#printDlg');
 if(skip||typeof dlg.showModal!=='function')doPrint();else dlg.showModal();
}

/* ---------- backups + documents ---------- */
function exportBackup(){
 try{
  const doc=store.docs[store.current];
  const blob=new Blob([JSON.stringify({app:'careercraft-kenya',version:2,name:doc.name,exportedAt:new Date().toISOString(),data:d},null,2)],{type:'application/json'});
  const slug=(doc.name||'cv').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'cv';
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='careercraft-'+slug+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast('Backup downloaded.');
 }catch(e){toast('Could not create the backup file.',true);}
}
function addDoc(name,data){
 if(Object.keys(store.docs).length>=50){toast('You have reached the limit of 50 CVs.',true);return false;}
 persist();
 const id=uid();
 store.docs[id]={name:String(name||'My CV').slice(0,80),updated:Date.now(),data:data};
 store.current=id;d=store.docs[id].data;
 persist();renderAll();
 return true;
}
const ACT={
 download:startDownload,
 export:exportBackup,
 import:()=>$('#importFile').click(),
 rename(){
  const n=prompt('Rename this CV:',store.docs[store.current].name);
  if(n===null||!n.trim())return;
  store.docs[store.current].name=n.trim().slice(0,80);
  persist();renderDocs();renderPanel();toast('Renamed.');
 },
 dup(){
  const src=store.docs[store.current];
  if(addDoc(src.name+' (copy)',C.normalize(JSON.parse(JSON.stringify(src.data)))))toast('Duplicated. You are now editing the copy.');
 },
 del(){
  if(!confirm('Delete \u201c'+store.docs[store.current].name+'\u201d from this device? Export a backup first if you might need it.'))return;
  delete store.docs[store.current];
  let ids=Object.keys(store.docs);
  if(!ids.length){const id=uid();store.docs[id]={name:'My CV',updated:Date.now(),data:C.blank()};ids=[id];}
  store.current=ids[0];d=store.docs[store.current].data;
  persist();renderAll();toast('CV deleted.');
 },
 clear(){
  if(!confirm('Clear all information in this CV? This cannot be undone. Export a backup first if unsure.'))return;
  const doc=store.docs[store.current];
  doc.data=C.blank();d=doc.data;
  persist();renderAll();toast('CV cleared.');
 }
};

/* ---------- events ---------- */
const panel=$('#panel');

panel.addEventListener('input',e=>{
 const t=e.target;
 if(t.dataset.p){
  d[t.dataset.p]=t.value;
  if(touched[t.dataset.p])showMsg(t.dataset.p);
  if(t.dataset.p==='summary')$('#sumCount').textContent=t.value.length+' characters';
 }else if(t.dataset.l&&t.type!=='checkbox'){
  const it=(getList(t.dataset.l)||[])[+t.dataset.i];
  if(!it)return;
  it[t.dataset.f]=t.value;
  const f=t.dataset.f,card=t.closest('.item-card');
  if(card&&(f==='role'||f==='qual'||f==='title'))card.querySelector('h3').textContent=t.value.trim()||card.dataset.fb;
 }else if(t.dataset.skill!==undefined){
  d.skills[+t.dataset.skill]=t.value;
  t.style.width=Math.max(4,t.value.length+1)+'ch';
 }else if(t.id==='skillIn'){
  if(/[,;\n]/.test(t.value))addFromInput();
  return;
 }else return;
 if(t.dataset.hint)updateHint(t);
 changed();
});

panel.addEventListener('change',e=>{
 const t=e.target;
 if(t.type==='checkbox'&&t.dataset.l){
  const it=(getList(t.dataset.l)||[])[+t.dataset.i];
  if(!it)return;
  it.present=t.checked;
  const end=t.closest('.item-card').querySelector('[data-f="end"]');
  if(end)end.disabled=t.checked;
  changed();
 }
});

panel.addEventListener('focusin',e=>{
 const t=e.target;
 if(t.tagName==='TEXTAREA'&&t.dataset.hint==='bullets')lastTA=t;
});

panel.addEventListener('focusout',e=>{
 const t=e.target;
 if(t.dataset.p){touched[t.dataset.p]=true;showMsg(t.dataset.p);}
 else if(t.dataset.skill!==undefined){
  const i=+t.dataset.skill;
  if(!t.value.trim()){d.skills.splice(i,1);$('#tags').innerHTML=tagsHtml();changed();}
  else{t.value=t.value.trim();d.skills[i]=t.value;preview();scheduleSave();}
 }
});

panel.addEventListener('keydown',e=>{
 const t=e.target;
 if(e.key==='Enter'&&t.id==='skillIn'){e.preventDefault();addFromInput();}
 else if(e.key==='Enter'&&t.dataset&&t.dataset.skill!==undefined){e.preventDefault();t.blur();}
});

panel.addEventListener('click',e=>{
 const v=e.target.closest('[data-verb]');
 if(v){
  if(!lastTA||!document.body.contains(lastTA)){toast('Tap inside an achievements box first.',true);return;}
  let val=lastTA.value;
  if(val&&!/\n$/.test(val))val+='\n';
  lastTA.value=val+v.dataset.verb+' ';
  lastTA.focus();
  lastTA.setSelectionRange(lastTA.value.length,lastTA.value.length);
  lastTA.dispatchEvent(new Event('input',{bubbles:true}));
  return;
 }
 const a=e.target.closest('[data-act]');
 if(a){if(ACT[a.dataset.act])ACT[a.dataset.act]();return;}
 if(e.target.id==='skillAdd'){addFromInput();return;}
 const b=e.target.closest('[data-op]');
 if(!b||b.disabled)return;
 const op=b.dataset.op,l=b.dataset.l,i=+b.dataset.i;
 if(op==='skilldel'){d.skills.splice(i,1);$('#tags').innerHTML=tagsHtml();changed();return;}
 if(op==='secadd'){
  const k=$('#secSel').value;
  if(EXTRA[k]&&!d.extraOrder.includes(k)){d.extraOrder.push(k);if(!d.extras[k].length)d.extras[k].push(C.newExtra(k));renderPanel();changed();}
  return;
 }
 if(op==='secup'||op==='secdown'){
  const k=b.dataset.k,j=d.extraOrder.indexOf(k),n=op==='secup'?j-1:j+1;
  if(j<0||n<0||n>=d.extraOrder.length)return;
  const tmp=d.extraOrder[j];d.extraOrder[j]=d.extraOrder[n];d.extraOrder[n]=tmp;
  renderPanel();changed();return;
 }
 if(op==='secdel'){
  const k=b.dataset.k;
  if(d.extras[k].some(hasContent)&&!confirm('Remove the whole \u201c'+EXTRA[k].label+'\u201d section and its entries?'))return;
  d.extras[k]=[];d.extraOrder=d.extraOrder.filter(x=>x!==k);
  renderPanel();changed();return;
 }
 const L=getList(l);
 if(!L)return;
 let focusI=null;
 if(op==='add'){L.push(l==='exp'?C.newExp():l==='edu'?C.newEdu():C.newExtra(l.slice(2)));}
 else if(op==='up'&&i>0){const t=L[i-1];L[i-1]=L[i];L[i]=t;focusI=i-1;}
 else if(op==='down'&&i<L.length-1){const t=L[i+1];L[i+1]=L[i];L[i]=t;focusI=i+1;}
 else if(op==='dup'){L.splice(i+1,0,JSON.parse(JSON.stringify(L[i])));}
 else if(op==='del'){
  if(hasContent(L[i])&&!confirm('Delete this entry? This cannot be undone.'))return;
  L.splice(i,1);
 }else return;
 renderPanel();changed();
 if(op==='add'){
  const cards=panel.querySelectorAll('.item-card'),last=cards[cards.length-1];
  const f=last&&last.querySelector('input,textarea');
  if(f){f.focus();if(f.scrollIntoView)f.scrollIntoView({block:'center'});}
 }else if(focusI!==null){
  const nb=panel.querySelector('[data-op="'+op+'"][data-l="'+l+'"][data-i="'+focusI+'"]');
  if(nb&&!nb.disabled)nb.focus();
 }
});

$('#stepper').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b)go(+b.dataset.step);});
$('#prevStep').addEventListener('click',()=>go(step-1));
$('#nextStep').addEventListener('click',()=>go(step+1));
$('#tplSel').addEventListener('change',e=>{d.template=e.target.value;changed();});
$('#docSel').addEventListener('change',e=>{
 const id=e.target.value;
 if(!store.docs[id])return;
 persist();store.current=id;d=store.docs[id].data;persist();renderAll();
});
$('#newDoc').addEventListener('click',()=>{
 const n=prompt('Name for the new CV:','CV '+(Object.keys(store.docs).length+1));
 if(n===null)return;
 if(addDoc(n.trim()||'My CV',C.blank()))toast('New CV created. Your other CVs were not changed.');
});
$('#dlBtn').addEventListener('click',startDownload);
$('#zOut').addEventListener('click',()=>setZoom(curZoom()-.1));
$('#zIn').addEventListener('click',()=>setZoom(curZoom()+.1));
$('#zFit').addEventListener('click',()=>{zoom=null;applyZoom();});
$('#tabEdit').addEventListener('click',()=>setTab('edit'));
$('#tabPrev').addEventListener('click',()=>setTab('preview'));
window.addEventListener('resize',()=>{if(zoom==null)applyZoom();});

$('#printCancel').addEventListener('click',()=>$('#printDlg').close());
$('#printGo').addEventListener('click',()=>{
 if($('#printSkip').checked){try{localStorage.setItem(SKIP,'1');}catch(e){}}
 $('#printDlg').close();
 setTimeout(doPrint,150);
});

$('#importFile').addEventListener('change',e=>{
 const f=e.target.files[0];
 e.target.value='';
 if(!f)return;
 if(f.size>2000000){toast('That file is too large to be a CV backup.',true);return;}
 const r=new FileReader();
 r.onerror=()=>toast('Could not read that file.',true);
 r.onload=()=>{
  let j;
  try{j=JSON.parse(r.result);}catch(x){toast('That file is not valid JSON.',true);return;}
  if(!j||j.app!=='careercraft-kenya'||!j.data||typeof j.data!=='object'||Array.isArray(j.data)){toast('That is not a CareerCraft Kenya backup file.',true);return;}
  if(j.version!==1&&j.version!==2){toast('This backup comes from a newer version and cannot be opened.',true);return;}
  if(addDoc(j.name||f.name.replace(/\.json$/i,'')||'Imported CV',C.normalize(j.data)))toast('Backup imported as a new CV. Your other CVs were not changed.');
 };
 r.readAsText(f);
});

/* ---------- init ---------- */
(function init(){
 $('#tplSel').innerHTML=TEMPLATES.map(t=>'<option value="'+t.key+'">'+t.name+'</option>').join('');
 const q=new URLSearchParams(location.search).get('template');
 if(TEMPLATES.some(t=>t.key===q)){d.template=q;try{history.replaceState(null,'',location.pathname);}catch(e){}}
 renderAll();
 persist();
})();
})();
