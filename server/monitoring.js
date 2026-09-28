function createMonitor({sink=entry=>console.log(JSON.stringify(entry)),now=()=>new Date()}={}){
 function emit(level,event,data={}){
  const entry={ts:now().toISOString(),level,event,...data};
  try{sink(entry)}catch{}
  return entry;
 }
 function info(event,data){return emit("info",event,data)}
 function warn(event,data){return emit("warn",event,data)}
 function error(event,err,data={}){
  return emit("error",event,{...data,error:err?.message||String(err||"unknown"),stack:err?.stack||undefined});
 }
 function request({requestId,method,path,status,durationMs,actor}={}){
  return emit(status>=500?"error":status>=400?"warn":"info","http_request",{requestId,method,path,status,durationMs,actor:actor||null});
 }
 return {emit,info,warn,error,request};
}
module.exports={createMonitor};