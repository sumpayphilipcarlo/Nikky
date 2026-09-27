(function(root,factory){
 const api=factory(root.NikkyAuthority);
 if(typeof module==="object"&&module.exports) module.exports=api;
 root.NikkyOrchestrator=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Authority){
 if(!Authority) throw new Error("NikkyAuthority is required");
 function create({approvalQueue=[],auditLog=[],executor=null,policy}={}){
   function record(action,decision,detail){
     const entry=Authority.auditEntry(action,decision,detail);
     auditLog.unshift(entry);
     return entry;
   }
   async function propose(action){
     const verdict=Authority.evaluate(action,policy);
     record(action,verdict.level,verdict.reason);
     if(verdict.level===Authority.LEVELS.DENY){
       return {status:"denied",verdict};
     }
     if(verdict.level===Authority.LEVELS.APPROVAL){
       const item={
         id:String(Date.now())+"-"+Math.random().toString(36).slice(2,8),
         action,
         title:action.title||action.type,
         body:action.summary||verdict.reason,
         createdAt:new Date().toISOString()
       };
       approvalQueue.unshift(item);
       return {status:"approval_required",verdict,item};
     }
     if(typeof executor!=="function"){
       return {status:"allowed_no_executor",verdict};
     }
     const result=await executor(action);
     if(result&&result.ok===false){
       record(action,"execution_failed",result.reason||"Executor reported failure");
       return {status:"execution_failed",verdict,result};
     }
     record(action,"executed","Action executed by configured executor");
     return {status:"executed",verdict,result};
   }
   async function approve(id){
     const i=approvalQueue.findIndex(x=>x.id===id);
     if(i<0) return {status:"not_found"};
     const item=approvalQueue.splice(i,1)[0];
     record(item.action,"approved","User approved action");
     if(typeof executor!=="function") return {status:"approved_no_executor",item};
     const result=await executor(item.action);
     if(result&&result.ok===false){
       record(item.action,"execution_failed",result.reason||"Executor reported failure");
       return {status:"execution_failed",item,result};
     }
     record(item.action,"executed","Approved action executed");
     return {status:"executed",item,result};
   }
   function reject(id){
     const i=approvalQueue.findIndex(x=>x.id===id);
     if(i<0) return {status:"not_found"};
     const item=approvalQueue.splice(i,1)[0];
     record(item.action,"rejected","User rejected action");
     return {status:"rejected",item};
   }
   return {propose,approve,reject,approvalQueue,auditLog};
 }
 return {create};
});