(function(root,factory){
 const api=factory(); if(typeof module==="object"&&module.exports) module.exports=api; root.NikkyAuthority=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 const LEVELS={AUTO:"auto",APPROVAL:"approval",DENY:"deny"};
 const DEFAULT_POLICY={"weather.read":LEVELS.AUTO,"routine.read":LEVELS.AUTO,"note.create":LEVELS.AUTO,"calendar.read":LEVELS.AUTO,"calendar.create":LEVELS.APPROVAL,"email.draft":LEVELS.AUTO,"email.send":LEVELS.APPROVAL,"sms.send":LEVELS.APPROVAL,"call.place":LEVELS.APPROVAL,"external.highImpact":LEVELS.DENY};
 function evaluate(action,policy=DEFAULT_POLICY){const type=action&&action.type;const level=policy[type]||LEVELS.APPROVAL;const reason=level===LEVELS.AUTO?"Allowed by low-risk policy":level===LEVELS.DENY?"Blocked by safety policy":"User approval required";return {level,reason,type:type||"unknown"}}
 function auditEntry(action,decision,detail=""){return {id:String(Date.now())+"-"+Math.random().toString(36).slice(2,8),ts:new Date().toISOString(),action:action.type,decision,detail}}
 return {LEVELS,DEFAULT_POLICY,evaluate,auditEntry};
});