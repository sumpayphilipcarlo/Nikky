function createPresenceModel({now=()=>Date.now(),activeWindowMs=5*60*1000}={}){
 const signals=new Map();
 function update(deviceId,{active=true,locked=false,lastInputAt=now(),foregroundApp=null}={}){
  const s={deviceId,active,locked,lastInputAt,foregroundApp,updatedAt:now()};
  signals.set(deviceId,s);return s;
 }
 function score(deviceId){
  const s=signals.get(deviceId);if(!s)return 0;
  if(s.locked)return 1;
  const age=now()-s.lastInputAt;
  if(s.active&&age<=activeWindowMs)return 10;
  if(age<=activeWindowMs*3)return 5;
  return 2;
 }
 function inactiveEverywhere(){
  if(!signals.size)return true;
  return [...signals.keys()].every(id=>score(id)<=2);
 }
 return {update,score,inactiveEverywhere,snapshot:()=>[...signals.values()]};
}
module.exports={createPresenceModel};