'use strict';
const REQUIRED=['PAYSTACK_SECRET_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
const enc=encodeURIComponent;
const missing=()=>REQUIRED.filter(k=>!process.env[k]);
const secret=()=>process.env.PAYSTACK_SECRET_KEY||'';
const isTest=()=>secret().indexOf('sk_test_')===0;
const liveBlocked=()=>!isTest()&&process.env.ALLOW_LIVE_PAYMENTS!=='yes';
const siteUrl=()=>String(process.env.SITE_URL||process.env.URL||'').replace(/\/$/,'');
const sbUrl=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const sbKey=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPEN='in.(pending,abandoned,failed)';

const json=(code,obj)=>({statusCode:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(obj)});

function bearer(event){
  const h=(event.headers&&(event.headers.authorization||event.headers.Authorization))||'';
  const m=h.match(/^Bearer\s+(.+)$/i);
  return m?m[1]:'';
}

async function sb(method,path,body,extra){
  const r=await fetch(sbUrl()+path,{
    method:method,
    headers:Object.assign({apikey:sbKey(),Authorization:'Bearer '+sbKey(),'Content-Type':'application/json'},extra||{}),
    body:body===undefined?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(15000)
  });
  const t=await r.text();
  let j=null;try{j=t?JSON.parse(t):null;}catch(e){}
  if(!r.ok)throw new Error('Supabase '+r.status+' on '+method+' '+path.split('?')[0]+': '+t.slice(0,200));
  return j;
}

async function getUser(token){
  if(!token)return null;
  const r=await fetch(sbUrl()+'/auth/v1/user',{headers:{apikey:sbKey(),Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  if(!r.ok)return null;
  return r.json();
}

async function paystack(method,path,body){
  const r=await fetch('https://api.paystack.co'+path,{
    method:method,
    headers:{Authorization:'Bearer '+secret(),'Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(15000)
  });
  return r.json();
}

/* Confirms a payment with Paystack and records it. Safe to call many times. */
async function fulfil(reference){
  const rows=await sb('GET','/rest/v1/payments?reference=eq.'+enc(reference)+'&select=*');
  const pay=rows&&rows[0];
  if(!pay)return{state:'unknown'};
  if(pay.status==='success')return{state:'success',payment:pay};
  if(['pending','abandoned','failed'].indexOf(pay.status)<0)return{state:pay.status,payment:pay};

  const v=await paystack('GET','/transaction/verify/'+enc(reference));
  const d=v&&v.data;
  if(!v||!v.status||!d){
    console.error('Paystack verify returned no data for',reference,v&&v.message);
    return{state:'pending',payment:pay};
  }
  const ps=String(d.status||'');
  const filter='/rest/v1/payments?reference=eq.'+enc(reference)+'&status='+OPEN;

  if(ps==='success'){
    if(d.amount!==pay.amount_minor||String(d.currency||'').toUpperCase()!==String(pay.currency).toUpperCase()){
      console.error('Amount or currency mismatch for',reference);
      await sb('PATCH',filter,{status:'mismatch'},{Prefer:'return=minimal'});
      return{state:'mismatch',payment:pay};
    }
    const won=await sb('PATCH',filter,{status:'success',paid_at:d.paid_at||new Date().toISOString(),channel:d.channel||null,paystack_id:d.id||null},{Prefer:'return=representation'});
    if(won&&won.length&&pay.user_id){
      await sb('POST','/rest/v1/entitlements?on_conflict=payment_id',{user_id:pay.user_id,product_code:pay.product_code,payment_id:won[0].id},{Prefer:'resolution=ignore-duplicates,return=minimal'});
    }
    return{state:'success',payment:pay};
  }
  if(ps==='failed'||ps==='abandoned'||ps==='reversed'){
    const st=ps==='abandoned'?'abandoned':'failed';
    await sb('PATCH',filter,{status:st},{Prefer:'return=minimal'});
    return{state:st,payment:pay};
  }
  return{state:'pending',payment:pay};
}

module.exports={missing,secret,isTest,liveBlocked,siteUrl,json,bearer,sb,getUser,paystack,fulfil,enc};
