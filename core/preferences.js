const MODES={QUIET:"quiet",BALANCED:"balanced",COMPANION:"companion",EXECUTIVE:"executive"};
function createPreferenceModel(initial={}){
 const state={mode:MODES.BALANCED,quietHours:{start:"22:00",end:"07:00"},minPriority:50,...initial};
 function set(patch){Object.assign(state,patch);return {...state}}
 function hhmmMinutes(v){const [h,m]=String(v).split(":").map(Number);return h*60+m}
 function inQuietHours(date=new Date()){
  const n=date.getHours()*60+date.getMinutes(),s=hhmmMinutes(state.quietHours.start),e=hhmmMinutes(state.quietHours.end);
  return s<=e?n>=s&&n<e:n>=s||n<e;
 }
 function interruptionPolicy({priority=50,requiresWake=false,now=new Date()}={}){
  if(priority<state.minPriority)return {deliver:false,mode:"suppress"};
  const quiet=inQuietHours(now);
  if(quiet&&priority<95&&!requiresWake)return {deliver:true,mode:"silent"};
  if(priority>=98||requiresWake)return {deliver:true,mode:"wake"};
  if(priority>=85)return {deliver:true,mode:"alert"};
  return {deliver:true,mode:state.mode===MODES.QUIET?"silent":"normal"};
 }
 return {state,set,inQuietHours,interruptionPolicy};
}
module.exports={MODES,createPreferenceModel};