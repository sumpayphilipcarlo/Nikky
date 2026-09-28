function createCapabilityPermissions(){
 const grants=new Map();const key=(subjectId,capability)=>subjectId+"|"+capability;
 function clone(v){return JSON.parse(JSON.stringify(v))}
 function grant({subjectId,capability,mode="approval",expiresAt=null,constraints={}}={}){
  if(!subjectId||!capability)throw new Error("subjectId and capability required");
  if(!["trusted","approval","deny"].includes(mode))throw new Error("invalid permission mode");
  const item={subjectId,capability,mode,expiresAt,constraints:{...constraints}};grants.set(key(subjectId,capability),item);return clone(item);
 }
 function revoke(subjectId,capability){return grants.delete(key(subjectId,capability))}
 function evaluate(subjectId,capability,{now=Date.now(),context={}}={}){
  const g=grants.get(key(subjectId,capability));if(!g)return {allowed:false,mode:"deny",reason:"permission not granted"};
  if(g.expiresAt&&new Date(g.expiresAt).getTime()<=now)return {allowed:false,mode:"deny",reason:"permission expired"};
  if(g.constraints.maxAmount!=null&&Number(context.amount||0)>Number(g.constraints.maxAmount))return {allowed:false,mode:"deny",reason:"amount exceeds permission limit"};
  return {allowed:g.mode!=="deny",mode:g.mode,grant:clone(g)};
 }
 function list(){return [...grants.values()].map(clone)}
 function restore(items=[]){grants.clear();for(const item of items)grant(item);return list()}
 return {grant,revoke,evaluate,list,restore,snapshot:list};
}
module.exports={createCapabilityPermissions};