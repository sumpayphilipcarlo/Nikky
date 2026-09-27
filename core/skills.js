function validateManifest(m){
 if(!m||!m.id||!m.name) throw new Error("skill id and name are required");
 if(!Array.isArray(m.permissions)) throw new Error("skill permissions must be an array");
 return true;
}
function createSkillRegistry(initial=[]){
 const map=new Map();
 function register(manifest){validateManifest(manifest);map.set(manifest.id,{...manifest});return map.get(manifest.id)}
 function get(id){return map.get(id)||null}
 function list(){return [...map.values()]}
 function can(id,permission){return !!map.get(id)?.permissions?.includes(permission)}
 function setProviderState(id,state){const m=map.get(id);if(!m)throw new Error("unknown skill");m.providerState={...(m.providerState||{}),...state};return m}
 initial.forEach(register);
 return {register,get,list,can,setProviderState};
}
module.exports={validateManifest,createSkillRegistry};