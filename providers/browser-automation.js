function createBrowserAutomationAdapter({driver,allowedOrigins=[]}={}){
 function originOf(url){try{return new URL(url).origin}catch{return null}}
 function allowed(url){const origin=originOf(url);return !!origin&&allowedOrigins.includes(origin)}
 async function run({url,steps=[]}={}){
  if(!driver)return {ok:false,live:false,reason:"browser driver unavailable"};
  if(!allowed(url))return {ok:false,live:false,reason:"origin not authorized"};
  const results=[];
  await driver.open(url);
  for(const step of steps){
   if(!["click","fill","select","check","wait","read","upload"].includes(step?.type))return {ok:false,live:false,reason:"unsupported browser step",results};
   if(step.type==="fill"&&step.sensitive===true)return {ok:false,live:false,reason:"sensitive values require secure browser credential handoff",results};
   const fn=driver[step.type];
   if(typeof fn!=="function")return {ok:false,live:false,reason:"browser driver lacks "+step.type,results};
   results.push(await fn(step));
  }
  return {ok:true,live:true,results};
 }
 return {run,allowed};
}
module.exports={createBrowserAutomationAdapter};