function defineSkill(manifest,handlers={}){
 if(!manifest?.id||!manifest?.name)throw new Error("skill id and name required");
 if(!Array.isArray(manifest.permissions))throw new Error("skill permissions required");
 const actions={};
 for(const [name,h] of Object.entries(handlers)){
  if(typeof h.handler!=="function"||!h.permission)throw new Error("handler and permission required for "+name);
  if(!manifest.permissions.includes(h.permission))throw new Error("handler permission not declared: "+h.permission);
  actions[name]={...h};
 }
 return Object.freeze({manifest:Object.freeze({...manifest,permissions:[...manifest.permissions]}),actions:Object.freeze(actions)});
}
function createSkillHost({sandbox,health}={}){
 const skills=new Map();
 function install(skill){skills.set(skill.manifest.id,skill);return skill}
 async function invoke(skillId,actionName,args){
  const skill=skills.get(skillId);if(!skill)throw new Error("skill not installed");
  const action=skill.actions[actionName];if(!action)throw new Error("unknown skill action");
  const providerId=skill.manifest.provider||skillId;
  if(health&&!health.canCall(providerId))return {ok:false,reason:"provider circuit is open"};
  try{
   const result=sandbox?await sandbox.invoke(skillId,action.permission,action.handler,args):await action.handler(args);
   if(health)health.success(providerId);
   return result;
  }catch(err){
   if(health)health.failure(providerId,err);
   throw err;
  }
 }
 return {install,invoke,list:()=>[...skills.values()].map(s=>s.manifest),skills};
}
module.exports={defineSkill,createSkillHost};