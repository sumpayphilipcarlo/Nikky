function createCapabilityPermissions(){
 const grants=new Map();
 const key=(subjectId,capability)=>subjectId+"|"+capability;
 function grant({subjectId,capability,mode="approval",expiresAt=null,constraints={}}={}){
  if(!subjectId||!capability)throw new Error("subjectId and capability required");
  const item={subjectId,capability,mode,expiresAt,constraints:{...constraints}};
  grants.set(key(subjectId,capability),item);return {...item};
 }
 function revoke(subjectId,capability){return grants.delete(key(subjectId,capability))}
 function evaluate(subjectId,capability,{now=Date.now(),context={}}={}){
  const g=grants.get(key(subjectId,capability));
  if(!g)return {allowed:false,mode:"deny",reason:"permission not granted"};
  if(g.expiresAt&&new Date(g.expiresAt).getTime()<=now)return {allowed:false,mode:"deny",reason:"permission expired"};
  if(g.constraints.maxAmount!=null&&Number(context.amount||0)>Number(g.constraints.maxAmount))return {allowed:false,mode:"deny",reason:"amount exceeds permission limit"};
  return {allowed:g.mode!=="deny",mode:g.mode,grant:{...g}};
 }
 return {grant,revoke,evaluate,list:()=>[...grants.values()].map(x=>({...x}))};
}
module.exports={createCapabilityPermissions};