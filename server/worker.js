function createWorker({repository,handlers={},pollMs=60000,now=()=>new Date(),logger=console}={}){
 if(!repository?.listDueJobs)throw new Error("repository required");
 let timer=null,running=false;
 async function runOnce(){
  const due=await repository.listDueJobs(now(),100),results=[];
  for(const job of due){
   const handler=handlers[job.type];
   if(!handler){
    await repository.updateJobResult(job.id,{nextRunAt:new Date(now().getTime()+Math.max(pollMs,job.interval_ms||pollMs)),lastStatus:"failed",lastError:"unknown job type"});
    results.push({id:job.id,ok:false,error:"unknown job type"});continue;
   }
   try{
    const value=await handler(job);
    await repository.updateJobResult(job.id,{nextRunAt:new Date(now().getTime()+Math.max(60000,job.interval_ms||pollMs)),lastStatus:"success",lastError:null});
    results.push({id:job.id,ok:true,value});
   }catch(err){
    await repository.updateJobResult(job.id,{nextRunAt:new Date(now().getTime()+Math.max(60000,job.retry_ms||pollMs)),lastStatus:"failed",lastError:err?.message||String(err)});
    results.push({id:job.id,ok:false,error:err?.message||String(err)});
   }
  }
  return results;
 }
 function start(){
  if(running)return;running=true;
  const loop=async()=>{if(!running)return;try{await runOnce()}catch(e){logger.error?.("worker tick failed",e)}finally{if(running)timer=setTimeout(loop,pollMs)}};
  timer=setTimeout(loop,0);
 }
 function stop(){running=false;if(timer)clearTimeout(timer);timer=null}
 return {runOnce,start,stop,isRunning:()=>running};
}
module.exports={createWorker};