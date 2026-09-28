function createGoalPlanner({fabric}={}){
 if(!fabric)throw new Error("fabric required");
 function plan({goal,requirements=[],context={}}={}){
  if(!goal)throw new Error("goal required");
  const steps=[],unresolved=[];
  for(const req of requirements){
   const capability=typeof req==="string"?req:req.capability;
   const resolved=fabric.resolve(capability,{trustedOnly:true,ownerId:context.ownerId,preferredIds:req.preferredEndpointIds||[]});
   if(!resolved.ok){unresolved.push({capability,reason:resolved.reason});continue}
   steps.push({
    capability,
    endpointId:resolved.endpoint.id,
    alternatives:resolved.alternatives.map(x=>x.id),
    requiresResultVerification:req.verify!==false,
    payload:req.payload||{}
   });
  }
  return {goal,ok:unresolved.length===0,steps,unresolved};
 }
 return {plan};
}
module.exports={createGoalPlanner};