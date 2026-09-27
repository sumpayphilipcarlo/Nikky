(function(root,factory){
 const api=factory(root.NikkyAuthority);
 if(typeof module==="object"&&module.exports) module.exports=api;
 root.NikkyOrchestrator=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Authority){
 if(!Authority) throw new Error("NikkyAuthority is required");
 function create({approvalQueue=[],auditLog=[],executor=null,policy,now=()=>Date.now(),approvalTtlMs=15*60*1000}={}){
   function record(action,decision,detail){
     const entry=Authority.auditEntry(action,decision,detail);
     auditLog.unshift(entry);
     return entry;
   }
   async function propose(action,options={}){
     const allowedLevels=Object.values(Authority.LEVELS);
     const override=allowedLevels.includes(options.authorityLevel)?options.authorityLevel:null;
     const verdict=override
       ? {level:override,reason:options.reason||"Trusted runtime policy override",type:action?.type||"unknown"}
       : Authority.evaluate(action,policy);
     record(action,verdict.level,verdict.reason);
     if(verdict.level===Authority.LEVELS.DENY){
       return {status:"denied",verdict};
     }
     if(verdict.level===Authority.LEVELS.APPROVAL){
       const item={
         id:String(now())+"-"+Math.random().toString(36).slice(2,8),
         action,
         title:action.title||action.type,
         body:action.summary||verdict.reason,
         createdAt:new Date(now()).toISOString(),
         expiresAt:new Date(now()+approvalTtlMs).toISOString(),
         status:"pending"
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
     const item=approvalQueue[i];
     if(item.status!=="pending") return {status:item.status};
     if(Date.parse(item.expiresAt)<=now()){item.status="expired";record(item.action,"approval_expired","Approval expired before execution");return {status:"expired",item};}
     approvalQueue.splice(i,1);item.status="approved";item.decidedAt=new Date(now()).toISOString();
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
     const item=approvalQueue[i];
     if(item.status!=="pending") return {status:item.status};
     if(Date.parse(item.expiresAt)<=now()){item.status="expired";record(item.action,"approval_expired","Approval expired before rejection");return {status:"expired",item};}
     approvalQueue.splice(i,1);item.status="rejected";item.decidedAt=new Date(now()).toISOString();
     record(item.action,"rejected","User rejected action");
     return {status:"rejected",item};
   }
   return {propose,approve,reject,approvalQueue,auditLog};
 }
 return {create};
});