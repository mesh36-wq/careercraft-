(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=(v,m)=>typeof v==='string'?v.slice(0,m||2000):'';
const arr=a=>Array.isArray(a)?a.slice(0,30):[];
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};

const TEMPLATES=[
 {key:'modern',name:'Modern',desc:'Clean typography and balanced spacing. A safe choice for most roles.'},
 {key:'executive',name:'Executive',desc:'Elegant and understated, with a serif voice for leadership roles.'},
 {key:'minimalist',name:'Minimalist',desc:'Simple black-and-white layout that puts your content first.'},
 {key:'corporate',name:'Corporate',desc:'Structured and formal, with a label column for business roles.'},
 {key:'creative',name:'Creative',desc:'Two-column layout with a sidebar and a subtle gold accent.'},
 {key:'graduate',name:'Graduate',desc:'Education first. Built for students, interns and entry-level applicants.'}
];

const EXTRA={
 certs:{label:'Certifications',item:'certification',bul:false,fields:[['title','Certification'],['sub','Issuing organisation'],['date','Date'],['desc','Details (optional)','t']]},
 projects:{label:'Projects',item:'project',bul:true,fields:[['title','Project name'],['sub','Your role or link'],['date','Date'],['desc','What you did (one point per line)','t']]},
 languages:{label:'Languages',item:'language',bul:false,compact:true,fields:[['title','Language'],['sub','Level (e.g. Native, Fluent, Basic)']]},
 volunteer:{label:'Volunteer Experience',item:'role',bul:true,fields:[['title','Role'],['sub','Organisation'],['date','Dates'],['desc','What you did (one point per line)','t']]},
 awards:{label:'Awards and Achievements',item:'award',bul:false,fields:[['title','Award or achievement'],['sub','Awarded by'],['date','Date'],['desc','Details (optional)','t']]},
 references:{label:'References',item:'referee',bul:false,fields:[['title','Name'],['sub','Job title and organisation'],['desc','Contact details','t']]}
};

const newExp=()=>({role:'',org:'',loc:'',start:'',end:'',present:false,desc:'',bullets:''});
const newEdu=()=>({org:'',qual:'',field:'',start:'',end:'',grade:'',notes:''});
const newExtra=k=>{const o={};EXTRA[k].fields.forEach(f=>{o[f[0]]='';});return o;};
const blank=()=>({template:'modern',name:'',title:'',email:'',phone:'',location:'',linkedin:'',website:'',summary:'',exp:[],edu:[],skills:[],extras:Object.keys(EXTRA).reduce((a,k)=>{a[k]=[];return a;},{}),extraOrder:[]});

function parseDates(s){
 s=str(s,100).replace(/(\d)\s*-\s*(\d)/g,'$1 - $2');
 const m=s.split(/\s+[-\u2013\u2014]\s+|\s*[\u2013\u2014]\s*|\s+to\s+/i);
 if(m.length>=2){const end=m.slice(1).join(' - ').trim();const p=/^(present|current|now|to date)$/i.test(end);return{start:m[0].trim(),end:p?'':end,present:p};}
 return{start:s.trim(),end:'',present:false};
}
function normExp(x){
 x=obj(x);
 const legacy=!('bullets' in x)&&!('start' in x)&&!('present' in x);
 const e={role:str(x.role,200),org:str(x.org,200),loc:str(x.loc,200),start:str(x.start,60),end:str(x.end,60),present:!!x.present,desc:str(x.desc,2000),bullets:str(x.bullets,4000)};
 if(legacy){const p=parseDates(x.dates);e.start=p.start;e.end=p.end;e.present=p.present;e.bullets=e.desc;e.desc='';}
 return e;
}
function normEdu(x){
 x=obj(x);
 const legacy=!('grade' in x)&&!('start' in x)&&!('field' in x);
 const e={org:str(x.org,200),qual:str(x.qual,200),field:str(x.field,200),start:str(x.start,60),end:str(x.end,60),grade:str(x.grade,200),notes:str(x.notes,3000)};
 if(legacy){const p=parseDates(x.dates);e.start=p.start;e.end=p.end?p.end:(p.present?'Present':'');e.notes=str(x.desc,3000);}
 return e;
}
function normalize(o){
 o=obj(o);const b=blank();
 ['name','title','email','phone','location','linkedin','website'].forEach(k=>{b[k]=str(o[k],300);});
 b.summary=str(o.summary,3000);
 const t=o.template==='minimal'?'minimalist':o.template;
 b.template=TEMPLATES.some(x=>x.key===t)?t:'modern';
 b.exp=arr(o.exp).map(normExp);
 b.edu=arr(o.edu).map(normEdu);
 const sk=Array.isArray(o.skills)?o.skills:(typeof o.skills==='string'?o.skills.split(','):[]);
 sk.forEach(s=>{s=str(s,60).trim();if(s&&b.skills.length<60&&!b.skills.some(x=>x.toLowerCase()===s.toLowerCase()))b.skills.push(s);});
 const ex=obj(o.extras);
 Object.keys(EXTRA).forEach(k=>{
  b.extras[k]=arr(ex[k]).map(it=>{it=obj(it);const r=newExtra(k);Object.keys(r).forEach(f=>{r[f]=str(it[f],f==='desc'?2000:300);});return r;});
 });
 (Array.isArray(o.extraOrder)?o.extraOrder:[]).forEach(k=>{if(EXTRA[k]&&!b.extraOrder.includes(k))b.extraOrder.push(k);});
 Object.keys(EXTRA).forEach(k=>{if(b.extras[k].length&&!b.extraOrder.includes(k))b.extraOrder.push(k);});
 return b;
}

/* ---------- rendering ---------- */
const range=(s,e,p)=>{const b=p?'Present':e;return s&&b?s+' \u2013 '+b:(s||b||'');};
function bullets(t){
 const l=String(t||'').split('\n').map(s=>s.replace(/^[\s\u2022\-*]+/,'').trim()).filter(Boolean);
 return l.length?'<ul>'+l.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
}
function entry(o){
 const t=(o.title?'<span class="entry-title">'+esc(o.title)+'</span>':'')+(o.org?'<span class="entry-org">'+esc(o.org)+'</span>':'');
 return '<div class="entry"><div class="entry-head"><div class="entry-main">'+t+'</div>'+(o.date?'<div class="entry-date">'+esc(o.date)+'</div>':'')+'</div>'+(o.meta?'<div class="entry-meta">'+esc(o.meta)+'</div>':'')+(o.desc?'<p class="entry-desc">'+esc(o.desc)+'</p>':'')+(o.bullets||'')+'</div>';
}
function expHtml(d){return d.exp.map(x=>{
 if(!x.role&&!x.org&&!x.desc&&!x.bullets.trim())return '';
 return entry({title:x.role,org:x.org,date:range(x.start,x.end,x.present),meta:x.loc,desc:x.desc,bullets:bullets(x.bullets)});
}).join('');}
function eduHtml(d){return d.edu.map(x=>{
 if(!x.qual&&!x.org&&!x.field&&!x.notes.trim())return '';
 const t=x.qual+(x.field?(x.qual?' \u2013 ':'')+x.field:'');
 return entry({title:t,org:x.org,date:range(x.start,x.end,false),meta:x.grade,bullets:bullets(x.notes)});
}).join('');}
function skillsHtml(d){return d.skills.length?'<ul class="skill-list">'+d.skills.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'';}
function extraHtml(d,k){
 const X=EXTRA[k],items=d.extras[k]||[];
 if(X.compact){
  const l=items.filter(i=>i.title).map(i=>'<li><strong>'+esc(i.title)+'</strong>'+(i.sub?' \u2013 '+esc(i.sub):'')+'</li>').join('');
  return l?'<ul class="lang-list">'+l+'</ul>':'';
 }
 return items.map(i=>{
  if(!i.title&&!i.sub&&!i.desc)return '';
  return entry({title:i.title,org:i.sub,date:i.date||'',desc:X.bul?'':i.desc,bullets:X.bul?bullets(i.desc):''});
 }).join('');
}
function build(d){
 const s={};
 if(d.summary.trim())s.summary={label:'Profile',html:'<p class="pre">'+esc(d.summary.trim())+'</p>'};
 const e=expHtml(d);if(e)s.exp={label:'Work Experience',html:e};
 const u=eduHtml(d);if(u)s.edu={label:'Education',html:u};
 const k=skillsHtml(d);if(k)s.skills={label:'Skills',html:k};
 d.extraOrder.forEach(key=>{const h=extraHtml(d,key);if(h)s['x_'+key]={label:EXTRA[key].label,html:h};});
 return s;
}
const urlText=u=>esc(String(u).trim().replace(/^https?:\/\//i,'').replace(/\/$/,''));
const cl=d=>[d.email,d.phone,d.location].filter(x=>x&&x.trim()).map(x=>esc(x.trim())).concat(d.linkedin.trim()?[urlText(d.linkedin)]:[],d.website.trim()?[urlText(d.website)]:[]);
const nm=d=>d.name.trim()?esc(d.name.trim()):'<span class="ph">Your Name</span>';
const ttl=d=>d.title.trim()?'<div class="role">'+esc(d.title.trim())+'</div>':'';
const spans=d=>cl(d).map(c=>'<span>'+c+'</span>').join('');
const sec=(s,k)=>s[k]?'<section class="sec sec-'+k+'"><h2>'+esc(s[k].label)+'</h2><div class="sec-body">'+s[k].html+'</div></section>':'';
const many=(s,keys)=>keys.map(k=>sec(s,k)).join('');
const xs=(s,skip)=>Object.keys(s).filter(k=>k.indexOf('x_')===0&&!(skip||[]).includes(k)).map(k=>sec(s,k)).join('');
const single=(d,s)=>'<header class="hd"><h1>'+nm(d)+'</h1>'+ttl(d)+'<div class="contact">'+spans(d)+'</div></header>'+many(s,['summary','exp','edu','skills'])+xs(s);

const R={
 modern:single,
 minimalist:single,
 executive:(d,s)=>'<header class="hd"><h1>'+nm(d)+'</h1>'+ttl(d)+'<div class="contact">'+cl(d).join('<span class="bar">|</span>')+'</div></header>'+many(s,['summary','exp','edu','skills'])+xs(s),
 corporate:(d,s)=>'<header class="hd"><div class="hd-l"><h1>'+nm(d)+'</h1>'+ttl(d)+'</div><div class="contact">'+cl(d).map(c=>'<div>'+c+'</div>').join('')+'</div></header>'+many(s,['summary','exp','edu','skills'])+xs(s),
 creative:(d,s)=>{
  const side=['skills','x_languages','x_certs','x_awards'];
  const c=cl(d);
  const contact=c.length?'<section class="sec sec-contact"><h2>Contact</h2><ul class="clist">'+c.map(x=>'<li>'+x+'</li>').join('')+'</ul></section>':'';
  return '<div class="cols"><aside class="side">'+contact+many(s,side)+'</aside><div class="main"><header class="hd"><h1>'+nm(d)+'</h1>'+ttl(d)+'</header>'+many(s,['summary','exp','edu'])+xs(s,side)+'</div></div>';
 },
 graduate:(d,s)=>'<header class="hd"><h1>'+nm(d)+'</h1>'+ttl(d)+'<div class="contact">'+spans(d)+'</div></header>'+many(s,['summary','edu','x_projects','exp','skills'])+xs(s,['x_projects'])
};

const isEmpty=d=>!(d.name.trim()||d.title.trim()||d.email.trim()||d.phone.trim()||d.location.trim()||d.linkedin.trim()||d.website.trim()||Object.keys(build(d)).length);
const emptyHtml=()=>'<div class="empty"><strong>Your CV will appear here</strong><p>Start with your name. The preview updates as you type.</p></div>';

function mount(el,d){
 const t=TEMPLATES.some(x=>x.key===d.template)?d.template:'modern';
 el.className='paper tpl-'+t;
 el.innerHTML=isEmpty(d)?emptyHtml():R[t](d,build(d));
}

/* ---------- sample (fictional) for previews ---------- */
const SAMPLE=normalize({
 name:'Jane Mwangi',title:'Customer Service Officer',email:'jane.mwangi@example.com',phone:'+254 700 000 000',location:'Nairobi, Kenya',linkedin:'linkedin.com/in/example',
 summary:'Organised and friendly graduate with hands-on experience in customer support and office administration. Comfortable with spreadsheets and clear written communication.',
 exp:[
  {role:'Customer Support Intern',org:'Example Logistics Ltd',loc:'Nairobi',start:'Jan 2025',end:'Jun 2025',present:false,desc:'',bullets:'Handled customer enquiries by phone, email and walk-in\nKept daily records of delivery issues and followed up until resolved\nSupported the team with weekly reports in Excel'},
  {role:'Sales Assistant',org:'Sample Retail Shop',loc:'Nairobi',start:'Jul 2023',end:'',present:true,desc:'',bullets:'Served customers and managed the till\nOrganised stock and shelf displays'}
 ],
 edu:[
  {org:'Example University',qual:'Bachelor of Commerce',field:'Marketing',start:'Sep 2020',end:'Dec 2024',grade:'Second Class Upper',notes:''},
  {org:'Example High School',qual:'KCSE',field:'',start:'2016',end:'2019',grade:'Grade B+',notes:''}
 ],
 skills:['Customer service','Microsoft Excel','Report writing','Data entry','Teamwork','Time management'],
 extras:{languages:[{title:'English',sub:'Fluent'},{title:'Swahili',sub:'Native'}],certs:[{title:'Customer Care Certificate',sub:'Example Training Institute',date:'2024',desc:''}],projects:[{title:'Market survey project',sub:'University coursework',date:'2024',desc:'Collected and summarised survey responses\nPresented findings to the class'}]},
 extraOrder:['projects','certs','languages']
});

function thumbs(root){
 (root||document).querySelectorAll('.thumb[data-tpl]').forEach(t=>{
  if(!t.firstChild){
   const p=document.createElement('div');p.setAttribute('aria-hidden','true');t.appendChild(p);
   const d=JSON.parse(JSON.stringify(SAMPLE));d.template=t.dataset.tpl;mount(p,d);
  }
  if(t.clientWidth>0)t.firstChild.style.transform='scale('+(t.clientWidth/793.7)+')';
 });
}
function gallery(el){
 if(!el)return;
 el.innerHTML=TEMPLATES.map(t=>'<article class="tpl-card"><a class="tpl-thumb" href="cv.html?template='+t.key+'" aria-label="Use the '+t.name+' template"><div class="thumb" data-tpl="'+t.key+'"></div></a><h3>'+t.name+'</h3><p>'+esc(t.desc)+'</p><a class="btn" href="cv.html?template='+t.key+'">Use this template</a></article>').join('');
 thumbs(el);
}
window.addEventListener('resize',()=>thumbs());

window.CC={esc,TEMPLATES,EXTRA,blank,normalize,newExp,newEdu,newExtra,mount,thumbs,gallery,isEmpty,SAMPLE};
})();
