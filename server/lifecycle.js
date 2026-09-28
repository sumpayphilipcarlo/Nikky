function installGracefulShutdown({server,closeables=[],timeoutMs=10000,exit=code=>process.exit(code),signals=["SIGTERM","SIGINT"],logger=()=>{}}={}){
 if(!server?.close)throw new Error("server required");
 let stopping=false;
 async function shutdown(signal){
  if(stopping)return;
  stopping=true;logger({event:"shutdown_started",signal});
  const timer=setTimeout(()=>{logger({event:"shutdown_forced",signal});exit(1)},timeoutMs);
  timer.unref?.();
  try{
   await new Promise(resolve=>server.close(()=>resolve()));
   for(const item of closeables){
    if(typeof item==="function")await item();
    else if(item?.close)await item.close();
    else if(item?.end)await item.end();
   }
   clearTimeout(timer);logger({event:"shutdown_complete",signal});exit(0);
  }catch(err){
   clearTimeout(timer);logger({event:"shutdown_failed",signal,error:err?.message||String(err)});exit(1);
  }
 }
 for(const signal of signals)process.on(signal,()=>shutdown(signal));
 return {shutdown,isStopping:()=>stopping};
}
module.exports={installGracefulShutdown};