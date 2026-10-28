'use strict';
const crypto=require('crypto');
const c=require('../lib/common');
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return c.json(405,{error:'Method not allowed.'});
    const miss=c.missing();
    if(miss.length){console.error('Missing environment variables:',miss.join(', '));return c.json(503,{error:'Payments are not configured yet.'});}
    if(c.liveBlocked())return c.json(503,{error:'Live payments are switched off. Use your test key.'});

    const user=await c.getUser(c.bearer(event));
    if(!user)return c.json(401,{error:'Please log in again.'});
    if(!user.email_confirmed_at)return c.json(403,{error:'Please verify your email address before paying.'});

    let body;try{body=JSON.parse(event.body||'{}');}catch(e){return c.json(400,{error:'Bad request.'});}
    const code=String(body.product||'').slice(0,60);
    if(!/^[a-z0-9-]{2,60}$/.test(code))return c.json(400,{error:'Unknown product.'});

    const prods=await c.sb('GET','/rest/v1/products?code=eq.'+c.enc(code)+'&active=eq.true&select=code,name,price_minor,currency');
    const prod=prods&&prods[0];
    if(!prod)return c.json(404,{error:'That product is not available.'});

    const since=new Date(Date.now()-10*60*1000).toISOString();
    const recent=await c.sb('GET','/rest/v1/payments?user_id=eq.'+c.enc(user.id)+'&status=eq.pending&created_at=gte.'+c.enc(since)+'&select=id');
    if(recent&&recent.length>=5)return c.json(429,{error:'Too many unfinished payments. Please wait a few minutes.'});

    const reference='cc_'+crypto.randomBytes(12).toString('hex');
    await c.sb('POST','/rest/v1/payments',{reference:reference,user_id:user.id,email:user.email,product_code:prod.code,amount_minor:prod.price_minor,currency:prod.currency,status:'pending'},{Prefer:'return=minimal'});

    const r=await c.paystack('POST','/transaction/initialize',{
      email:user.email,
      amount:prod.price_minor,
      currency:prod.currency,
      reference:reference,
      callback_url:c.siteUrl()+'/pay-result.html',
      metadata:{user_id:user.id,product_code:prod.code}
    });
    if(!r||!r.status||!r.data||!r.data.authorization_url){
      console.error('Paystack initialize failed:',r&&r.message);
      await c.sb('PATCH','/rest/v1/payments?reference=eq.'+c.enc(reference),{status:'failed'},{Prefer:'return=minimal'});
      return c.json(502,{error:'Could not start the payment. Please try again.'});
    }
    return c.json(200,{authorization_url:r.data.authorization_url,reference:reference});
  }catch(e){
    console.error('paystack-init error:',e&&e.message);
    return c.json(500,{error:'Something went wrong. Please try again.'});
  }
};
