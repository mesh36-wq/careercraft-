'use strict';
const c=require('../lib/common');
exports.handler=async()=>{
  return c.json(200,{configured:c.missing().length===0,test:c.isTest(),liveBlocked:c.liveBlocked()});
};
