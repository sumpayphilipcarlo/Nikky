function createMissionRunner({planner,controller,proposeAction}={}){
 if(!planner)throw new Error("mission planner required");
 async function run(missionId){
  let mission=planner.get(missionId);if(!mission)throw new Error("mission not found");
  if(["completed","cancelled","failed"].includes(mission.state))return mission;
  planner.transition(missionId,"running");
  while((mission=planner.get(missionId)).state==="running"){
   const step=planner.next(missionId);
   if(!step){planner.transition(missionId,"completed");break}
   if(step.requiresUser){planner.transition(missionId,"waiting_user",{waitingFor:step.id});break}
   if(step.waitExternal){planner.transition(missionId,"waiting_external",{waitingFor:step.id});break}
   try{
    let result;
    if(proposeAction){
     result=await proposeAction({type:step.capability,payload:step.payload||{},meta:{useFabric:true,endpointId:step.endpointId},idempotencyKey:step.idempotencyKey||missionId+"-"+step.id});
     if(result?.result?.status==="approval_required"){planner.transition(missionId,"waiting_user",{waitingFor:step.id,approvalId:result.result.item?.id});break}
     if(result?.result?.status==="execution_failed"||result?.result?.status==="denied")throw new Error(result?.result?.status||"action failed");
    }else if(controller){
     result=await controller.execute({capability:step.capability,payload:step.payload||{},preferredEndpointIds:step.endpointId?[step.endpointId]:[]});
     if(!result?.ok)throw new Error(result?.reason||"action failed");
    }else throw new Error("no mission executor configured");
    planner.completeStep(missionId,step.id,result);
   }catch(error){
    planner.failStep(missionId,step.id,error,{retryable:step.retryable!==false});
    if(step.retryable!==false)planner.transition(missionId,"waiting_external",{waitingFor:step.id,lastError:error.message});
    break;
   }
  }
  return planner.get(missionId);
 }
 function resume(missionId){planner.transition(missionId,"running",{waitingFor:null,approvalId:null});return run(missionId)}
 return {run,resume};
}
module.exports={createMissionRunner};