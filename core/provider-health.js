function createProviderHealth({failureThreshold=3,cooldownMs=60000,now=()=>Date.now()}={}){
 const states=new Map();
 function state(id){if(!states.has(id))states.set(id,{id,status:"unknown",failures:0,openedAt:null,lastSuccess:null,lastFailure:null});return states.get(id)}
 function success(id){const s=state(id);s.status="healthy";s.failures=0;s.openedAt=null;s.lastSuccess=now();return {...s}}
 function failure(id,error){
  const s=state(id);s.failures++;s.lastFailure=now();s.error=error?.message||String(error||"failure");
  if(s.failures>=failureThreshold){s.status="open";s.openedAt=now()}else s.status="degraded";
  return {...s};
 }
 function canCall(id){
  const s=state(id);
  if(s.status!=="open")return true;
  if(now()-s.openedAt>=cooldownMs){s.status="half-open";return true}
  return false;
 }
 function snapshot(){return [...states.values()].map(s=>({...s}))}
 return {success,failure,canCall,snapshot,state};
}
module.exports={createProviderHealth};