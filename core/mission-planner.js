const STATES={PLANNED:"planned",RUNNING:"running",WAITING_USER:"waiting_user",WAITING_EXTERNAL:"waiting_external",COMPLETED:"completed",FAILED:"failed",CANCELLED:"cancelled"};
function createMissionPlanner({fabric,now=()=>new Date(),idFactory=()=>("mission_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7))}={}){
 const missions=new Map();function clone(v){return JSON.parse(JSON.stringify(v))}
 function create({goal,steps=[],context={}}={}){if(!goal)throw new Error("goal required");const mission={id:idFactory(),goal,state:STATES.PLANNED,context:{...context},steps:steps.map((s,i)=>({id:s.id||"step_"+(i+1),status:"pending",...s})),createdAt:now().toISOString(),updatedAt:now().toISOString()};missions.set(mission.id,mission);return clone(mission)}
 function transition(id,state,patch={}){if(!Object.values(STATES).includes(state))throw new Error("invalid mission state");const m=missions.get(id);if(!m)throw new Error("mission not found");m.state=state;Object.assign(m,patch);m.updatedAt=now().toISOString();return clone(m)}
 function next(id){const m=missions.get(id);if(!m)throw new Error("mission not found");return clone(m.steps.find(s=>s.status==="pending"||s.status==="retry")||null)}
 function completeStep(id,stepId,result){const m=missions.get(id);if(!m)throw new Error("mission not found");const s=m.steps.find(x=>x.id===stepId);if(!s)throw new Error("step not found");s.status="completed";s.result=result;s.completedAt=now().toISOString();if(m.steps.every(x=>x.status==="completed"))m.state=STATES.COMPLETED;m.updatedAt=now().toISOString();return clone(m)}
 function failStep(id,stepId,error,{retryable=true}={}){const m=missions.get(id);if(!m)throw new Error("mission not found");const s=m.steps.find(x=>x.id===stepId);if(!s)throw new Error("step not found");s.status=retryable?"retry":"failed";s.error=error?.message||String(error);s.failedAt=now().toISOString();if(!retryable)m.state=STATES.FAILED;m.updatedAt=now().toISOString();return clone(m)}
 function resolveCapability(capability,context={}){return fabric?.resolve?.(capability,{trustedOnly:true,ownerId:context.ownerId})||{ok:false,reason:"fabric unavailable"}}
 function list(){return [...missions.values()].map(clone)}
 function restore(items=[]){missions.clear();for(const m of items){if(!m?.id||!m?.goal)continue;missions.set(m.id,clone(m))}return list()}
 return {STATES,create,transition,next,completeStep,failStep,resolveCapability,restore,snapshot:list,get:id=>missions.has(id)?clone(missions.get(id)):null,list};
}
module.exports={STATES,createMissionPlanner};