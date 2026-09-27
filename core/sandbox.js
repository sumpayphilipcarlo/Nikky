function createSkillSandbox({registry}={}){
 if(!registry)throw new Error("skill registry required");
 function assert(skillId,permission){
  if(!registry.can(skillId,permission)){
   const err=new Error(`skill ${skillId} lacks permission ${permission}`);err.code="PERMISSION_DENIED";throw err;
  }
  return true;
 }
 async function invoke(skillId,permission,fn,args){
  assert(skillId,permission);
  if(typeof fn!=="function")throw new Error("skill operation must be a function");
  return fn(args);
 }
 return {assert,invoke};
}
module.exports={createSkillSandbox};