'use strict';
const c=require('../lib/common');
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='GET')return c.json(405,{error:'Method not allowed.'});
    if(c.missing().length){console.error('Missing environment variables:',c.missing().join(', '));return c.json(503,{error:'Payments are not configured yet.'});}
    const user=await c.getUser(c.bearer(event));
    if(!user)return c.json(401,{error:'Please log in again.'});
    const ref=String((event.queryStringParameters||{}).reference||'');
    if(!/^[A-Za-z0-9_-]{6,80}$/.test(ref))return c.json(400,{error:'Bad reference.'});

    const rows=await c.sb('GET','/rest/v1/payments?reference=eq.'+c.enc(ref)+'&select=user_id');
    if(!rows||!rows[0]||rows[0].user_id!==user.id)return c.json(404,{error:'Payment not found.'});

    const res=await c.fulfil(ref);
    return c.json(200,{status:res.state});
  }catch(e){
    console.error('paystack-verify error:',e&&e.message);
    return c.json(500,{error:'Something went wrong. Please try again.'});
  }
};
