function createPermissionEnforcer({registry}={}){
 if(!registry?.can)throw new Error("skill registry required");
 function requirePermission(skillId,permission){
  const allowed=registry.can(skillId,permission);
  return allowed?{ok:true}:{ok:false,reason:`Skill ${skillId} has not declared permission ${permission}`};
 }
 function assert(skillId,permission){
  const r=requirePermission(skillId,permission);if(!r.ok)throw new Error(r.reason);return true;
 }
 return {requirePermission,assert};
}
module.exports={createPermissionEnforcer};