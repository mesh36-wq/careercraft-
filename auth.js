(function(){
'use strict';
var cfg=window.CC_CONFIG||{};
var configured=!!cfg.SUPABASE_URL&&!!cfg.SUPABASE_ANON_KEY&&!/^YOUR_/.test(cfg.SUPABASE_URL)&&!/^YOUR_/.test(cfg.SUPABASE_ANON_KEY);
var sdk=!!(window.supabase&&typeof window.supabase.createClient==='function');
var client=null;
function getClient(){
  if(!configured||!sdk)return null;
  if(!client){
    client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }
  return client;
}
function message(){
  if(!configured)return 'Accounts are not set up yet. The site owner needs to add the Supabase URL and public key to config.js.';
  if(!sdk)return 'The sign-in service could not be loaded. Check your internet connection and refresh the page.';
  return '';
}
function url(p){return new URL(p,location.href).href;}
function nextUrl(){
  var n=new URLSearchParams(location.search).get('next');
  return ['account.html','cv.html','admin.html','pay.html'].indexOf(n)>-1?n:'account.html';
}
window.CCAuth={ok:configured&&sdk,configured:configured,sdk:sdk,getClient:getClient,message:message,url:url,nextUrl:nextUrl};
})();
