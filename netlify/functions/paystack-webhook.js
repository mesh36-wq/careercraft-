'use strict';
const crypto=require('crypto');
const c=require('../lib/common');
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return c.json(405,{error:'Method not allowed.'});
    if(c.missing().length){console.error('Missing environment variables:',c.missing().join(', '));return c.json(503,{error:'Not configured.'});}

    const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):(event.body||'');
    const sig=String((event.headers&&event.headers['x-paystack-signature'])||'');
    const expected=crypto.createHmac('sha512',c.secret()).update(raw).digest('hex');
    const a=Buffer.from(expected,'utf8'),b=Buffer.from(sig,'utf8');
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b)){console.error('Webhook rejected: bad signature');return c.json(401,{error:'Invalid signature.'});}

    let ev;try{ev=JSON.parse(raw);}catch(e){return c.json(400,{error:'Bad JSON.'});}
    if(ev&&ev.event==='charge.success'&&ev.data&&typeof ev.data.reference==='string'){
      const ref=ev.data.reference;
      if(/^[A-Za-z0-9_-]{6,80}$/.test(ref)){
        const res=await c.fulfil(ref);
        console.log('Webhook charge.success',ref,'->',res.state);
      }
    }
    return c.json(200,{received:true});
  }catch(e){
    console.error('paystack-webhook error:',e&&e.message);
    return c.json(500,{error:'Error.'});
  }
};
