function createScheduler({now=()=>Date.now()}={}){
 const jobs=new Map();
 function upsert(job){
  if(!job?.id||typeof job.handler!=="function")throw new Error("job id and handler required");
  const existing=jobs.get(job.id)||{};
  const next={enabled:true,intervalMs:60000,nextRunAt:now(),...existing,...job};
  jobs.set(job.id,next);return next;
 }
 function due(at=now()){return [...jobs.values()].filter(j=>j.enabled&&j.nextRunAt<=at).sort((a,b)=>a.nextRunAt-b.nextRunAt)}
 async function tick(at=now()){
  const results=[];
  for(const job of due(at)){
   try{
    const value=await job.handler({job,at});
    job.lastRunAt=at;job.lastStatus="success";job.lastError=null;job.nextRunAt=at+Math.max(60000,job.intervalMs||60000);
    results.push({id:job.id,ok:true,value});
   }catch(err){
    job.lastRunAt=at;job.lastStatus="failed";job.lastError=err?.message||String(err);job.nextRunAt=at+Math.max(60000,job.retryMs||job.intervalMs||60000);
    results.push({id:job.id,ok:false,error:job.lastError});
   }
  }
  return results;
 }
 function disable(id){const j=jobs.get(id);if(!j)return false;j.enabled=false;return true}
 function list(){return [...jobs.values()].map(j=>({...j,handler:undefined}))}
 return {upsert,due,tick,disable,list,jobs};
}
module.exports={createScheduler};